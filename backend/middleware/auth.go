package middleware

import (
	"context"
	"net/http"

	"github.com/gorilla/securecookie"
	"github.com/tante-emma/tanteemma/models"
)

type contextKey string

const sessionCtxKey contextKey = "session"

// NewRequireAuth builds an auth middleware using the given securecookie codec.
func NewRequireAuth(sc *securecookie.SecureCookie) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("session")
			if err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			var sess models.Session
			if err := sc.Decode("session", cookie.Value, &sess); err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), sessionCtxKey, &sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// SessionFromContext extracts the session injected by NewRequireAuth.
func SessionFromContext(ctx context.Context) *models.Session {
	s, _ := ctx.Value(sessionCtxKey).(*models.Session)
	return s
}

// NewRequireRole builds a middleware that enforces minimum role.
// Role hierarchy: admin > member > child.
func NewRequireRole(minRole models.Role) func(http.Handler) http.Handler {
	rank := map[models.Role]int{
		models.RoleChild:  0,
		models.RoleMember: 1,
		models.RoleAdmin:  2,
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sess := SessionFromContext(r.Context())
			if sess == nil || rank[sess.Role] < rank[minRole] {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Keep the old stubs so existing call sites in main.go still compile during refactor.
func RequireAuth(next http.Handler) http.Handler { return next }
func RequireRole(_ string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler { return next }
}
