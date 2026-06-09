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
)

type Products struct {
	DB *sql.DB
}

// Search does a simple LIKE query for Phase 1.
// Phase 2 will replace this with FTS5 + scoring.
func (h *Products) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	locale := r.URL.Query().Get("locale")
	listID := r.URL.Query().Get("list_id")
	if locale == "" {
		locale = "de"
	}

	nameCol := "name_de"
	switch locale {
	case "en":
		nameCol = "name_en"
	case "pt", "pt-BR":
		nameCol = "name_pt"
	}

	pattern := "%" + q + "%"
	query := `
		SELECT p.id,
		       COALESCE(p.` + nameCol + `, p.name_de, p.name_en, '') AS display_name,
		       COALESCE(p.brand, ''),
		       COALESCE(p.category_id, ''),
		       COALESCE(c.` + nameCol + `, c.name_de, '') AS cat_name,
		       COALESCE(c.icon, ''), COALESCE(c.color, '')
		  FROM products p
		  LEFT JOIN categories c ON c.id = p.category_id
		 WHERE (p.name_de LIKE ? OR p.name_en LIKE ? OR p.name_pt LIKE ? OR p.brand LIKE ?)`

	args := []any{pattern, pattern, pattern, pattern}

	if listID != "" {
		query += ` AND p.id NOT IN (SELECT product_id FROM list_items WHERE list_id=? AND product_id IS NOT NULL)`
		args = append(args, listID)
	}
	query += ` ORDER BY display_name ASC LIMIT 6`

	rows, err := h.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	suggestions := make([]models.Suggestion, 0)
	for rows.Next() {
		var s models.Suggestion
		var catID, catName, catIcon, catColor string
		if err := rows.Scan(&s.ProductID, &s.DisplayName, &s.Brand,
			&catID, &catName, &catIcon, &catColor); err != nil {
			continue
		}
		if catID != "" {
			s.Category = &models.Category{ID: catID, Icon: catIcon, Color: catColor}
			switch locale {
			case "en":
				s.Category.NameEn = catName
			default:
				s.Category.NameDe = catName
			}
		}
		suggestions = append(suggestions, s)
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
	// Import avoided by calling through the service package.
	// The actual implementation is in services/openfoodfacts.go.
	_ = r
	_ = barcode
	return nil, nil // TODO: wire services.LookupBarcode in Phase 2
}
