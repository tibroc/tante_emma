package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/tante-emma/tanteemma/models"
	"github.com/tante-emma/tanteemma/tokens"
)

type contextKey string

const sessionCtxKey contextKey = "session"

// NewRequireAuth builds an auth middleware using the given securecookie codec.
//
// Two authentication methods coexist on the same routes:
//   - Personal Access Token: an `Authorization: Bearer tem_...` header. The token
//     is hashed and looked up; expiry is enforced; scopes are attached. Tried first.
//   - OIDC session cookie: the signed `session` cookie, used when no Bearer header
//     is present.
//
// In both cases the role is read fresh from the database on every request so that
// role changes and account deletion take effect immediately rather than being
// pinned for a credential's lifetime. A token's authority is always additionally
// bounded by the underlying user's role.
func NewRequireAuth(sc *securecookie.SecureCookie, db *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if raw, ok := tokens.ParseBearer(r.Header.Get("Authorization")); ok {
				sess, ok := authenticateToken(r.Context(), db, raw)
				if !ok {
					http.Error(w, "unauthorized", http.StatusUnauthorized)
					return
				}
				ctx := context.WithValue(r.Context(), sessionCtxKey, sess)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

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
			sess.Method = models.AuthCookie

			ctx := context.WithValue(r.Context(), sessionCtxKey, &sess)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// authenticateToken validates a raw Bearer token and builds a token-backed
// session. Returns ok=false for any unknown, expired, or orphaned token.
func authenticateToken(ctx context.Context, db *sql.DB, raw string) (*models.Session, bool) {
	hash := tokens.Hash(raw)

	var (
		tokenID   string
		userID    string
		scopesRaw string
		expiresAt sql.NullInt64
		role      models.Role
	)
	err := db.QueryRowContext(ctx, `
		SELECT t.id, t.user_id, t.scopes, t.expires_at, u.role
		  FROM access_tokens t
		  JOIN users u ON u.id = t.user_id
		 WHERE t.token_hash = ?`, hash,
	).Scan(&tokenID, &userID, &scopesRaw, &expiresAt, &role)
	if err != nil {
		return nil, false
	}

	if expiresAt.Valid && time.Now().UnixMilli() > expiresAt.Int64 {
		return nil, false
	}

	var scopes []string
	if err := json.Unmarshal([]byte(scopesRaw), &scopes); err != nil {
		return nil, false
	}

	// Update last_used_at fire-and-forget: never block the request on this write,
	// and use a background context so it survives the request returning.
	go func(id string) {
		_, _ = db.ExecContext(context.Background(),
			`UPDATE access_tokens SET last_used_at = ? WHERE id = ?`,
			time.Now().UnixMilli(), id)
	}(tokenID)

	return &models.Session{
		UserID:  userID,
		Role:    role,
		Method:  models.AuthToken,
		Scopes:  scopes,
		TokenID: tokenID,
	}, true
}

// NewRequireWriteScope rejects mutating requests (anything other than read-only
// HTTP methods) made with a token that lacks the "write" scope. Cookie sessions
// and write-scoped tokens pass through; read-only tokens may still perform GETs.
func NewRequireWriteScope() func(http.Handler) http.Handler {
	readOnly := map[string]bool{
		http.MethodGet:     true,
		http.MethodHead:    true,
		http.MethodOptions: true,
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !readOnly[r.Method] {
				sess := SessionFromContext(r.Context())
				if sess == nil || !sess.HasScope(models.ScopeWrite) {
					respondJSONError(w, http.StatusForbidden, "token is read-only; write scope required")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireSessionAuth rejects token-authenticated requests, restricting a route to
// the OIDC session cookie. Used for token management: a token can never be used to
// create or revoke other tokens.
func RequireSessionAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sess := SessionFromContext(r.Context())
		if sess == nil || sess.Method == models.AuthToken {
			respondJSONError(w, http.StatusForbidden, "this endpoint requires an interactive session")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// respondJSONError writes a {"error":"..."} body matching the handlers' error
// shape, so middleware rejections are indistinguishable from handler rejections
// to the client.
func respondJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// SessionFromContext extracts the session injected by NewRequireAuth.
func SessionFromContext(ctx context.Context) *models.Session {
	s, _ := ctx.Value(sessionCtxKey).(*models.Session)
	return s
}

// WithSession returns a context carrying the given session, as NewRequireAuth
// would. Lets handlers be exercised in tests without the full auth middleware.
func WithSession(ctx context.Context, sess *models.Session) context.Context {
	return context.WithValue(ctx, sessionCtxKey, sess)
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
