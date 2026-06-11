package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/oklog/ulid/v2"

	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
	"github.com/tante-emma/tanteemma/services"
)

type Products struct {
	DB *sql.DB
}

// productColumns is the canonical SELECT list for a full product row, matching
// the scan order in scanProduct.
const productColumns = `id, name_de, name_en, name_pt, brand, barcode, category_id,
	source, off_id, thumbnail_url, created_at, updated_at`

// nsPtr converts a NULL-able string column into an optional pointer.
func nsPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// scanProduct scans one product row selected with productColumns.
func scanProduct(row *sql.Row) (*models.Product, error) {
	var p models.Product
	var nameDe, nameEn, namePt, brand, barcode, catID, offID, thumbURL sql.NullString
	if err := row.Scan(&p.ID, &nameDe, &nameEn, &namePt, &brand, &barcode, &catID,
		&p.Source, &offID, &thumbURL, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return nil, err
	}
	p.NameDe = nsPtr(nameDe)
	p.NameEn = nsPtr(nameEn)
	p.NamePt = nsPtr(namePt)
	p.Brand = nsPtr(brand)
	p.Barcode = nsPtr(barcode)
	p.CategoryID = nsPtr(catID)
	p.OFFID = nsPtr(offID)
	p.ThumbnailURL = nsPtr(thumbURL)
	return &p, nil
}

// GetCategories returns all categories for UI dropdowns.
func (h *Products) GetCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, COALESCE(name_de,''), COALESCE(name_en,''),
		        COALESCE(icon,''), COALESCE(color,'')
		   FROM categories ORDER BY name_de`)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	type Category struct {
		ID     string `json:"id"`
		NameDe string `json:"name_de"`
		NameEn string `json:"name_en"`
		Icon   string `json:"icon"`
		Color  string `json:"color"`
	}
	cats := make([]Category, 0)
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.NameDe, &c.NameEn, &c.Icon, &c.Color); err != nil {
			continue
		}
		cats = append(cats, c)
	}
	respond(w, http.StatusOK, cats)
}

// GetByID returns a single product by its ULID.
func (h *Products) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := scanProduct(h.DB.QueryRowContext(r.Context(),
		`SELECT `+productColumns+` FROM products WHERE id=?`, id))
	if err == sql.ErrNoRows {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	respond(w, http.StatusOK, p)
}

// Search runs FTS5 search with suggestion scoring.
func (h *Products) Search(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	q := r.URL.Query().Get("q")
	if q == "" {
		respond(w, http.StatusOK, []models.Suggestion{})
		return
	}
	locale := r.URL.Query().Get("locale")
	listID := r.URL.Query().Get("list_id")
	if locale == "" {
		locale = "de"
	}

	suggestions, err := services.SearchProducts(h.DB, q, locale, listID, sess.UserID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "search error")
		return
	}
	respond(w, http.StatusOK, suggestions)
}

// GetByBarcode looks up a product by barcode: local catalogue first, then Open
// Food Facts. A successful OFF lookup is persisted so the product gets a stable
// id (usable as a list item's product_id), integrates with suggestions, and is
// served from the DB on the next scan instead of re-hitting the network.
func (h *Products) GetByBarcode(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	p, err := h.productByBarcode(r.Context(), code)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if p != nil {
		respond(w, http.StatusOK, p)
		return
	}

	// Cache miss → Open Food Facts.
	off, err := services.LookupBarcode(r.Context(), code)
	if err != nil {
		log.Printf("OFF lookup %s: %v", code, err)
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	if off == nil {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}

	persisted, err := h.persistOFFProduct(r.Context(), off)
	if err != nil {
		// Persisting failed (and it wasn't a recoverable race). Still return the
		// looked-up data so the scan isn't a dead end — it just lacks an id.
		log.Printf("persist OFF product %s: %v", code, err)
		respond(w, http.StatusOK, off)
		return
	}
	respond(w, http.StatusOK, persisted)
}

// productByBarcode returns the catalogue product for a barcode, or (nil, nil)
// when none exists.
func (h *Products) productByBarcode(ctx context.Context, code string) (*models.Product, error) {
	p, err := scanProduct(h.DB.QueryRowContext(ctx,
		`SELECT `+productColumns+` FROM products WHERE barcode=?`, code))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

// persistOFFProduct inserts a product mapped from Open Food Facts, assigning a
// ULID and a best-effort category resolved from the product name. If the insert
// collides on the UNIQUE barcode (a concurrent scan won the race), it returns
// the row the other request created.
func (h *Products) persistOFFProduct(ctx context.Context, p *models.Product) (*models.Product, error) {
	now := time.Now().UnixMilli()
	p.ID = ulid.Make().String()
	p.Source = models.SourceOpenFoodFacts
	p.CreatedAt = now
	p.UpdatedAt = now

	if p.CategoryID == nil {
		name := ""
		switch {
		case p.NameDe != nil:
			name = *p.NameDe
		case p.NameEn != nil:
			name = *p.NameEn
		case p.NamePt != nil:
			name = *p.NamePt
		}
		if name != "" {
			p.CategoryID = services.ResolveCategoryByName(h.DB, name)
		}
	}

	_, err := h.DB.ExecContext(ctx, `
		INSERT INTO products (id, name_de, name_en, name_pt, brand, barcode, category_id,
		                      source, off_id, thumbnail_url, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.NameDe, p.NameEn, p.NamePt, p.Brand, p.Barcode, p.CategoryID,
		p.Source, p.OFFID, p.ThumbnailURL, now, now,
	)
	if err != nil {
		// Likely a concurrent scan inserted the same barcode first; return theirs.
		if p.Barcode != nil {
			if existing, e := h.productByBarcode(ctx, *p.Barcode); e == nil && existing != nil {
				return existing, nil
			}
		}
		return nil, err
	}
	return p, nil
}

func (h *Products) Create(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role == models.RoleChild {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}
	now := time.Now().UnixMilli()
	p.ID = ulid.Make().String()
	p.Source = models.SourceCustom
	p.CreatedBy = &sess.UserID
	p.CreatedAt = now
	p.UpdatedAt = now

	_, err := h.DB.ExecContext(r.Context(), `
		INSERT INTO products (id, name_de, name_en, name_pt, brand, barcode, category_id,
		                      source, created_by, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.NameDe, p.NameEn, p.NamePt, p.Brand, p.Barcode, p.CategoryID,
		p.Source, p.CreatedBy, now, now,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	respond(w, http.StatusCreated, p)
}

func (h *Products) Update(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	id := chi.URLParam(r, "id")
	var p models.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}
	now := time.Now().UnixMilli()
	_, err := h.DB.ExecContext(r.Context(), `
		UPDATE products SET name_de=?, name_en=?, name_pt=?, brand=?, category_id=?, updated_at=?
		 WHERE id=?`,
		p.NameDe, p.NameEn, p.NamePt, p.Brand, p.CategoryID, now, id,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
