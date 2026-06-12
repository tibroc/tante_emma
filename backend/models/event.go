package models

import "encoding/json"

type Event struct {
	ID       string          `json:"id"` // ULID
	Type     string          `json:"type"`
	ListID   *string         `json:"list_id,omitempty"`
	UserID   string          `json:"user_id"`
	Payload  json.RawMessage `json:"payload"`
	ClientTS int64           `json:"client_ts"` // ms
	ServerTS int64           `json:"server_ts"` // ms
}

// Payload shapes for each event type.

type ItemAddedPayload struct {
	ItemID       string   `json:"item_id"`
	ProductID    *string  `json:"product_id,omitempty"`
	NameOverride *string  `json:"name_override,omitempty"`
	CategoryID   *string  `json:"category_id,omitempty"`
	Quantity     *float64 `json:"quantity,omitempty"`
	Unit         *string  `json:"unit,omitempty"`
	Note         *string  `json:"note,omitempty"`
	StoreID      *string  `json:"store_id,omitempty"`
}

type ItemCheckedPayload struct {
	ItemID  string  `json:"item_id"`
	StoreID *string `json:"store_id,omitempty"`
}

type ItemUncheckedPayload struct {
	ItemID string `json:"item_id"`
}

type ItemDeletedPayload struct {
	ItemID string `json:"item_id"`
}

type ItemUpdatedPayload struct {
	ItemID       string   `json:"item_id"`
	NameOverride *string  `json:"name_override,omitempty"`
	Quantity     *float64 `json:"quantity,omitempty"`
	Unit         *string  `json:"unit,omitempty"`
	Note         *string  `json:"note,omitempty"`
	StoreID      *string  `json:"store_id,omitempty"`
}

type ListCreatedPayload struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type ListClearedPayload struct {
	StoreID      *string `json:"store_id,omitempty"`
	SessionStart int64   `json:"session_start,omitempty"`
}
