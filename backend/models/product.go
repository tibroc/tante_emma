package models

type ProductSource string

const (
	SourceBuiltin       ProductSource = "builtin"
	SourceOpenFoodFacts ProductSource = "openfoodfacts"
	SourceCustom        ProductSource = "custom"
)

type Category struct {
	ID        string `json:"id"`
	NameDe    string `json:"name_de"`
	NameEn    string `json:"name_en"`
	NamePt    string `json:"name_pt"`
	Icon      string `json:"icon"`
	Color     string `json:"color"`
	SortOrder int    `json:"sort_order"`
}

type Product struct {
	ID           string        `json:"id"`
	NameDe       *string       `json:"name_de,omitempty"`
	NameEn       *string       `json:"name_en,omitempty"`
	NamePt       *string       `json:"name_pt,omitempty"`
	Brand        *string       `json:"brand,omitempty"`
	Barcode      *string       `json:"barcode,omitempty"`
	CategoryID   *string       `json:"category_id,omitempty"`
	Source       ProductSource `json:"source"`
	OFFID        *string       `json:"off_id,omitempty"`
	ThumbnailURL *string       `json:"thumbnail_url,omitempty"`
	CreatedBy    *string       `json:"created_by,omitempty"`
	CreatedAt    int64         `json:"created_at"`
	UpdatedAt    int64         `json:"updated_at"`
	// PreferredStoreIDs are the admin-assigned preferred stores for this product
	// (product_stores.is_preferred=1). Populated by GetByID for the product editor;
	// nil/omitted elsewhere.
	PreferredStoreIDs []string `json:"preferred_store_ids,omitempty"`
}

type Store struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon,omitempty"`
	Color     string `json:"color,omitempty"`
	Address   string `json:"address,omitempty"`
	CreatedAt int64  `json:"created_at"`
}

type Suggestion struct {
	ProductID      string    `json:"product_id"`
	DisplayName    string    `json:"display_name"`
	Brand          string    `json:"brand,omitempty"`
	Category       *Category `json:"category,omitempty"`
	PreferredStore *Store    `json:"preferred_store,omitempty"`
	Score          float64   `json:"score"`
}
