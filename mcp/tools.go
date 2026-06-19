package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// buildTools returns the complete set of MCP tools exposed to the LLM.
func buildTools(c *apiClient) []*mcpTool {
	return []*mcpTool{
		{
			Name:        "list_shopping_lists",
			Description: "Returns all shopping lists visible to the user (owned and shared), with the total number of items and how many have been checked off.",
			InputSchema: map[string]any{
				"type":       "object",
				"properties": map[string]any{},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolListShoppingLists(ctx, c)
			},
		},
		{
			Name:        "get_shopping_list",
			Description: "Returns the full contents of a shopping list: every item with its name, quantity, unit, note, category, and whether it has been checked off.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"list_id": map[string]any{
						"type":        "string",
						"description": "The ID of the list to fetch.",
					},
				},
				"required": []string{"list_id"},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolGetShoppingList(ctx, c, args)
			},
		},
		{
			Name: "add_item",
			Description: "Adds an item to a shopping list. " +
				"Automatically matches item_name against the product catalogue; uses the top result when found, otherwise creates a free-text entry. " +
				"Use search_products first if you are unsure about the match.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"list_id": map[string]any{
						"type":        "string",
						"description": "ID of the list to add to.",
					},
					"item_name": map[string]any{
						"type":        "string",
						"description": "Name of the item (e.g. 'milk', 'Karotten', 'organic eggs').",
					},
					"quantity": map[string]any{
						"type":        "number",
						"description": "Optional quantity (e.g. 2, 0.5).",
					},
					"unit": map[string]any{
						"type":        "string",
						"description": "Optional unit: 'kg', 'g', 'ml', 'l', 'Stk.' (pieces), 'Pkg.' (package).",
					},
					"note": map[string]any{
						"type":        "string",
						"description": "Optional free-text note (e.g. 'bio wenn möglich', 'the large one').",
					},
				},
				"required": []string{"list_id", "item_name"},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolAddItem(ctx, c, args)
			},
		},
		{
			Name: "check_item",
			Description: "Marks an item as purchased (checked off). " +
				"Provide item_id for precision, or item_name for a case-insensitive lookup within the list.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"list_id": map[string]any{
						"type":        "string",
						"description": "ID of the list.",
					},
					"item_id": map[string]any{
						"type":        "string",
						"description": "Exact item ID (preferred when known).",
					},
					"item_name": map[string]any{
						"type":        "string",
						"description": "Item name for lookup when item_id is not known.",
					},
				},
				"required": []string{"list_id"},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolToggleItem(ctx, c, args, "item.checked")
			},
		},
		{
			Name: "uncheck_item",
			Description: "Marks a checked-off item as not purchased — adds it back to the active shopping list. " +
				"Provide item_id for precision, or item_name for lookup.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"list_id": map[string]any{
						"type":        "string",
						"description": "ID of the list.",
					},
					"item_id": map[string]any{
						"type":        "string",
						"description": "Exact item ID (preferred when known).",
					},
					"item_name": map[string]any{
						"type":        "string",
						"description": "Item name for lookup when item_id is not known.",
					},
				},
				"required": []string{"list_id"},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolToggleItem(ctx, c, args, "item.unchecked")
			},
		},
		{
			Name:        "search_products",
			Description: "Searches the product catalogue by name. Useful to preview what add_item will resolve a name to, or to look up product IDs for subsequent operations.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Search term.",
					},
					"locale": map[string]any{
						"type":        "string",
						"description": "Preferred result language: 'de' (default), 'en', or 'pt-BR'.",
					},
				},
				"required": []string{"query"},
			},
			Handler: func(ctx context.Context, args map[string]any) (string, error) {
				return toolSearchProducts(ctx, c, args)
			},
		},
	}
}

// --- handlers ---

