package models

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleChild  Role = "child"
)

type User struct {
	ID        string `json:"id"`
	OIDCSub   string `json:"-"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Role      Role   `json:"role"`
	Locale    string `json:"locale"`
	CreatedAt int64  `json:"created_at"`
	LastSeen  *int64 `json:"last_seen,omitempty"`
}

// AuthMethod identifies how a request authenticated.
type AuthMethod string

const (
	AuthCookie AuthMethod = "cookie" // OIDC session cookie
	AuthToken  AuthMethod = "token"  // Personal Access Token (Bearer)
)

// Scope values for Personal Access Tokens. "write" implies "read".
const (
	ScopeRead  = "read"
	ScopeWrite = "write"
)

type Session struct {
	UserID string
	Role   Role

	// Method records how the request authenticated. Token-authenticated requests
	// carry scope restrictions; cookie sessions are unrestricted (bounded only by
	// the user's role).
	Method AuthMethod
	// Scopes is the granted scope set for token auth (e.g. ["read","write"]).
	// nil/empty for cookie sessions, where HasScope always returns true.
	Scopes []string
	// TokenID is the access_tokens.id when Method == AuthToken; empty otherwise.
	TokenID string
}

// HasScope reports whether the session is permitted the given scope. Cookie
// sessions (Method != AuthToken) are always permitted — their authority is
// bounded by role, not scope. For token sessions, "write" implies "read".
func (s *Session) HasScope(scope string) bool {
	if s.Method != AuthToken {
		return true
	}
	for _, sc := range s.Scopes {
		if sc == scope {
			return true
		}
		if scope == ScopeRead && sc == ScopeWrite {
			return true // write implies read
		}
	}
	return false
}

// AccessToken is a Personal Access Token row. The raw token and its hash are
// never serialised to JSON — only identifying metadata is exposed.
type AccessToken struct {
	ID          string   `json:"id"`
	UserID      string   `json:"-"`
	Name        string   `json:"name"`
	TokenHash   string   `json:"-"`
	TokenPrefix string   `json:"token_prefix"`
	Scopes      []string `json:"scopes"`
	LastUsedAt  *int64   `json:"last_used_at"`
	ExpiresAt   *int64   `json:"expires_at"`
	CreatedAt   int64    `json:"created_at"`
}
