package handlers

import (
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
	"github.com/tante-emma/tanteemma/ws"
)

type Items struct {
	DB  *sql.DB
	Hub *ws.Hub
}

// childAllowedEventTypes is the allowlist of event types a child role may submit.
// Children participate in shopping (add items, tick them off) but cannot delete
// items, clear the list, or edit item details. This is the server-side security
// boundary; the UI hides the same actions but must not be relied on.
var childAllowedEventTypes = map[string]bool{
	"item.added":     true,
	"item.checked":   true,
	"item.unchecked": true,
}

// SubmitEvents accepts a batch of events, processes them, and broadcasts.
func (h *Items) SubmitEvents(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")

	if !canAccessList(r.Context(), h.DB, sess.UserID, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}

	// Accept either a single event or { "events": [...] }
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	var events []models.Event
	// Try batch form first.
	var batch struct {
		Events []models.Event `json:"events"`
	}
	if err := json.Unmarshal(raw, &batch); err == nil && len(batch.Events) > 0 {
		events = batch.Events
	} else {
		// Single event.
		var single models.Event
		if err := json.Unmarshal(raw, &single); err != nil {
			respondErr(w, http.StatusBadRequest, "invalid event")
			return
		}
		events = []models.Event{single}
	}

	// Enforce the child role allowlist up front so the whole batch is rejected
	// atomically (nothing is persisted) if it contains a disallowed event type.
	if sess.Role == models.RoleChild {
		for _, ev := range events {
			if !childAllowedEventTypes[ev.Type] {
				respondErr(w, http.StatusForbidden, "forbidden")
				return
			}
		}
	}

	serverNow := time.Now().UnixMilli()
	processed := make([]models.Event, 0, len(events))

	tx, err := h.DB.BeginTx(r.Context(), nil)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback() //nolint:errcheck

	for _, ev := range events {
		// Assign server fields.
		if ev.ID == "" {
			ev.ID = ulid.Make().String()
		}
		ev.ListID = &listID
		ev.UserID = sess.UserID
		ev.ServerTS = serverNow

		// Validate ULID is not more than 5 minutes in the future.
		if ev.ClientTS > serverNow+5*60*1000 {
			respondErr(w, http.StatusBadRequest, "client_ts too far in future")
			return
		}

		// Persist event.
		payloadBytes, _ := json.Marshal(ev.Payload)
		res, err := tx.ExecContext(r.Context(), `
			INSERT OR IGNORE INTO events (id, type, list_id, user_id, payload, client_ts, server_ts)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			ev.ID, ev.Type, listID, sess.UserID, string(payloadBytes), ev.ClientTS, ev.ServerTS,
		)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "db error")
			return
		}

		// Idempotency: if this event id already existed (0 rows inserted), it has
		// already been applied to the materialized view. Re-running ProcessEvent
		// would double-insert (e.g. UNIQUE constraint on list_items.id), so skip
		// it. This makes re-submitting a drained offline event a safe no-op.
		if n, _ := res.RowsAffected(); n == 0 {
			continue
		}

		if err := services.ProcessEvent(tx, &ev); err != nil {
			log.Printf("processEvent %s %s: %v", ev.Type, ev.ID, err)
			respondErr(w, http.StatusUnprocessableEntity, "event processing failed")
			return
		}
		processed = append(processed, ev)
	}

	// Update list.updated_at.
	if _, err := tx.ExecContext(r.Context(),
		`UPDATE lists SET updated_at=? WHERE id=?`, serverNow, listID); err != nil {
		log.Printf("update list updated_at %s: %v", listID, err)
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}

	if err := tx.Commit(); err != nil {
		respondErr(w, http.StatusInternalServerError, "commit failed")
		return
	}

	// Broadcast each processed event to other subscribers.
	connID := r.Header.Get("X-Conn-ID")
	for _, ev := range processed {
		payload, _ := json.Marshal(map[string]any{"type": "event", "event": ev})
		h.Hub.Broadcast <- ws.BroadcastMsg{
			ListID:  listID,
			Payload: payload,
			Exclude: connID,
		}
	}

	respond(w, http.StatusOK, map[string]any{"events": processed})
}

// GetEvents returns events for a list since a given ULID cursor (for offline sync).
func (h *Items) GetEvents(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	listID := chi.URLParam(r, "id")

	if !canAccessList(r.Context(), h.DB, sess.UserID, listID) {
		respondErr(w, http.StatusForbidden, "forbidden")
		return
	}

	since := r.URL.Query().Get("since")
	var rows *sql.Rows
	var err error
	if since == "" {
		rows, err = h.DB.QueryContext(r.Context(), `
			SELECT id, type, list_id, user_id, payload, client_ts, server_ts
			  FROM events WHERE list_id=? ORDER BY id ASC`, listID)
	} else {
		rows, err = h.DB.QueryContext(r.Context(), `
			SELECT id, type, list_id, user_id, payload, client_ts, server_ts
			  FROM events WHERE list_id=? AND id > ? ORDER BY id ASC`, listID, since)
	}
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		var ev models.Event
		var payloadStr string
		var listIDStr string
		if err := rows.Scan(&ev.ID, &ev.Type, &listIDStr, &ev.UserID,
			&payloadStr, &ev.ClientTS, &ev.ServerTS); err != nil {
			respondErr(w, http.StatusInternalServerError, "scan error")
			return
		}
		ev.ListID = &listIDStr
		ev.Payload = json.RawMessage(payloadStr)
		events = append(events, ev)
	}
	respond(w, http.StatusOK, map[string]any{"events": events})
}