func toolListShoppingLists(ctx context.Context, c *apiClient) (string, error) {
	lists, err := c.getLists(ctx)
	if err != nil {
		return "", fmt.Errorf("fetch lists: %w", err)
	}

	type outList struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Color        string `json:"color,omitempty"`
		ItemCount    int    `json:"item_count"`
		CheckedCount int    `json:"checked_count"`
		IsFavorite   bool   `json:"is_favorite"`
	}

	out := make([]outList, len(lists))
	for i, l := range lists {
		out[i] = outList{ID: l.ID, Name: l.Name, Color: l.Color, IsFavorite: l.IsFavorite}
		// Fetch detail for item counts. N is always small (family has 2–5 lists).
		detail, err := c.getList(ctx, l.ID)
		if err == nil {
			for _, item := range detail.Items {
				out[i].ItemCount++
				if item.Checked {
					out[i].CheckedCount++
				}
			}
		}
	}
	return prettyJSON(out)
}

func toolGetShoppingList(ctx context.Context, c *apiClient, args map[string]any) (string, error) {
	listID := argStr(args, "list_id")
	if listID == "" {
		return "", fmt.Errorf("list_id is required")
	}

	detail, err := c.getList(ctx, listID)
	if err != nil {
		return "", fmt.Errorf("fetch list: %w", err)
	}

	type outItem struct {
		ID       string   `json:"id"`
		Name     string   `json:"name"`
		Quantity *float64 `json:"quantity,omitempty"`
		Unit     *string  `json:"unit,omitempty"`
		Note     *string  `json:"note,omitempty"`
		Checked  bool     `json:"checked"`
		Category string   `json:"category,omitempty"`
	}
	type outDetail struct {
		ID    string    `json:"id"`
		Name  string    `json:"name"`
		Items []outItem `json:"items"`
	}

	items := make([]outItem, len(detail.Items))
	for i, it := range detail.Items {
		cat := derefStr(it.CategoryIcon) // emoji, e.g. "🥦"
		items[i] = outItem{
			ID:       it.ID,
			Name:     it.DisplayName,
			Quantity: it.Quantity,
			Unit:     it.Unit,
			Note:     it.Note,
			Checked:  it.Checked,
			Category: cat,
		}
	}
	return prettyJSON(outDetail{ID: detail.List.ID, Name: detail.List.Name, Items: items})
}

func toolAddItem(ctx context.Context, c *apiClient, args map[string]any) (string, error) {
	listID := argStr(args, "list_id")
	itemName := argStr(args, "item_name")
	if listID == "" || itemName == "" {
		return "", fmt.Errorf("list_id and item_name are required")
	}

	qty := argFloatPtr(args, "quantity")
	unit := argStrPtr(args, "unit")
	note := argStrPtr(args, "note")

	// Resolve item_name to a catalogue product. Omit list_id so the search
	// finds the product even if it is already on the list (the LLM explicitly
	// asked to add it; we don't second-guess that).
	var productID *string
	resolvedName := itemName
	suggestions, err := c.searchProducts(ctx, itemName, "de")
	if err == nil && len(suggestions) > 0 {
		top := suggestions[0]
		productID = &top.ProductID
		resolvedName = top.DisplayName
	}

	itemID := newItemID()
	payload := map[string]any{
		"item_id":  itemID,
		"quantity": qty,
		"unit":     unit,
		"note":     note,
	}
	if productID != nil {
		payload["product_id"] = *productID
	} else {
		payload["name_override"] = itemName
	}

	event := map[string]any{
		"type":      "item.added",
		"client_ts": time.Now().UnixMilli(),
		"payload":   payload,
	}
	if _, err := c.submitEvent(ctx, listID, event); err != nil {
		return "", fmt.Errorf("submit event: %w", err)
	}

	return prettyJSON(map[string]any{
		"added":        true,
		"item_id":      itemID,
		"display_name": resolvedName,
		"product_id":   productID,
		"list_id":      listID,
	})
}

