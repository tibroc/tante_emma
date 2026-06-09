package handlers

import (
	"database/sql"
	"net/http"

	"github.com/tante-emma/tanteemma/ws"
)

type WS struct {
	DB  *sql.DB
	Hub *ws.Hub
}

func (h *WS) ServeWS(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
