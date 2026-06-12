package handlers

import (
	"context"
	"testing"
)

func seedStore(t *testing.T, h *Products, id, name string) {
	t.Helper()
	if _, err := h.DB.Exec(`INSERT INTO stores (id, name, created_at) VALUES (?,?,0)`, id, name); err != nil {
		t.Fatalf("insert store %s: %v", id, err)
	}
}

// setProductStores replaces the preferred set; preferredStoreIDs reads it back.
func TestSetAndReadProductStores(t *testing.T) {
	h := newTestProducts(t)
	ctx := context.Background()
	seedCategoryProduct(t, h.DB, "cat-x", "Widget") // inserts product cat-x-p
	seedStore(t, h, "s1", "Rewe")
	seedStore(t, h, "s2", "Lidl")
	seedStore(t, h, "s3", "Aldi")

	if err := h.setProductStores(ctx, "cat-x-p", []string{"s1", "s3"}); err != nil {
		t.Fatalf("setProductStores: %v", err)
	}
	got, err := h.preferredStoreIDs(ctx, "cat-x-p")
	if err != nil {
		t.Fatalf("preferredStoreIDs: %v", err)
	}
	if len(got) != 2 || got[0] != "s1" || got[1] != "s3" {
		t.Fatalf("preferred = %v, want [s1 s3]", got)
	}

	// Replacing must drop the old set entirely, not merge.
	if err := h.setProductStores(ctx, "cat-x-p", []string{"s2"}); err != nil {
		t.Fatalf("setProductStores replace: %v", err)
	}
	got, _ = h.preferredStoreIDs(ctx, "cat-x-p")
	if len(got) != 1 || got[0] != "s2" {
		t.Fatalf("after replace, preferred = %v, want [s2]", got)
	}

	// An invalid store id (FK violation) must fail and leave the set untouched.
	if err := h.setProductStores(ctx, "cat-x-p", []string{"s1", "does-not-exist"}); err == nil {
		t.Fatal("expected error for invalid store_id")
	}
	got, _ = h.preferredStoreIDs(ctx, "cat-x-p")
	if len(got) != 1 || got[0] != "s2" {
		t.Fatalf("after failed set, preferred = %v, want [s2] (rolled back)", got)
	}
}

// assignStoresByCategory marks one store preferred for every product in a
// category and is idempotent.
func TestAssignStoresByCategory(t *testing.T) {
	h := newTestProducts(t)
	ctx := context.Background()
	seedStore(t, h, "s1", "Rewe")

	// Two products in cat-a, one in cat-b.
	if _, err := h.DB.Exec(`INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('cat-a','A','A','A','','')`); err != nil {
		t.Fatal(err)
	}
	if _, err := h.DB.Exec(`INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('cat-b','B','B','B','','')`); err != nil {
		t.Fatal(err)
	}
	for _, p := range []struct{ id, cat string }{{"p1", "cat-a"}, {"p2", "cat-a"}, {"p3", "cat-b"}} {
		if _, err := h.DB.Exec(
			`INSERT INTO products (id, name_de, category_id, source, created_at, updated_at) VALUES (?,?,?,'builtin',0,0)`,
			p.id, p.id, p.cat); err != nil {
			t.Fatal(err)
		}
	}

	n, err := h.assignStoresByCategory(ctx, "cat-a", "s1")
	if err != nil {
		t.Fatalf("assignStoresByCategory: %v", err)
	}
	if n != 2 {
		t.Errorf("assigned = %d, want 2", n)
	}
	// p3 (other category) must be untouched.
	if ids, _ := h.preferredStoreIDs(ctx, "p3"); len(ids) != 0 {
		t.Errorf("p3 preferred = %v, want none", ids)
	}
	if ids, _ := h.preferredStoreIDs(ctx, "p1"); len(ids) != 1 || ids[0] != "s1" {
		t.Errorf("p1 preferred = %v, want [s1]", ids)
	}

	// Re-running is idempotent (no duplicate-key error, still one row each).
	if _, err := h.assignStoresByCategory(ctx, "cat-a", "s1"); err != nil {
		t.Fatalf("idempotent re-run: %v", err)
	}
	if ids, _ := h.preferredStoreIDs(ctx, "p1"); len(ids) != 1 {
		t.Errorf("p1 preferred after re-run = %v, want [s1]", ids)
	}
}
