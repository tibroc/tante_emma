package handlers

import (
	"database/sql"
	"net/http"
)

type Users struct {
	DB *sql.DB
}

func (h *Users) GetAll(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}

func (h *Users) UpdateRole(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
