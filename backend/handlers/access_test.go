package handlers

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/tante-emma/tanteemma/db"
)

func newAccessDB(t *testing.T) *sql.DB {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return database
}

func execAccess(t *testing.T, d *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := d.Exec(q, args...); err != nil {
		t.Fatalf("exec %q: %v", q, err)
	}
}

func TestCanAccessList(t *testing.T) {
	d := newAccessDB(t)

	execAccess(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('owner','s1','Owner','member','de',0)`)
	execAccess(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('shared','s2','Shared','member','de',0)`)
	execAccess(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('stranger','s3','Stranger','member','de',0)`)
	execAccess(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('list1','L','group','owner',0,0)`)
	execAccess(t, d, `INSERT INTO list_shares (list_id, user_id, created_at) VALUES ('list1','shared',0)`)

	tests := []struct {
		name   string
		userID string
		listID string
		want   bool
	}{
		{"owner can access", "owner", "list1", true},
		{"shared user can access", "shared", "list1", true},
		{"stranger cannot access", "stranger", "list1", false},
		{"nonexistent list returns false", "owner", "no-such-list", false},
		{"nonexistent user returns false", "nobody", "list1", false},
	}

	ctx := context.Background()
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := canAccessList(ctx, d, tc.userID, tc.listID)
			if got != tc.want {
				t.Errorf("canAccessList(%q, %q) = %v, want %v", tc.userID, tc.listID, got, tc.want)
			}
		})
	}
}
