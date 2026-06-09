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

func (h *Users) GetAll(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess.Role != models.RoleAdmin {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, email, name, avatar_url, role, locale, created_at, last_seen FROM users ORDER BY name`)
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
