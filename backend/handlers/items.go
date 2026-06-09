package handlers

import (
	"database/sql"
	"net/http"

	"github.com/tante-emma/tanteemma/ws"
)

type Items struct {
	DB  *sql.DB
	Hub *ws.Hub
}

func (h *Items) SubmitEvents(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}

func (h *Items) GetEvents(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
