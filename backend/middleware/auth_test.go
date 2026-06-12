package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tante-emma/tanteemma/models"
)

// injectSession builds a request that already has a session in its context,
// bypassing the cookie/DB lookup. This lets us test NewRequireRole in isolation.
func injectSession(r *http.Request, role models.Role) *http.Request {
	sess := &models.Session{UserID: "u1", Role: role}
	ctx := context.WithValue(r.Context(), sessionCtxKey, sess)
	return r.WithContext(ctx)
}

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
}

func TestNewRequireRole_AllowsExactRole(t *testing.T) {
	tests := []struct {
		minRole  models.Role
		actorRole models.Role
		wantCode  int
	}{
		// child minimum: all roles pass
		{models.RoleChild, models.RoleChild, http.StatusOK},
		{models.RoleChild, models.RoleMember, http.StatusOK},
		{models.RoleChild, models.RoleAdmin, http.StatusOK},
		// member minimum: child is rejected
		{models.RoleMember, models.RoleChild, http.StatusForbidden},
		{models.RoleMember, models.RoleMember, http.StatusOK},
		{models.RoleMember, models.RoleAdmin, http.StatusOK},
		// admin minimum: only admin passes
		{models.RoleAdmin, models.RoleChild, http.StatusForbidden},
		{models.RoleAdmin, models.RoleMember, http.StatusForbidden},
		{models.RoleAdmin, models.RoleAdmin, http.StatusOK},
	}

	for _, tc := range tests {
		mw := NewRequireRole(tc.minRole)
		h := mw(okHandler())
		req := injectSession(httptest.NewRequest(http.MethodGet, "/", nil), tc.actorRole)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != tc.wantCode {
			t.Errorf("min=%s actor=%s: got %d, want %d",
				tc.minRole, tc.actorRole, rec.Code, tc.wantCode)
		}
	}
}

func TestNewRequireRole_NoSessionIsForbidden(t *testing.T) {
	mw := NewRequireRole(models.RoleMember)
	h := mw(okHandler())
	// Request with no session in context.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("got %d for missing session, want 403", rec.Code)
	}
}
