package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/gorilla/websocket"
	"github.com/oklog/ulid/v2"

	"github.com/tante-emma/tanteemma/models"
	appws "github.com/tante-emma/tanteemma/ws"
)

type WS struct {
	DB             *sql.DB
	Hub            *appws.Hub
	SC             *securecookie.SecureCookie
	AllowedOrigins []string // origins permitted to open a WebSocket (CSWSH protection)
}

// upgrader validates the Origin header against AllowedOrigins. CORS middleware
// does NOT cover WebSocket handshakes, so this is the only origin guard for /ws.
func (h *WS) upgrader() websocket.Upgrader {
	return websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 4096,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return false // non-browser clients must still set Origin
			}
			for _, allowed := range h.AllowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
	}
}

func (h *WS) ServeWS(w http.ResponseWriter, r *http.Request) {
	// Authenticate via session cookie (WebSocket can't use middleware chain easily).
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var sess models.Session
	if err := h.SC.Decode("session", cookie.Value, &sess); err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	up := h.upgrader()
	conn, err := up.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}

	client := &appws.Client{
		ID:     ulid.Make().String(),
		UserID: sess.UserID,
		Rooms:  make(map[string]struct{}),
		Send:   make(chan []byte, 32),
	}
	h.Hub.Register <- client

	// Tell the client its connection id so it can echo it back as X-Conn-ID on
	// event POSTs; the hub then excludes the originating connection from the
	// broadcast (no self-echo). Queued before any broadcast can be enqueued.
	if hello, err := json.Marshal(map[string]string{"type": "hello", "conn_id": client.ID}); err == nil {
		client.Send <- hello
	}

	// Write pump.
	go func() {
		defer conn.Close() //nolint:errcheck
		pingTicker := time.NewTicker(30 * time.Second)
		defer pingTicker.Stop()
		for {
			select {
			case msg, ok := <-client.Send:
				if !ok {
					_ = conn.WriteMessage(websocket.CloseMessage, nil)
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-pingTicker.C:
				ping, _ := json.Marshal(map[string]string{"type": "ping"})
				if err := conn.WriteMessage(websocket.TextMessage, ping); err != nil {
					return
				}
			}
		}
	}()

	// Read pump (also handles client messages).
	defer func() { h.Hub.Unregister <- client }()
	conn.SetReadLimit(4096)
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		var m struct {
			Type   string `json:"type"`
			ListID string `json:"list_id"`
			Active bool   `json:"active"`
		}
		if err := json.Unmarshal(msg, &m); err != nil {
			continue
		}
		switch m.Type {
		case "subscribe":
			// Only allow subscribing to lists the user may access.
			if !canAccessList(r.Context(), h.DB, sess.UserID, m.ListID) {
				continue
			}
			h.Hub.Subscribe(client, m.ListID)
		case "unsubscribe":
			h.Hub.Unsubscribe(client, m.ListID)
		case "pong":
			_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		case "presence":
			// Presence may only be broadcast to lists the user is subscribed to.
			if !h.Hub.IsSubscribed(client, m.ListID) {
				continue
			}
			payload, _ := json.Marshal(map[string]any{
				"type":    "presence",
				"user_id": sess.UserID,
				"list_id": m.ListID,
				"active":  m.Active,
			})
			h.Hub.Broadcast <- appws.BroadcastMsg{
				ListID:  m.ListID,
				Payload: payload,
				Exclude: client.ID,
			}
		}
	}
}
