package handlers

import (
	"context"
	"path/filepath"
	"sync"
	"testing"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/models"
)

func newTestAuth(t *testing.T) *Auth {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	database, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return &Auth{DB: database}
}

func TestUpsertUser_FirstUserBecomesAdmin(t *testing.T) {
	a := newTestAuth(t)
	ctx := context.Background()

	first, err := a.upsertUser(ctx, "sub-1", "a@x.test", "Alice")
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	if first.Role != models.RoleAdmin {
		t.Fatalf("first user role = %q, want admin", first.Role)
	}

	second, err := a.upsertUser(ctx, "sub-2", "b@x.test", "Bob")
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if second.Role != models.RoleMember {
		t.Fatalf("second user role = %q, want member", second.Role)
	}
}

func TestUpsertUser_RepeatLoginKeepsRoleAndID(t *testing.T) {
	a := newTestAuth(t)
	ctx := context.Background()

	first, err := a.upsertUser(ctx, "sub-1", "a@x.test", "Alice")
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	// Add a second user so a naive re-evaluation would yield "member".
	if _, err := a.upsertUser(ctx, "sub-2", "b@x.test", "Bob"); err != nil {
		t.Fatalf("second upsert: %v", err)
	}

	again, err := a.upsertUser(ctx, "sub-1", "alice@x.test", "Alice Updated")
	if err != nil {
		t.Fatalf("repeat upsert: %v", err)
	}
	if again.ID != first.ID {
		t.Fatalf("repeat login changed id: %q -> %q", first.ID, again.ID)
	}
	if again.Role != models.RoleAdmin {
		t.Fatalf("repeat login role = %q, want admin (unchanged)", again.Role)
	}

	// Profile fields should have been refreshed.
	var email, name string
	if err := a.DB.QueryRowContext(ctx,
		`SELECT email, name FROM users WHERE oidc_sub = ?`, "sub-1",
	).Scan(&email, &name); err != nil {
		t.Fatalf("read back: %v", err)
	}
	if email != "alice@x.test" || name != "Alice Updated" {
		t.Fatalf("profile not refreshed: email=%q name=%q", email, name)
	}
}

// TestUpsertUser_ConcurrentFirstLogins ensures exactly one admin is created
// when many brand-new users log in at the same time.
func TestUpsertUser_ConcurrentFirstLogins(t *testing.T) {
	a := newTestAuth(t)
	ctx := context.Background()

	const n = 20
	var wg sync.WaitGroup
	roles := make([]models.Role, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			sub := "concurrent-" + string(rune('a'+i))
			u, err := a.upsertUser(ctx, sub, "", "User")
			if err != nil {
				t.Errorf("upsert %d: %v", i, err)
				return
			}
			roles[i] = u.Role
		}(i)
	}
	wg.Wait()

	admins := 0
	for _, r := range roles {
		if r == models.RoleAdmin {
			admins++
		}
	}
	if admins != 1 {
		t.Fatalf("got %d admins from concurrent first-logins, want exactly 1", admins)
	}
}
