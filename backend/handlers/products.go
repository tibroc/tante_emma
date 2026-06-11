package handlers

import (
	"database/sql"
	"encoding/json"
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
	var p models.Product
	var nameDe, nameEn, namePt, brand, barcode, catID, offID, thumbURL sql.NullString
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, name_de, name_en, name_pt, brand, barcode, category_id,
		       source, off_id, thumbnail_url, created_at, updated_at
		  FROM products WHERE id=?`, id,
	).Scan(&p.ID, &nameDe, &nameEn, &namePt, &brand, &barcode, &catID,
		&p.Source, &offID, &thumbURL, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	nullToPtr := func(ns sql.NullString) *string {
		if ns.Valid {
			return &ns.String
		}
		return nil
	}
	p.NameDe = nullToPtr(nameDe)
	p.NameEn = nullToPtr(nameEn)
	p.NamePt = nullToPtr(namePt)
	p.Brand = nullToPtr(brand)
	p.Barcode = nullToPtr(barcode)
	p.CategoryID = nullToPtr(catID)
	p.OFFID = nullToPtr(offID)
	p.ThumbnailURL = nullToPtr(thumbURL)
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

// GetByBarcode looks up a product by barcode (DB first, then Open Food Facts).
func (h *Products) GetByBarcode(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var p models.Product
	var nameDe, nameEn, namePt, brand, barcode, catID, offID, thumbURL sql.NullString
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, name_de, name_en, name_pt, brand, barcode, category_id,
		       source, off_id, thumbnail_url, created_at, updated_at
		  FROM products WHERE barcode=?`, code,
	).Scan(&p.ID, &nameDe, &nameEn, &namePt, &brand, &barcode, &catID,
		&p.Source, &offID, &thumbURL, &p.CreatedAt, &p.UpdatedAt)

	if err == sql.ErrNoRows {
		// Try Open Food Facts.
		offProduct, err := lookupOFF(r, code)
		if err != nil || offProduct == nil {
			respondErr(w, http.StatusNotFound, "not found")
			return
		}
		respond(w, http.StatusOK, offProduct)
		return
	}
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}

	nullToPtr := func(ns sql.NullString) *string {
		if ns.Valid {
			return &ns.String
		}
		return nil
	}
	p.NameDe = nullToPtr(nameDe)
	p.NameEn = nullToPtr(nameEn)
	p.NamePt = nullToPtr(namePt)
	p.Brand = nullToPtr(brand)
	p.Barcode = nullToPtr(barcode)
	p.CategoryID = nullToPtr(catID)
	p.OFFID = nullToPtr(offID)
	p.ThumbnailURL = nullToPtr(thumbURL)

	respond(w, http.StatusOK, p)
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

// lookupOFF delegates to the openfoodfacts service.
func lookupOFF(r *http.Request, barcode string) (*models.Product, error) {
	return services.LookupBarcode(r.Context(), barcode)
}
