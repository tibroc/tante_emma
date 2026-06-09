package handlers

import (
	"context"
	"database/sql"
)

// canAccessList reports whether userID may read or write the given list,
// i.e. they own it or it has been shared with them. This is the single
// source of truth for list-level authorization, used by the list, event,
// and WebSocket handlers.
func canAccessList(ctx context.Context, db *sql.DB, userID, listID string) bool {
	var n int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM lists l
		LEFT JOIN list_shares ls ON ls.list_id = l.id AND ls.user_id = ?
		WHERE l.id = ? AND (l.owner_id = ? OR ls.user_id = ?)`,
		userID, listID, userID, userID,
	).Scan(&n)
	return err == nil && n > 0
}
