package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
)

// listMembers returns the owner (first, flagged) plus shared users, excluding
// users with no relationship to the list.
func TestListMembers(t *testing.T) {
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := database.Exec(q, args...); err != nil {
			t.Fatalf("exec %q: %v", q, err)
		}
	}
	exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('owner','s1','Owner','member','de',0)`)
	exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('shared','s2','Shared','member','de',0)`)
	exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('stranger','s3','Stranger','member','de',0)`)
	exec(`INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('list1','L','group','owner',0,0)`)
	exec(`INSERT INTO list_shares (list_id, user_id, created_at) VALUES ('list1','shared',0)`)

	h := &Lists{DB: database}
	members, err := h.listMembers(context.Background(), "list1")
	if err != nil {
		t.Fatalf("listMembers: %v", err)
	}
	if len(members) != 2 {
		t.Fatalf("got %d members, want 2: %+v", len(members), members)
	}
	if members[0].UserID != "owner" || !members[0].IsOwner {
		t.Errorf("first member = %+v, want owner with IsOwner=true", members[0])
	}
	if members[1].UserID != "shared" || members[1].IsOwner {
		t.Errorf("second member = %+v, want shared with IsOwner=false", members[1])
	}
	for _, m := range members {
		if m.UserID == "stranger" {
			t.Error("stranger must not be a member")
		}
	}
}

// GetMembers is readable by anyone with list access; a stranger gets 403.
func TestGetMembersAccessGating(t *testing.T) {
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := database.Exec(q, args...); err != nil {
			t.Fatalf("exec %q: %v", q, err)
		}
	}
	exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('owner','s1','Owner','member','de',0)`)
	exec(`INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('stranger','s2','Stranger','member','de',0)`)
	exec(`INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('list1','L','group','owner',0,0)`)

	h := &Lists{DB: database}

	call := func(userID string) int {
		req := httptest.NewRequest(http.MethodGet, "/api/lists/list1/members", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "list1")
		ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
		ctx = middleware.WithSession(ctx, &models.Session{UserID: userID, Role: models.RoleMember})
		rec := httptest.NewRecorder()
		h.GetMembers(rec, req.WithContext(ctx))
		return rec.Code
	}

	if code := call("owner"); code != http.StatusOK {
		t.Errorf("owner GetMembers = %d, want 200", code)
	}
	if code := call("stranger"); code != http.StatusForbidden {
		t.Errorf("stranger GetMembers = %d, want 403", code)
	}
}
