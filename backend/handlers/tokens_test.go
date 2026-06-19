package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
	"github.com/tante-emma/tanteemma/tokens"
)

func newTestTokens(t *testing.T) *Tokens {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	_, _ = database.Exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at)
		VALUES ('u1','sub1','U','member','de',0)`)
	return &Tokens{DB: database}
}

func cookieCtx(userID string) context.Context {
	return middleware.WithSession(context.Background(),
		&models.Session{UserID: userID, Role: models.RoleMember, Method: models.AuthCookie})
}

func TestTokens_CreateReturnsRawOnce_AndPersistsHash(t *testing.T) {
	h := newTestTokens(t)

	body := `{"name":"  Claude MCP  ","scopes":["write"]}`
	req := httptest.NewRequest(http.MethodPost, "/api/tokens", strings.NewReader(body)).
		WithContext(cookieCtx("u1"))
	rec := httptest.NewRecorder()
	h.Create(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body=%s)", rec.Code, rec.Body.String())
	}
	var resp struct {
		ID          string   `json:"id"`
		Name        string   `json:"name"`
		TokenPrefix string   `json:"token_prefix"`
		Scopes      []string `json:"scopes"`
		RawToken    string   `json:"raw_token"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Name != "Claude MCP" {
		t.Errorf("name = %q, want trimmed 'Claude MCP'", resp.Name)
	}
	if !strings.HasPrefix(resp.RawToken, tokens.Prefix) {
		t.Errorf("raw_token %q missing prefix", resp.RawToken)
	}
	if resp.TokenPrefix != resp.RawToken[:len(tokens.Prefix)+8] {
		t.Errorf("token_prefix %q does not match raw token", resp.TokenPrefix)
	}
	// write implies read
	if len(resp.Scopes) != 2 {
		t.Errorf("scopes = %v, want [read write]", resp.Scopes)
	}

	// The stored hash must match Hash(raw), and the raw token must NOT be stored.
	var storedHash string
	if err := h.DB.QueryRow(`SELECT token_hash FROM access_tokens WHERE id=?`, resp.ID).Scan(&storedHash); err != nil {
		t.Fatalf("read stored hash: %v", err)
	}
	if storedHash != tokens.Hash(resp.RawToken) {
		t.Errorf("stored hash does not match Hash(raw_token)")
	}
	if storedHash == resp.RawToken {
		t.Errorf("raw token was stored verbatim — must only store the hash")
	}
}

func TestTokens_CreateRejectsBadInput(t *testing.T) {
	h := newTestTokens(t)
	cases := []struct {
		name string
		body string
		want int
	}{
		{"empty name", `{"name":"  ","scopes":["read"]}`, http.StatusUnprocessableEntity},
		{"unknown scope", `{"name":"x","scopes":["admin"]}`, http.StatusUnprocessableEntity},
		{"past expiry", `{"name":"x","scopes":["read"],"expires_at":1}`, http.StatusUnprocessableEntity},
		{"bad json", `{`, http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/tokens", strings.NewReader(tc.body)).
				WithContext(cookieCtx("u1"))
			rec := httptest.NewRecorder()
			h.Create(rec, req)
			if rec.Code != tc.want {
				t.Errorf("status = %d, want %d (body=%s)", rec.Code, tc.want, rec.Body.String())
			}
		})
	}
}

func TestTokens_ListHidesSecrets(t *testing.T) {
	h := newTestTokens(t)
	// create one
	req := httptest.NewRequest(http.MethodPost, "/api/tokens",
		strings.NewReader(`{"name":"t","scopes":["read"]}`)).WithContext(cookieCtx("u1"))
	h.Create(httptest.NewRecorder(), req)

	lreq := httptest.NewRequest(http.MethodGet, "/api/tokens", nil).WithContext(cookieCtx("u1"))
	lrec := httptest.NewRecorder()
	h.List(lrec, lreq)
	if lrec.Code != http.StatusOK {
		t.Fatalf("list status = %d", lrec.Code)
	}
	if b := lrec.Body.String(); strings.Contains(b, "token_hash") || strings.Contains(b, "raw_token") {
		t.Errorf("list response leaked a secret field: %s", b)
	}
	var list []models.AccessToken
	if err := json.Unmarshal(lrec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("len(list) = %d, want 1", len(list))
	}
}

func TestTokens_DeleteScopedToUser(t *testing.T) {
	h := newTestTokens(t)
	// create one for u1
	creq := httptest.NewRequest(http.MethodPost, "/api/tokens",
		bytes.NewBufferString(`{"name":"t","scopes":["read"]}`)).WithContext(cookieCtx("u1"))
	crec := httptest.NewRecorder()
	h.Create(crec, creq)
	var created struct {
		ID string `json:"id"`
	}
	_ = json.Unmarshal(crec.Body.Bytes(), &created)

	// A different user cannot delete it → 404
	otherDel := deleteReq(created.ID, cookieCtx("someone-else"))
	orec := httptest.NewRecorder()
	h.Delete(orec, otherDel)
	if orec.Code != http.StatusNotFound {
		t.Errorf("cross-user delete: status = %d, want 404", orec.Code)
	}

	// The owner can delete it → 204
	ownDel := deleteReq(created.ID, cookieCtx("u1"))
	drec := httptest.NewRecorder()
	h.Delete(drec, ownDel)
	if drec.Code != http.StatusNoContent {
		t.Errorf("owner delete: status = %d, want 204", drec.Code)
	}

	// Deleting again → 404
	again := deleteReq(created.ID, cookieCtx("u1"))
	arec := httptest.NewRecorder()
	h.Delete(arec, again)
	if arec.Code != http.StatusNotFound {
		t.Errorf("repeat delete: status = %d, want 404", arec.Code)
	}
}

// deleteReq builds a DELETE request with the chi {id} URL param populated.
func deleteReq(id string, ctx context.Context) *http.Request {
	req := httptest.NewRequest(http.MethodDelete, "/api/tokens/"+id, nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id)
	req = req.WithContext(context.WithValue(ctx, chi.RouteCtxKey, rctx))
	return req
}
