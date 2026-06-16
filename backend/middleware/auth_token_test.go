package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/models"
	"github.com/tante-emma/tanteemma/tokens"
)

func newAuthTestDB(t *testing.T) *sql.DB {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return database
}

// seedToken inserts a user (if new) and an access token, returning the raw token.
func seedToken(t *testing.T, d *sql.DB, userID, role, scopesJSON string, expiresAt *int64) string {
	t.Helper()
	_, _ = d.Exec(`INSERT OR IGNORE INTO users (id, oidc_sub, name, role, locale, created_at)
		VALUES (?, ?, 'U', ?, 'de', 0)`, userID, "sub-"+userID, role)
	raw, prefix, hash, err := tokens.Generate()
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if _, err := d.Exec(`INSERT INTO access_tokens
		(id, user_id, name, token_hash, token_prefix, scopes, expires_at, created_at)
		VALUES (?, ?, 'tok', ?, ?, ?, ?, 0)`,
		"tk-"+userID, userID, hash, prefix, scopesJSON, expiresAt); err != nil {
		t.Fatalf("insert token: %v", err)
	}
	return raw
}

// captureSession is a terminal handler that records the session the middleware
// attached, then 200s.
func captureSession(got **models.Session) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		*got = SessionFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}
}

func TestRequireAuth_ValidToken(t *testing.T) {
	d := newAuthTestDB(t)
	raw := seedToken(t, d, "u1", "member", `["read","write"]`, nil)

	var got *models.Session
	h := NewRequireAuth(nil, d)(captureSession(&got))

	req := httptest.NewRequest(http.MethodGet, "/api/lists", nil)
	req.Header.Set("Authorization", "Bearer "+raw)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got == nil {
		t.Fatal("no session attached")
	}
	if got.UserID != "u1" || got.Method != models.AuthToken || got.TokenID != "tk-u1" {
		t.Errorf("session = %+v, want token session for u1", got)
	}
	if !got.HasScope(models.ScopeWrite) || !got.HasScope(models.ScopeRead) {
		t.Errorf("write token should have read+write scope, got %v", got.Scopes)
	}
}

func TestRequireAuth_ExpiredToken(t *testing.T) {
	d := newAuthTestDB(t)
	past := time.Now().UnixMilli() - 1000
	raw := seedToken(t, d, "u1", "member", `["read"]`, &past)

	var got *models.Session
	h := NewRequireAuth(nil, d)(captureSession(&got))
	req := httptest.NewRequest(http.MethodGet, "/api/lists", nil)
	req.Header.Set("Authorization", "Bearer "+raw)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expired token: status = %d, want 401", rec.Code)
	}
}

func TestRequireAuth_UnknownToken(t *testing.T) {
	d := newAuthTestDB(t)
	var got *models.Session
	h := NewRequireAuth(nil, d)(captureSession(&got))
	req := httptest.NewRequest(http.MethodGet, "/api/lists", nil)
	req.Header.Set("Authorization", "Bearer tem_doesnotexist000000000000000000")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unknown token: status = %d, want 401", rec.Code)
	}
}

func TestRequireAuth_UpdatesLastUsed(t *testing.T) {
	d := newAuthTestDB(t)
	raw := seedToken(t, d, "u1", "member", `["read"]`, nil)

	var got *models.Session
	h := NewRequireAuth(nil, d)(captureSession(&got))
	req := httptest.NewRequest(http.MethodGet, "/api/lists", nil)
	req.Header.Set("Authorization", "Bearer "+raw)
	h.ServeHTTP(httptest.NewRecorder(), req)

	// last_used_at is written fire-and-forget; poll briefly for it.
	var lastUsed sql.NullInt64
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = d.QueryRow(`SELECT last_used_at FROM access_tokens WHERE id='tk-u1'`).Scan(&lastUsed)
		if lastUsed.Valid {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if !lastUsed.Valid || lastUsed.Int64 == 0 {
		t.Errorf("last_used_at was not updated, got %+v", lastUsed)
	}
}

func TestRequireWriteScope(t *testing.T) {
	wrap := NewRequireWriteScope()
	ok := func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }

	tests := []struct {
		name   string
		method string
		sess   *models.Session
		want   int
	}{
		{"cookie session can write", http.MethodPost, &models.Session{Method: models.AuthCookie}, http.StatusOK},
		{"write token can write", http.MethodPost, &models.Session{Method: models.AuthToken, Scopes: []string{"read", "write"}}, http.StatusOK},
		{"read token blocked on POST", http.MethodPost, &models.Session{Method: models.AuthToken, Scopes: []string{"read"}}, http.StatusForbidden},
		{"read token allowed on GET", http.MethodGet, &models.Session{Method: models.AuthToken, Scopes: []string{"read"}}, http.StatusOK},
		{"read token blocked on DELETE", http.MethodDelete, &models.Session{Method: models.AuthToken, Scopes: []string{"read"}}, http.StatusForbidden},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := wrap(http.HandlerFunc(ok))
			req := httptest.NewRequest(tc.method, "/api/x", nil)
			req = req.WithContext(WithSession(context.Background(), tc.sess))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Errorf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestRequireSessionAuth(t *testing.T) {
	ok := func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }

	cases := []struct {
		name string
		sess *models.Session
		want int
	}{
		{"cookie allowed", &models.Session{Method: models.AuthCookie}, http.StatusOK},
		{"token rejected", &models.Session{Method: models.AuthToken}, http.StatusForbidden},
		{"no session rejected", nil, http.StatusForbidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h := RequireSessionAuth(http.HandlerFunc(ok))
			req := httptest.NewRequest(http.MethodPost, "/api/tokens", nil)
			if tc.sess != nil {
				req = req.WithContext(WithSession(context.Background(), tc.sess))
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tc.want {
				t.Errorf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}
