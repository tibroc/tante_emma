package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/tante-emma/tanteemma/models"
)

// ProcessEvent applies a single event to the list_items materialized view.
// Must be called inside a transaction.
func ProcessEvent(tx *sql.Tx, event models.Event) error {
	switch event.Type {
	case "item.added":
		return processItemAdded(tx, event)
	case "item.checked":
		return processItemChecked(tx, event)
	case "item.unchecked":
		return processItemUnchecked(tx, event)
	case "item.deleted":
		return processItemDeleted(tx, event)
	case "list.cleared":
		return processListCleared(tx, event)
	case "item.updated":
		return processItemUpdated(tx, event)
	case "list.created", "list.renamed", "list.deleted",
		"list.shared", "list.unshared",
		"store.created", "store.updated",
		"shelf_order.updated", "shelf_order.learned",
		"product.created", "product.updated":
		return nil
	default:
		return fmt.Errorf("processEvent: unknown type %q", event.Type)
	}
}

func processItemAdded(tx *sql.Tx, ev models.Event) error {
	var p models.ItemAddedPayload
	if err := json.Unmarshal(ev.Payload, &p); err != nil {
		return fmt.Errorf("itemAdded unmarshal: %w", err)
	}
	// Upsert: if the same product is already in the list, ignore.
	_, err := tx.Exec(`
		INSERT INTO list_items
		  (id, list_id, product_id, name_override, quantity, unit, note,
		   checked, added_by, added_at, sort_order, store_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?)
		ON CONFLICT(list_id, product_id) DO NOTHING`,
		p.ItemID, *ev.ListID, p.ProductID, p.NameOverride,
		p.Quantity, p.Unit, p.Note, ev.UserID, ev.ClientTS, p.StoreID,
	)
	if err != nil {
		return fmt.Errorf("itemAdded insert: %w", err)
	}

	if p.ProductID != nil {
		now := time.Now().UnixMilli()
		_, _ = tx.Exec(`
			INSERT INTO suggestion_weights (product_id, user_id, frequency, last_used)
			VALUES (?, ?, 1, ?)
			ON CONFLICT(product_id, user_id) DO UPDATE
			  SET frequency = frequency + 1, last_used = excluded.last_used`,
			*p.ProductID, ev.UserID, now,
		)
		_, _ = tx.Exec(`
			INSERT INTO suggestion_weights_family (product_id, frequency, last_used)
			VALUES (?, 1, ?)
			ON CONFLICT(product_id) DO UPDATE
			  SET frequency = frequency + 1, last_used = excluded.last_used`,
			*p.ProductID, now,
		)
	}
	return nil
}

func processItemChecked(tx *sql.Tx, ev models.Event) error {
	var p models.ItemCheckedPayload
	if err := json.Unmarshal(ev.Payload, &p); err != nil {
		return fmt.Errorf("itemChecked unmarshal: %w", err)
	}
	now := ev.ClientTS
	_, err := tx.Exec(`
		UPDATE list_items SET checked=1, checked_by=?, checked_at=?
		 WHERE id=? AND list_id=?`,
		ev.UserID, now, p.ItemID, *ev.ListID,
	)
	if err != nil {
		return fmt.Errorf("itemChecked update: %w", err)
	}

	// Record purchase history.
	var productID *string
	var nameSnapshot string
	_ = tx.QueryRow(`
		SELECT product_id, COALESCE(name_override, (
		  SELECT COALESCE(name_de, name_en, '') FROM products WHERE id = product_id
		), '') FROM list_items WHERE id=?`, p.ItemID,
	).Scan(&productID, &nameSnapshot)

	histID := fmt.Sprintf("%s_ph", p.ItemID)
	_, _ = tx.Exec(`
		INSERT OR IGNORE INTO purchase_history
		  (id, list_id, product_id, name_snapshot, store_id, checked_by, checked_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		histID, *ev.ListID, productID, nameSnapshot, p.StoreID, ev.UserID, now,
	)
	return nil
}

func processItemUnchecked(tx *sql.Tx, ev models.Event) error {
	var p models.ItemUncheckedPayload
	if err := json.Unmarshal(ev.Payload, &p); err != nil {
		return fmt.Errorf("itemUnchecked unmarshal: %w", err)
	}
	_, err := tx.Exec(`
		UPDATE list_items SET checked=0, checked_by=NULL, checked_at=NULL
		 WHERE id=? AND list_id=?`, p.ItemID, *ev.ListID)
	return err
}

func processItemDeleted(tx *sql.Tx, ev models.Event) error {
	var p models.ItemDeletedPayload
	if err := json.Unmarshal(ev.Payload, &p); err != nil {
		return fmt.Errorf("itemDeleted unmarshal: %w", err)
	}
	_, err := tx.Exec(`DELETE FROM list_items WHERE id=? AND list_id=?`, p.ItemID, *ev.ListID)
	return err
}

func processListCleared(tx *sql.Tx, ev models.Event) error {
	_, err := tx.Exec(`DELETE FROM list_items WHERE list_id=? AND checked=1`, *ev.ListID)
	return err
}

func processItemUpdated(tx *sql.Tx, ev models.Event) error {
	var p models.ItemUpdatedPayload
	if err := json.Unmarshal(ev.Payload, &p); err != nil {
		return fmt.Errorf("itemUpdated unmarshal: %w", err)
	}
	_, err := tx.Exec(`
		UPDATE list_items
		   SET name_override=COALESCE(?, name_override),
		       quantity=COALESCE(?, quantity),
		       unit=COALESCE(?, unit),
		       note=COALESCE(?, note),
		       store_id=COALESCE(?, store_id)
		 WHERE id=? AND list_id=?`,
		p.NameOverride, p.Quantity, p.Unit, p.Note, p.StoreID,
		p.ItemID, *ev.ListID,
	)
	return err
}
