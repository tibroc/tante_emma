package models

type Role string

const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
	RoleChild  Role = "child"
)

type User struct {
	ID        string  `json:"id"`
	OIDCSub   string  `json:"-"`
	Email     string  `json:"email"`
	Name      string  `json:"name"`
	AvatarURL string  `json:"avatar_url,omitempty"`
	Role      Role    `json:"role"`
	Locale    string  `json:"locale"`
	CreatedAt int64   `json:"created_at"`
	LastSeen  *int64  `json:"last_seen,omitempty"`
}

type Session struct {
	UserID string
	Role   Role
}
