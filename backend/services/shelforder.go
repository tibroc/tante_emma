package services

import "database/sql"

// LearnShelfOrder updates store_shelf_order positions from a completed shopping
// trip using an exponential moving average (0.7 * observed + 0.3 * current).
// Called after list.cleared when a store_id is associated with the session.
func LearnShelfOrder(db *sql.DB, storeID, listID string, sessionStart int64) error {
	// TODO:
	// 1. Collect item.checked events for listID since sessionStart, ordered by client_ts
	// 2. Extract category sequence
	// 3. For each category: new_pos = 0.7*observed + 0.3*current
	// 4. UPDATE store_shelf_order SET position=new_pos, auto_learned=1 WHERE store_id=? AND category_id=?
	//    Skip rows where auto_learned=0 (manual override)
	return nil
}
