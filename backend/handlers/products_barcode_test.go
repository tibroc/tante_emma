package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

// SEC-4: GetByBarcode must reject a non-numeric / malformed barcode with 400
// before it ever reaches the catalogue lookup or the outbound Open Food Facts
// request. These inputs are rejected without touching the network or DB, so the
// test is hermetic.
func TestGetByBarcode_RejectsInvalid(t *testing.T) {
	h := newTestProducts(t)
	r := chi.NewRouter()
	r.Get("/api/products/barcode/{code}", h.GetByBarcode)

	for _, code := range []string{
		"abc",             // letters
		"12345",           // too short
		"123456789012345", // too long (15)
		"12.34",           // punctuation
		"1234a678",        // embedded letter
	} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/products/barcode/"+code, nil)
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("barcode %q: got %d, want 400", code, rec.Code)
		}
	}
}

// A well-formed barcode with no local match falls through to the OFF lookup; we
// only assert it passes validation (i.e. is NOT a 400), so we don't depend on
// the network for the not-found path.
func TestGetByBarcode_AcceptsWellFormed(t *testing.T) {
	h := newTestProducts(t)
	seedCategoryProduct(t, h.DB, "cat-bc", "Barcoded Thing")
	if _, err := h.DB.Exec(`UPDATE products SET barcode='4006381333931' WHERE id='cat-bc-p'`); err != nil {
		t.Fatalf("set barcode: %v", err)
	}
	r := chi.NewRouter()
	r.Get("/api/products/barcode/{code}", h.GetByBarcode)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/products/barcode/4006381333931", nil)
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("well-formed barcode with local match: got %d, want 200", rec.Code)
	}
}
