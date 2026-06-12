package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/tante-emma/tanteemma/models"
)

const offBaseURL = "https://world.openfoodfacts.org/api/v2/product"

var offClient = &http.Client{Timeout: 5 * time.Second}

// offFields limits the OFF response to what we map, keeping the payload small.
const offFields = "code,product_name,product_name_de,product_name_en,product_name_pt,brands,image_url"

// LookupBarcode fetches a product from Open Food Facts by barcode and maps it
// onto a models.Product (no id / no DB access — the caller persists it).
// Returns (nil, nil) when OFF has no usable record for the barcode.
func LookupBarcode(ctx context.Context, barcode string) (*models.Product, error) {
	url := fmt.Sprintf("%s/%s.json?fields=%s", offBaseURL, barcode, offFields)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("openfoodfacts: build request: %w", err)
	}
	req.Header.Set("User-Agent", "TanteEmma/1.0")

	resp, err := offClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openfoodfacts: request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openfoodfacts: unexpected status %d", resp.StatusCode)
	}

	var result struct {
		Code    string `json:"code"`
		Product struct {
			ProductName   string `json:"product_name"`
			ProductNameDe string `json:"product_name_de"`
			ProductNameEn string `json:"product_name_en"`
			ProductNamePt string `json:"product_name_pt"`
			Brands        string `json:"brands"`
			ImageURL      string `json:"image_url"`
		} `json:"product"`
		Status int `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("openfoodfacts: decode: %w", err)
	}
	if result.Status != 1 {
		return nil, nil
	}

	// Per-locale name, falling back to the generic product_name so the product
	// is findable via FTS in every UI language. A product with no name at all is
	// not useful — treat it as a miss.
	pick := func(specific string) string {
		if specific != "" {
			return specific
		}
		return result.Product.ProductName
	}
	nameDe := pick(result.Product.ProductNameDe)
	nameEn := pick(result.Product.ProductNameEn)
	namePt := pick(result.Product.ProductNamePt)
	if nameDe == "" && nameEn == "" && namePt == "" {
		return nil, nil
	}

	offID := result.Code
	if offID == "" {
		offID = barcode
	}
	// Category is left nil here; the persisting handler resolves one best-effort
	// from the product name via FTS (OFF's category tags don't map cleanly onto
	// our fixed category set).
	return &models.Product{
		NameDe:       strPtr(nameDe),
		NameEn:       strPtr(nameEn),
		NamePt:       strPtr(namePt),
		Brand:        strPtr(result.Product.Brands),
		Barcode:      strPtr(barcode),
		OFFID:        strPtr(offID),
		ThumbnailURL: strPtr(result.Product.ImageURL),
		Source:       models.SourceOpenFoodFacts,
	}, nil
}

// strPtr returns nil for an empty string so empty values become SQL NULL
// rather than empty strings (which would pollute the FTS index).
func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
