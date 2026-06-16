package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type apiClient struct {
	baseURL string
	token   string
	http    *http.Client
}

func newAPIClient(baseURL, token string) *apiClient {
	return &apiClient{
		baseURL: baseURL,
		token:   token,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *apiClient) get(ctx context.Context, path string, query url.Values, out any) error {
	u := c.baseURL + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	return c.do(req, out)
}

func (c *apiClient) post(ctx context.Context, path string, body, out any) error {
	b, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(b))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	return c.do(req, out)
}

func (c *apiClient) do(req *http.Request, out any) error {
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("http: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode >= 400 {
		var apiErr struct {
			Error string `json:"error"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&apiErr)
		if apiErr.Error != "" {
			return fmt.Errorf("API %d: %s", resp.StatusCode, apiErr.Error)
		}
		return fmt.Errorf("API %d", resp.StatusCode)
	}

	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// --- API response types (matching the TanteEmma backend JSON shapes) ---

type apiList struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Color      string `json:"color"`
	IsFavorite bool   `json:"is_favorite"`
}

type apiListDetail struct {
	List  apiList       `json:"list"`
	Items []apiListItem `json:"items"`
}

type apiListItem struct {
	ID            string   `json:"id"`
	DisplayName   string   `json:"display_name"`
	Quantity      *float64 `json:"quantity"`
	Unit          *string  `json:"unit"`
	Note          *string  `json:"note"`
	Checked       bool     `json:"checked"`
	StoreID       *string  `json:"store_id"`
	CategoryID    *string  `json:"category_id"`
	CategoryColor *string  `json:"category_color"`
	CategoryIcon  *string  `json:"category_icon"`
}

type apiSuggestion struct {
	ProductID   string       `json:"product_id"`
	DisplayName string       `json:"display_name"`
	Brand       string       `json:"brand,omitempty"`
	Category    *apiCategory `json:"category,omitempty"`
	Score       float64      `json:"score"`
}

type apiCategory struct {
	ID     string `json:"id"`
	NameDe string `json:"name_de"`
	NameEn string `json:"name_en"`
	Icon   string `json:"icon"`
	Color  string `json:"color"`
}

// --- typed client methods ---

func (c *apiClient) getLists(ctx context.Context) ([]apiList, error) {
	var out []apiList
	return out, c.get(ctx, "/api/lists", nil, &out)
}

func (c *apiClient) getList(ctx context.Context, id string) (*apiListDetail, error) {
	var out apiListDetail
	return &out, c.get(ctx, "/api/lists/"+id, nil, &out)
}

func (c *apiClient) searchProducts(ctx context.Context, q, locale string) ([]apiSuggestion, error) {
	qp := url.Values{"q": {q}}
	if locale != "" {
		qp.Set("locale", locale)
	}
	var out []apiSuggestion
	return out, c.get(ctx, "/api/products/search", qp, &out)
}

func (c *apiClient) submitEvent(ctx context.Context, listID string, event map[string]any) (map[string]any, error) {
	var out map[string]any
	return out, c.post(ctx, "/api/lists/"+listID+"/events", event, &out)
}
