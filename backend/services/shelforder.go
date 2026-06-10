package services

import (
	"database/sql"
	"fmt"
)

// LearnShelfOrder updates store_shelf_order positions from a completed shopping
// trip using an EMA (α=0.7 observed, 0.3 current).
// Called after list.cleared when a store_id is known for the session.
// Rows with auto_learned=0 (manually set) are never overwritten.
func LearnShelfOrder(db *sql.DB, storeID, listID string, sessionStart int64) error {
	rows, err := db.Query(`
		SELECT DISTINCT p.category_id
		  FROM events e
		  JOIN list_items li ON li.id = JSON_EXTRACT(e.payload, '$.item_id')
		  JOIN products p ON p.id = li.product_id
		 WHERE e.list_id = ?
		   AND e.type = 'item.checked'
		   AND e.client_ts >= ?
		   AND p.category_id IS NOT NULL
		 ORDER BY e.client_ts ASC`, listID, sessionStart)
	if err != nil {
		return fmt.Errorf("LearnShelfOrder query: %w", err)
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			continue
		}
		categories = append(categories, cat)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("LearnShelfOrder scan: %w", err)
	}
	if len(categories) == 0 {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("LearnShelfOrder tx: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	for observedPos, catID := range categories {
		observed := float64(observedPos + 1)

		var current float64
		var autoLearned int
		err := tx.QueryRow(`
			SELECT position, auto_learned FROM store_shelf_order
			 WHERE store_id = ? AND category_id = ?`, storeID, catID,
		).Scan(&current, &autoLearned)

		if err == sql.ErrNoRows {
			_, err = tx.Exec(`
				INSERT INTO store_shelf_order
				  (id, store_id, category_id, position, auto_learned, updated_at)
				VALUES (lower(hex(randomblob(8))), ?, ?, ?, 1, unixepoch()*1000)`,
				storeID, catID, int(observed))
			if err != nil {
				return fmt.Errorf("LearnShelfOrder insert: %w", err)
			}
			continue
		}
		if err != nil {
			return fmt.Errorf("LearnShelfOrder read: %w", err)
		}

		if autoLearned == 0 {
			continue // manual override, don't touch
		}

		newPos := int(0.7*observed + 0.3*current)
		if newPos < 1 {
			newPos = 1
		}
		_, err = tx.Exec(`
			UPDATE store_shelf_order
			   SET position = ?, updated_at = unixepoch()*1000
			 WHERE store_id = ? AND category_id = ?`,
			newPos, storeID, catID)
		if err != nil {
			return fmt.Errorf("LearnShelfOrder update: %w", err)
		}
	}

	return tx.Commit()
}
