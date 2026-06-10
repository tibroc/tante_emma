package services

import (
	"database/sql"
	"fmt"

	"github.com/tante-emma/tanteemma/models"
)

// SearchProducts runs FTS5 search scored by family+user purchase frequency.
// Results already in listID are excluded. Falls back to empty slice (never errors on empty).
func SearchProducts(db *sql.DB, query, locale, listID, userID string) ([]models.Suggestion, error) {
	nameCol := localeName(locale)
	catNameCol := "c." + nameCol

	// FTS5 MATCH with prefix search (append * for partial matches).
	// Score formula: family weight × 2 + personal weight × 3, decayed by recency.
	// bm25() returns a negative value; we negate it for readability.
	q := fmt.Sprintf(`
		SELECT p.id,
		       COALESCE(p.%s, p.name_de, p.name_en, ''),
		       COALESCE(p.brand, ''),
		       COALESCE(p.category_id, ''),
		       COALESCE(%s, c.name_de, ''),
		       COALESCE(c.icon, ''), COALESCE(c.color, ''),
		       COALESCE(swf.frequency, 0),
		       COALESCE(sw.frequency,  0)
		  FROM products_fts
		  JOIN products p ON p.rowid = products_fts.rowid
		  LEFT JOIN categories c ON c.id = p.category_id
		  LEFT JOIN suggestion_weights_family swf ON swf.product_id = p.id
		  LEFT JOIN suggestion_weights sw ON sw.product_id = p.id AND sw.user_id = ?
		 WHERE products_fts MATCH ?
		   AND (? = '' OR p.id NOT IN (
		         SELECT product_id FROM list_items
		          WHERE list_id = ? AND product_id IS NOT NULL))
		 ORDER BY (COALESCE(swf.frequency,0)*2 + COALESCE(sw.frequency,0)*3) DESC,
		          -bm25(products_fts) DESC
		 LIMIT 6`, nameCol, catNameCol)

	ftsQuery := ftsEscape(query) + "*"
	rows, err := db.Query(q, userID, ftsQuery, listID, listID)
	if err != nil {
		return nil, fmt.Errorf("SearchProducts: %w", err)
	}
	defer rows.Close()

	suggestions := make([]models.Suggestion, 0, 6)
	for rows.Next() {
		var s models.Suggestion
		var catID, catName, catIcon, catColor string
		var famFreq, userFreq int
		if err := rows.Scan(&s.ProductID, &s.DisplayName, &s.Brand,
			&catID, &catName, &catIcon, &catColor,
			&famFreq, &userFreq); err != nil {
			continue
		}
		if catID != "" {
			s.Category = &models.Category{ID: catID, Icon: catIcon, Color: catColor}
			switch locale {
			case "en":
				s.Category.NameEn = catName
			default:
				s.Category.NameDe = catName
			}
		}
		suggestions = append(suggestions, s)
	}
	return suggestions, rows.Err()
}

func localeName(locale string) string {
	switch locale {
	case "en":
		return "name_en"
	case "pt", "pt-BR":
		return "name_pt"
	default:
		return "name_de"
	}
}

// ftsEscape removes FTS5 special characters from user input.
func ftsEscape(s string) string {
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '"', '\'', '-', '+', '*', '^', '(', ')', ':', '.':
			// skip
		default:
			out = append(out, s[i])
		}
	}
	return string(out)
}
