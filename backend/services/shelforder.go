package services

import (
	"database/sql"
	"fmt"
)

// LearnShelfOrderTx updates store_shelf_order positions from a completed shopping
// trip using an EMA (α=0.7 observed, 0.3 current). It runs inside the caller's
// transaction so it is atomic with the list.cleared that triggers it.
//
// categories must be the distinct category IDs in the order they were checked
// off (i.e. the order the shopper walked the aisles). Rows with auto_learned=0
// (manually set) are never overwritten.
func LearnShelfOrderTx(tx *sql.Tx, storeID string, categories []string) error {
	for observedPos, catID := range categories {
		observed := float64(observedPos + 1)

		var current float64
		var autoLearned int
		err := tx.QueryRow(`
			SELECT position, auto_learned FROM store_shelf_order
			 WHERE store_id = ? AND category_id = ?`, storeID, catID,
		).Scan(&current, &autoLearned)

		if err == sql.ErrNoRows {
			if _, err := tx.Exec(`
				INSERT INTO store_shelf_order
				  (id, store_id, category_id, position, auto_learned, updated_at)
				VALUES (lower(hex(randomblob(8))), ?, ?, ?, 1, unixepoch()*1000)`,
				storeID, catID, int(observed)); err != nil {
				return fmt.Errorf("LearnShelfOrderTx insert: %w", err)
			}
			continue
		}
		if err != nil {
			return fmt.Errorf("LearnShelfOrderTx read: %w", err)
		}

		if autoLearned == 0 {
			continue // manual override, don't touch
		}

		newPos := int(0.7*observed + 0.3*current)
		if newPos < 1 {
			newPos = 1
		}
		if _, err := tx.Exec(`
			UPDATE store_shelf_order
			   SET position = ?, updated_at = unixepoch()*1000
			 WHERE store_id = ? AND category_id = ?`,
			newPos, storeID, catID); err != nil {
			return fmt.Errorf("LearnShelfOrderTx update: %w", err)
		}
	}
	return nil
}
