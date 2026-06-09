package middleware

import (
	"context"
	"database/sql"
	"net/http"

	"github.com/gorilla/securecookie"
	"github.com/tante-emma/tanteemma/models"
)

type contextKey string

const sessionCtxKey contextKey = "session"

// NewRequireAuth builds an auth middleware using the given securecookie codec.
// The signed cookie establishes identity (user_id); the role is read fresh from
// the database on every request so that role changes and account deletion take
// effect immediately rather than being pinned for the cookie's 30-day lifetime.
func NewRequireAuth(sc *securecookie.SecureCookie, db *sql.DB) func(http.Handler) http.Handler {
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

			// Re-read the role from the DB; rejects deleted users too.
			var role models.Role
			if err := db.QueryRowContext(r.Context(),
				`SELECT role FROM users WHERE id = ?`, sess.UserID,
			).Scan(&role); err != nil {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			sess.Role = role

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
