package services

import (
	"database/sql"
	"fmt"

	"github.com/tante-emma/tanteemma/models"
)

// ProcessEvent applies a single event to the list_items materialized view.
// Must be called inside a transaction.
func ProcessEvent(tx *sql.Tx, event models.Event) error {
	switch event.Type {
	case "item.added":
		// TODO: upsert list_items, increment suggestion_weights
	case "item.checked":
		// TODO: update checked fields, insert purchase_history, trigger shelf learning
	case "item.unchecked":
		// TODO: clear checked fields
	case "item.deleted":
		// TODO: delete from list_items
	case "list.cleared":
		// TODO: delete checked items from list_items
	case "item.updated":
		// TODO: update name_override, quantity, unit, note, store_id
	case "list.created", "list.renamed", "list.deleted",
		"list.shared", "list.unshared",
		"store.created", "store.updated",
		"shelf_order.updated", "shelf_order.learned",
		"product.created", "product.updated":
		// handled by their respective handlers
	default:
		return fmt.Errorf("processEvent: unknown event type %q", event.Type)
	}
	return nil
}
