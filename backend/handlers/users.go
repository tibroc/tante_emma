package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
)

type Users struct {
	DB *sql.DB
}

// GetMembers returns a minimal user list (id, name, avatar) for all authenticated
// users so they can pick whom to share a list with.
func (h *Users) GetMembers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, name, COALESCE(avatar_url,'') FROM users ORDER BY name`)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	type Member struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url,omitempty"`
	}
	members := make([]Member, 0)
	for rows.Next() {
		var m Member
		if err := rows.Scan(&m.ID, &m.Name, &m.AvatarURL); err != nil {
			continue
		}
		members = append(members, m)
	}
	respond(w, http.StatusOK, members)
}

func (h *Users) GetAll(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, COALESCE(email,''), name, COALESCE(avatar_url,''), role, locale, created_at, last_seen FROM users ORDER BY name`)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL,
			&u.Role, &u.Locale, &u.CreatedAt, &u.LastSeen); err != nil {
			continue
		}
		users = append(users, u)
	}
	respond(w, http.StatusOK, users)
}

func (h *Users) UpdateRole(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	uid := chi.URLParam(r, "id")
	var req struct {
		Role models.Role `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "bad request")
		return
	}
	if req.Role != models.RoleAdmin && req.Role != models.RoleMember && req.Role != models.RoleChild {
		respondErr(w, http.StatusBadRequest, "invalid role")
		return
	}
	_, err := h.DB.ExecContext(r.Context(), `UPDATE users SET role=? WHERE id=?`, req.Role, uid)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
