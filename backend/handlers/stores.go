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

type Stores struct {
	DB *sql.DB
}

func (h *Stores) GetAll(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, name, COALESCE(icon,''), COALESCE(color,''), COALESCE(address,''), created_at
		   FROM stores ORDER BY name`)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	stores := make([]models.Store, 0)
	for rows.Next() {
		var s models.Store
		if err := rows.Scan(&s.ID, &s.Name, &s.Icon, &s.Color, &s.Address, &s.CreatedAt); err != nil {
			continue
		}
		stores = append(stores, s)
	}
	respond(w, http.StatusOK, stores)
}

func (h *Stores) Create(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role == models.RoleChild {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	var req models.Store
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		respondErr(w, http.StatusBadRequest, "name required")
		return
	}
	now := time.Now().UnixMilli()
	req.ID = ulid.Make().String()
	req.CreatedAt = now
	_, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO stores (id, name, icon, color, address, created_at) VALUES (?,?,?,?,?,?)`,
		req.ID, req.Name, req.Icon, req.Color, req.Address, now,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	respond(w, http.StatusCreated, req)
}

func (h *Stores) Update(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role == models.RoleChild {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	id := chi.URLParam(r, "id")
	var req models.Store
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}
	_, err := h.DB.ExecContext(r.Context(),
		`UPDATE stores SET name=?, icon=?, color=?, address=? WHERE id=?`,
		req.Name, req.Icon, req.Color, req.Address, id,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Stores) Delete(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	id := chi.URLParam(r, "id")
	_, _ = h.DB.ExecContext(r.Context(), `DELETE FROM stores WHERE id=?`, id)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Stores) GetShelfOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT s.id, s.store_id, s.category_id, s.position, s.auto_learned,
		       c.name_de, c.icon, c.color
		  FROM store_shelf_order s
		  JOIN categories c ON c.id = s.category_id
		 WHERE s.store_id = ?
		 ORDER BY s.position ASC`, id)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	type ShelfRow struct {
		ID          string `json:"id"`
		StoreID     string `json:"store_id"`
		CategoryID  string `json:"category_id"`
		Position    int    `json:"position"`
		AutoLearned bool   `json:"auto_learned"`
		CategoryName string `json:"category_name"`
		Icon        string `json:"icon"`
		Color       string `json:"color"`
	}
	result := make([]ShelfRow, 0)
	for rows.Next() {
		var s ShelfRow
		var autoLearned int
		if err := rows.Scan(&s.ID, &s.StoreID, &s.CategoryID, &s.Position,
			&autoLearned, &s.CategoryName, &s.Icon, &s.Color); err != nil {
			continue
		}
		s.AutoLearned = autoLearned == 1
		result = append(result, s)
	}
	respond(w, http.StatusOK, result)
}

func (h *Stores) UpdateShelfOrder(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	storeID := chi.URLParam(r, "id")

	var req []struct {
		CategoryID string `json:"category_id"`
		Position   int    `json:"position"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}

	now := time.Now().UnixMilli()
	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback() //nolint:errcheck

	for _, row := range req {
		id := ulid.Make().String()
		_, err := tx.ExecContext(r.Context(), `
			INSERT INTO store_shelf_order (id, store_id, category_id, position, auto_learned, updated_at)
			VALUES (?, ?, ?, ?, 0, ?)
			ON CONFLICT(store_id, category_id)
			DO UPDATE SET position=excluded.position, auto_learned=0, updated_at=excluded.updated_at`,
			id, storeID, row.CategoryID, row.Position, now,
		)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "db error")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		respondErr(w, http.StatusInternalServerError, "commit failed")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// keep sql import used
var _ = sql.ErrNoRows