func toolToggleItem(ctx context.Context, c *apiClient, args map[string]any, eventType string) (string, error) {
	listID := argStr(args, "list_id")
	if listID == "" {
		return "", fmt.Errorf("list_id is required")
	}

	itemID := argStr(args, "item_id")
	itemName := argStr(args, "item_name")
	resolvedName := itemName

	if itemID == "" {
		if itemName == "" {
			return "", fmt.Errorf("either item_id or item_name is required")
		}
		// Look up by name (case-insensitive substring match).
		detail, err := c.getList(ctx, listID)
		if err != nil {
			return "", fmt.Errorf("fetch list for name lookup: %w", err)
		}
		needle := strings.ToLower(itemName)
		var matches []apiListItem
		for _, it := range detail.Items {
			if strings.Contains(strings.ToLower(it.DisplayName), needle) {
				matches = append(matches, it)
			}
		}
		switch len(matches) {
		case 0:
			return "", fmt.Errorf("no item found matching %q in this list", itemName)
		case 1:
			itemID = matches[0].ID
			resolvedName = matches[0].DisplayName
		default:
			names := make([]string, len(matches))
			for i, m := range matches {
				names[i] = fmt.Sprintf("%q (id: %s)", m.DisplayName, m.ID)
			}
			return "", fmt.Errorf("ambiguous: %d items match %q — use item_id: %s",
				len(matches), itemName, strings.Join(names, "; "))
		}
	}

	payload := map[string]any{"item_id": itemID}
	event := map[string]any{
		"type":      eventType,
		"client_ts": time.Now().UnixMilli(),
		"payload":   payload,
	}
	if _, err := c.submitEvent(ctx, listID, event); err != nil {
		return "", fmt.Errorf("submit event: %w", err)
	}

	action := "checked off"
	if eventType == "item.unchecked" {
		action = "unchecked"
	}
	return prettyJSON(map[string]any{
		"success":   true,
		"item_id":   itemID,
		"item_name": resolvedName,
		"action":    action,
	})
}

func toolSearchProducts(ctx context.Context, c *apiClient, args map[string]any) (string, error) {
	q := argStr(args, "query")
	if q == "" {
		return "", fmt.Errorf("query is required")
	}
	locale := argStr(args, "locale")
	if locale == "" {
		locale = "de"
	}

	suggestions, err := c.searchProducts(ctx, q, locale)
	if err != nil {
		return "", fmt.Errorf("search: %w", err)
	}

	type outItem struct {
		ProductID string  `json:"product_id"`
		Name      string  `json:"name"`
		Brand     string  `json:"brand,omitempty"`
		Category  string  `json:"category,omitempty"`
		Score     float64 `json:"score"`
	}
	out := make([]outItem, len(suggestions))
	for i, s := range suggestions {
		cat := ""
		if s.Category != nil {
			cat = s.Category.NameDe
			if cat == "" {
				cat = s.Category.NameEn
			}
		}
		out[i] = outItem{
			ProductID: s.ProductID,
			Name:      s.DisplayName,
			Brand:     s.Brand,
			Category:  cat,
			Score:     s.Score,
		}
	}
	if len(out) == 0 {
		return `[]`, nil
	}
	return prettyJSON(out)
}

// --- helpers ---

func argStr(args map[string]any, key string) string {
	v, _ := args[key].(string)
	return v
}

func argStrPtr(args map[string]any, key string) *string {
	s, ok := args[key].(string)
	if !ok || s == "" {
		return nil
	}
	return &s
}

func argFloatPtr(args map[string]any, key string) *float64 {
	v, ok := args[key]
	if !ok || v == nil {
		return nil
	}
	f, ok := v.(float64)
	if !ok {
		return nil
	}
	return &f
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func prettyJSON(v any) (string, error) {
	b, err := json.MarshalIndent(v, "", "  ")
	return string(b), err
}

// newItemID generates a unique item ID: Unix-ms timestamp + 12 random bytes
// encoded as hex. Not a proper ULID, but unique, time-ordered, and accepted
// by the backend's list_items table (TEXT PRIMARY KEY).
func newItemID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%d%s", time.Now().UnixMilli(), hex.EncodeToString(b[:]))
}
