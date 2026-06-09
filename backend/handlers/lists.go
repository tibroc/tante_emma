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

type Lists struct {
	DB *sql.DB
}

// GetAll returns all lists visible to the authenticated user (owned + shared).
func (h *Lists) GetAll(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT DISTINCT l.id, l.name, l.type, l.owner_id, COALESCE(l.icon,''), COALESCE(l.color,''),
		       l.archived, l.created_at, l.updated_at
		  FROM lists l
		  LEFT JOIN list_shares ls ON ls.list_id = l.id AND ls.user_id = ?
		 WHERE (l.owner_id = ? OR ls.user_id = ?) AND l.archived = 0
		 ORDER BY l.updated_at DESC`, sess.UserID, sess.UserID, sess.UserID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	result := make([]models.List, 0)
	for rows.Next() {
		var l models.List
		if err := rows.Scan(&l.ID, &l.Name, &l.Type, &l.OwnerID, &l.Icon, &l.Color,
			&l.Archived, &l.CreatedAt, &l.UpdatedAt); err != nil {
			respondErr(w, http.StatusInternalServerError, "scan error")
			return
		}
		result = append(result, l)
	}
	respond(w, http.StatusOK, result)
}

// Create creates a new list owned by the authenticated user.
func (h *Lists) Create(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	var req struct {
		Name string `json:"name"`
		Type string `json:"type"`
		Icon string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		respondErr(w, http.StatusBadRequest, "name required")
		return
	}
	if req.Type == "" {
		req.Type = "group"
	}

	now := time.Now().UnixMilli()
	id := ulid.Make().String()
	_, err := h.DB.ExecContext(r.Context(), `
		INSERT INTO lists (id, name, type, owner_id, icon, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, req.Name, req.Type, sess.UserID, req.Icon, now, now,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	l := models.List{ID: id, Name: req.Name, Type: models.ListType(req.Type),
		OwnerID: sess.UserID, Icon: req.Icon, CreatedAt: now, UpdatedAt: now}
	respond(w, http.StatusCreated, l)
}

// Get returns a single list with its current items.
func (h *Lists) Get(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")

	if !h.canAccess(r, sess.UserID, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}

	var l models.List
	err := h.DB.QueryRowContext(r.Context(), `
		SELECT id, name, type, owner_id, COALESCE(icon,''), COALESCE(color,''),
		       archived, created_at, updated_at
		  FROM lists WHERE id = ?`, listID,
	).Scan(&l.ID, &l.Name, &l.Type, &l.OwnerID, &l.Icon, &l.Color,
		&l.Archived, &l.CreatedAt, &l.UpdatedAt)
	if err == sql.ErrNoRows {
		respondErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}

	items, err := h.loadItems(r, listID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}

	respond(w, http.StatusOK, map[string]any{"list": l, "items": items})
}

func (h *Lists) Update(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")

	if !h.isOwnerOrAdmin(r, sess, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}

	var req struct {
		Name string `json:"name"`
		Icon string `json:"icon"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}

	now := time.Now().UnixMilli()
	_, err := h.DB.ExecContext(r.Context(),
		`UPDATE lists SET name=?, icon=?, updated_at=? WHERE id=?`,
		req.Name, req.Icon, now, listID,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Lists) Delete(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")

	if !h.isOwnerOrAdmin(r, sess, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	_, _ = h.DB.ExecContext(r.Context(), `DELETE FROM lists WHERE id = ?`, listID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Lists) Share(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")
	if !h.isOwnerOrAdmin(r, sess, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	var req struct {
		UserID     string `json:"user_id"`
		Permission string `json:"permission"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		respondErr(w, http.StatusBadRequest, "user_id required")
		return
	}
	if req.Permission == "" {
		req.Permission = "write"
	}
	now := time.Now().UnixMilli()
	_, err := h.DB.ExecContext(r.Context(), `
		INSERT INTO list_shares (list_id, user_id, permission, created_at)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(list_id, user_id) DO UPDATE SET permission=excluded.permission`,
		listID, req.UserID, req.Permission, now,
	)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Lists) Unshare(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")
	if !h.isOwnerOrAdmin(r, sess, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	uid := chi.URLParam(r, "uid")
	_, _ = h.DB.ExecContext(r.Context(),
		`DELETE FROM list_shares WHERE list_id=? AND user_id=?`, listID, uid)
	w.WriteHeader(http.StatusNoContent)
}

// canAccess returns true if userID owns or has a share on the list.
func (h *Lists) canAccess(r *http.Request, userID, listID string) bool {
	return canAccessList(r.Context(), h.DB, userID, listID)
}

func (h *Lists) isOwnerOrAdmin(r *http.Request, sess *models.Session, listID string) bool {
	if sess.Role == models.RoleAdmin {
		return true
	}
	var ownerID string
	_ = h.DB.QueryRowContext(r.Context(), `SELECT owner_id FROM lists WHERE id=?`, listID).Scan(&ownerID)
	return ownerID == sess.UserID
}

func (h *Lists) loadItems(r *http.Request, listID string) ([]models.ListItem, error) {
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, list_id, product_id, name_override, quantity, unit, note,
		       checked, checked_by, checked_at, added_by, added_at, sort_order, store_id
		  FROM list_items WHERE list_id = ?
		 ORDER BY checked ASC, sort_order ASC, added_at ASC`, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.ListItem, 0)
	for rows.Next() {
		var it models.ListItem
		if err := rows.Scan(&it.ID, &it.ListID, &it.ProductID, &it.NameOverride,
			&it.Quantity, &it.Unit, &it.Note, &it.Checked, &it.CheckedBy, &it.CheckedAt,
			&it.AddedBy, &it.AddedAt, &it.SortOrder, &it.StoreID); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}
