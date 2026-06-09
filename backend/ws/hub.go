package ws

import "sync"

type Client struct {
	ID     string
	UserID string
	Rooms  map[string]struct{} // subscribed list IDs
	Send   chan []byte
}

type BroadcastMsg struct {
	ListID  string
	Payload []byte
	Exclude string // client ID to skip (the sender)
}

type Hub struct {
	rooms      map[string]map[string]*Client // listID → clientID → client
	clients    map[string]*Client            // clientID → client
	mu         sync.RWMutex
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan BroadcastMsg
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]map[string]*Client),
		clients:    make(map[string]*Client),
		Register:   make(chan *Client, 16),
		Unregister: make(chan *Client, 16),
		Broadcast:  make(chan BroadcastMsg, 256),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client.ID] = client
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.ID]; ok {
				for listID := range client.Rooms {
					if room, ok := h.rooms[listID]; ok {
						delete(room, client.ID)
						if len(room) == 0 {
							delete(h.rooms, listID)
						}
					}
				}
				delete(h.clients, client.ID)
				close(client.Send)
			}
			h.mu.Unlock()

		case msg := <-h.Broadcast:
			h.mu.RLock()
			room := h.rooms[msg.ListID]
			h.mu.RUnlock()
			for id, client := range room {
				if id == msg.Exclude {
					continue
				}
				select {
				case client.Send <- msg.Payload:
				default:
					// slow client — drop message, will catch up via REST sync
				}
			}
		}
	}
}

func (h *Hub) Subscribe(client *Client, listID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[listID] == nil {
		h.rooms[listID] = make(map[string]*Client)
	}
	h.rooms[listID][client.ID] = client
	client.Rooms[listID] = struct{}{}
}

func (h *Hub) Unsubscribe(client *Client, listID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[listID]; ok {
		delete(room, client.ID)
		if len(room) == 0 {
			delete(h.rooms, listID)
		}
	}
	delete(client.Rooms, listID)
}
