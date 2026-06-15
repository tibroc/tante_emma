package handlers

import (
	"context"
	"database/sql"

	"github.com/tante-emma/tanteemma/models"
)

// isListOwnerOrAdmin reports whether the session user may perform owner-level
// operations on the list (rename, recolor, delete). Admins always pass; others
// must own the list.
func isListOwnerOrAdmin(ctx context.Context, db *sql.DB, sess *models.Session, listID string) bool {
	if sess.Role == models.RoleAdmin {
		return true
	}
	var ownerID string
	_ = db.QueryRowContext(ctx, `SELECT owner_id FROM lists WHERE id=?`, listID).Scan(&ownerID)
	return ownerID == sess.UserID
}

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
