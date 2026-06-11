package handlers

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/models"
)

func newTestProducts(t *testing.T) *Products {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return &Products{DB: database}
}

func strptr(s string) *string { return &s }

// seedCategoryProduct inserts a category and a product with a deliberately
// unique name so FTS resolution in the test can't collide with the seeded
// catalogue that migrations load.
func seedCategoryProduct(t *testing.T, d *sql.DB, catID, name string) {
	t.Helper()
	if _, err := d.Exec(
		`INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES (?,?,?,?,?,?)`,
		catID, "Test", "Test", "Test", "🧪", "#abc"); err != nil {
		t.Fatalf("insert category: %v", err)
	}
	if _, err := d.Exec(
		`INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		 VALUES (?,?,?,?,?,'builtin',0,0)`,
		catID+"-p", name, name, name, catID); err != nil {
		t.Fatalf("insert product: %v", err)
	}
}

// BUG-4: a looked-up OFF product must be persisted with a stable id, marked as
// openfoodfacts, and (TD-9) given a best-effort category resolved from its name.
func TestPersistOFFProduct_PersistsAndResolvesCategory(t *testing.T) {
	h := newTestProducts(t)
	seedCategoryProduct(t, h.DB, "cat-zztest", "Zzzwidget")

	off := &models.Product{
		NameDe:  strptr("Zzzwidget"),
		NameEn:  strptr("Zzzwidget"),
		Barcode: strptr("4001234567890"),
		OFFID:   strptr("4001234567890"),
	}
	got, err := h.persistOFFProduct(context.Background(), off)
	if err != nil {
		t.Fatalf("persistOFFProduct: %v", err)
	}
	if got.ID == "" {
		t.Error("persisted product has no id")
	}
	if got.Source != models.SourceOpenFoodFacts {
		t.Errorf("source = %q, want openfoodfacts", got.Source)
	}
	if got.CategoryID == nil || *got.CategoryID != "cat-zztest" {
		t.Errorf("category = %v, want cat-zztest (resolved via FTS name match)", got.CategoryID)
	}

	// It must now be served from the DB on the next lookup.
	cached, err := h.productByBarcode(context.Background(), "4001234567890")
	if err != nil || cached == nil {
		t.Fatalf("productByBarcode after persist: %v / %v", cached, err)
	}
	if cached.ID != got.ID {
		t.Errorf("cached id = %q, want %q", cached.ID, got.ID)
	}
}

// A second persist of the same barcode (concurrent-scan race) must not error or
// duplicate — it returns the row the first insert created.
func TestPersistOFFProduct_BarcodeRaceReturnsExisting(t *testing.T) {
	h := newTestProducts(t)

	off := &models.Product{NameDe: strptr("Nocat Item"), Barcode: strptr("999")}
	first, err := h.persistOFFProduct(context.Background(), off)
	if err != nil {
		t.Fatalf("first persist: %v", err)
	}

	second, err := h.persistOFFProduct(context.Background(),
		&models.Product{NameDe: strptr("Nocat Item"), Barcode: strptr("999")})
	if err != nil {
		t.Fatalf("second persist (race) should not error: %v", err)
	}
	if second.ID != first.ID {
		t.Errorf("race persist id = %q, want existing %q", second.ID, first.ID)
	}

	var count int
	if err := h.DB.QueryRow(`SELECT COUNT(*) FROM products WHERE barcode='999'`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("product rows for barcode 999 = %d, want 1 (no duplicate)", count)
	}
}
