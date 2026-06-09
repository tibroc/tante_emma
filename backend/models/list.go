package models

type ListType string

const (
	ListTypeGroup   ListType = "group"
	ListTypePrivate ListType = "private"
)

type List struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Type      ListType `json:"type"`
	OwnerID   string   `json:"owner_id"`
	Icon      string   `json:"icon,omitempty"`
	Color     string   `json:"color,omitempty"`
	Archived  bool     `json:"archived"`
	CreatedAt int64    `json:"created_at"`
	UpdatedAt int64    `json:"updated_at"`
}

type ListShare struct {
	ListID     string `json:"list_id"`
	UserID     string `json:"user_id"`
	Permission string `json:"permission"` // read|write
	CreatedAt  int64  `json:"created_at"`
}

type ListItem struct {
	ID           string  `json:"id"`
	ListID       string  `json:"list_id"`
	ProductID    *string `json:"product_id,omitempty"`
	NameOverride *string `json:"name_override,omitempty"`
	Quantity     *float64 `json:"quantity,omitempty"`
	Unit         *string `json:"unit,omitempty"`
	Note         *string `json:"note,omitempty"`
	Checked      bool    `json:"checked"`
	CheckedBy    *string `json:"checked_by,omitempty"`
	CheckedAt    *int64  `json:"checked_at,omitempty"`
	AddedBy      string  `json:"added_by"`
	AddedAt      int64   `json:"added_at"`
	SortOrder    int     `json:"sort_order"`
	StoreID      *string `json:"store_id,omitempty"`
}
