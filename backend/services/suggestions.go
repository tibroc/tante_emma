package services

import (
	"database/sql"

	"github.com/tante-emma/tanteemma/models"
)

// SearchProducts runs FTS5 search scored by family+user frequency weights.
func SearchProducts(db *sql.DB, query, locale, listID, userID string) ([]models.Suggestion, error) {
	// TODO:
	// 1. FTS5 search on products_fts
	// 2. LEFT JOIN suggestion_weights_family
	// 3. LEFT JOIN suggestion_weights for userID
	// 4. Exclude products already in listID
	// 5. ORDER BY scoring formula DESC
	// 6. LIMIT 6
	return nil, nil
}
