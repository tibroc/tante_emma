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

// LookupBarcode fetches a product from Open Food Facts by barcode.
func LookupBarcode(ctx context.Context, barcode string) (*models.Product, error) {
	url := fmt.Sprintf("%s/%s.json", offBaseURL, barcode)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("openfoodfacts: build request: %w", err)
	}
	req.Header.Set("User-Agent", "TanteEmma/1.0")

	resp, err := offClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openfoodfacts: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("openfoodfacts: unexpected status %d", resp.StatusCode)
	}

	var result struct {
		Product struct {
			ProductName string `json:"product_name"`
			Brands      string `json:"brands"`
			ImageURL    string `json:"image_url"`
		} `json:"product"`
		Status int `json:"status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("openfoodfacts: decode: %w", err)
	}
	if result.Status != 1 {
		return nil, nil
	}

	// TODO: map OFF fields to models.Product properly (multilingual names, category mapping)
	name := result.Product.ProductName
	brand := result.Product.Brands
	thumb := result.Product.ImageURL
	source := models.SourceOpenFoodFacts
	return &models.Product{
		NameDe:       &name,
		Brand:        &brand,
		Barcode:      &barcode,
		ThumbnailURL: &thumb,
		Source:       source,
	}, nil
}
