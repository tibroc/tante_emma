package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newTestClient starts an httptest.Server, registers t.Cleanup to close it,
// and returns an apiClient pointing at it with the sentinel token "test-token".
func newTestClient(t *testing.T, h http.HandlerFunc) *apiClient {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return newAPIClient(srv.URL, "test-token")
}

func assertBearer(t *testing.T, r *http.Request) {
	t.Helper()
	if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
		t.Errorf("Authorization = %q, want Bearer test-token", got)
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func TestListShoppingLists(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		switch r.URL.Path {
		case "/api/lists":
			writeJSON(w, []apiList{
				{ID: "list-1", Name: "Grocery", Color: "#f0f"},
			})
		case "/api/lists/list-1":
			writeJSON(w, apiListDetail{
				List: apiList{ID: "list-1", Name: "Grocery"},
				Items: []apiListItem{
					{ID: "i1", DisplayName: "Milk", Checked: false},
					{ID: "i2", DisplayName: "Butter", Checked: true},
					{ID: "i3", DisplayName: "Eggs", Checked: false},
				},
			})
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
			http.NotFound(w, r)
		}
	})

	result, err := toolListShoppingLists(context.Background(), client)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(result, "Grocery") {
		t.Errorf("result missing list name; got: %s", result)
	}
	if !strings.Contains(result, `"item_count": 3`) {
		t.Errorf("expected item_count 3; got: %s", result)
	}
	if !strings.Contains(result, `"checked_count": 1`) {
		t.Errorf("expected checked_count 1; got: %s", result)
	}
}

func TestGetShoppingList(t *testing.T) {
	qty := 2.0
	unit := "kg"

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		if r.URL.Path != "/api/lists/list-99" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		writeJSON(w, apiListDetail{
			List: apiList{ID: "list-99", Name: "Wocheneinkauf"},
			Items: []apiListItem{
				{ID: "i1", DisplayName: "Karotten", Quantity: &qty, Unit: &unit, Checked: false},
			},
		})
	})

	result, err := toolGetShoppingList(context.Background(), client, map[string]any{"list_id": "list-99"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(result, "Wocheneinkauf") || !strings.Contains(result, "Karotten") {
		t.Errorf("result missing expected content; got: %s", result)
	}
}

func TestAddItem_ResolvesProductID(t *testing.T) {
	var (
		searchQ     string
		eventBody   map[string]any
	)

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		switch r.URL.Path {
		case "/api/products/search":
			searchQ = r.URL.Query().Get("q")
			writeJSON(w, []apiSuggestion{
				{ProductID: "prod-42", DisplayName: "Karotten", Score: 3.0},
			})
		case "/api/lists/list-1/events":
			if r.Method != http.MethodPost {
				t.Errorf("events method = %s, want POST", r.Method)
			}
			_ = json.NewDecoder(r.Body).Decode(&eventBody)
			writeJSON(w, map[string]any{"events": []any{}})
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
	})

	result, err := toolAddItem(context.Background(), client, map[string]any{
		"list_id":   "list-1",
		"item_name": "Karotten",
		"quantity":  float64(2),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if searchQ != "Karotten" {
		t.Errorf("search q = %q, want Karotten", searchQ)
	}
	if eventBody["type"] != "item.added" {
		t.Errorf("event type = %v, want item.added", eventBody["type"])
	}
	payload, _ := eventBody["payload"].(map[string]any)
	if payload["product_id"] != "prod-42" {
		t.Errorf("payload product_id = %v, want prod-42", payload["product_id"])
	}
	if strings.Contains(result, "Karotten") == false {
		t.Errorf("result missing resolved name; got: %s", result)
	}
}

func TestAddItem_FallsBackToNameOverride(t *testing.T) {
	var eventBody map[string]any

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/products/search":
			writeJSON(w, []apiSuggestion{}) // no match
		case "/api/lists/list-1/events":
			_ = json.NewDecoder(r.Body).Decode(&eventBody)
			writeJSON(w, map[string]any{"events": []any{}})
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
	})

	_, err := toolAddItem(context.Background(), client, map[string]any{
		"list_id":   "list-1",
		"item_name": "Haferflockenmischung spezial",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	payload, _ := eventBody["payload"].(map[string]any)
	if payload["name_override"] != "Haferflockenmischung spezial" {
		t.Errorf("payload name_override = %v, want the input name", payload["name_override"])
	}
	if _, hasProductID := payload["product_id"]; hasProductID {
		t.Error("payload should not contain product_id when no match found")
	}
}

func TestCheckItem_ByID(t *testing.T) {
	var eventBody map[string]any

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		if r.URL.Path != "/api/lists/list-1/events" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		_ = json.NewDecoder(r.Body).Decode(&eventBody)
		writeJSON(w, map[string]any{"events": []any{}})
	})

	_, err := toolToggleItem(context.Background(), client, map[string]any{
		"list_id": "list-1",
		"item_id": "item-42",
	}, "item.checked")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if eventBody["type"] != "item.checked" {
		t.Errorf("event type = %v, want item.checked", eventBody["type"])
	}
	payload, _ := eventBody["payload"].(map[string]any)
	if payload["item_id"] != "item-42" {
		t.Errorf("payload item_id = %v, want item-42", payload["item_id"])
	}
}

func TestCheckItem_ByName_ResolvesItem(t *testing.T) {
	var eventBody map[string]any

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		switch r.URL.Path {
		case "/api/lists/list-1":
			writeJSON(w, apiListDetail{
				List: apiList{ID: "list-1"},
				Items: []apiListItem{
					{ID: "item-banana", DisplayName: "Bananen"},
					{ID: "item-carrot", DisplayName: "Karotten"},
				},
			})
		case "/api/lists/list-1/events":
			_ = json.NewDecoder(r.Body).Decode(&eventBody)
			writeJSON(w, map[string]any{"events": []any{}})
		default:
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
	})

	_, err := toolToggleItem(context.Background(), client, map[string]any{
		"list_id":   "list-1",
		"item_name": "banan", // partial, case-insensitive
	}, "item.checked")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	payload, _ := eventBody["payload"].(map[string]any)
	if payload["item_id"] != "item-banana" {
		t.Errorf("resolved item_id = %v, want item-banana", payload["item_id"])
	}
}

func TestUncheckItem(t *testing.T) {
	var eventBody map[string]any

	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/lists/list-1/events" {
			_ = json.NewDecoder(r.Body).Decode(&eventBody)
			writeJSON(w, map[string]any{"events": []any{}})
		}
	})

	_, err := toolToggleItem(context.Background(), client, map[string]any{
		"list_id": "list-1",
		"item_id": "item-7",
	}, "item.unchecked")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if eventBody["type"] != "item.unchecked" {
		t.Errorf("event type = %v, want item.unchecked", eventBody["type"])
	}
}

func TestSearchProducts(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		assertBearer(t, r)
		if r.URL.Path != "/api/products/search" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("q") != "Milch" {
			t.Errorf("q = %q, want Milch", r.URL.Query().Get("q"))
		}
		if r.URL.Query().Get("locale") != "de" {
			t.Errorf("locale = %q, want de", r.URL.Query().Get("locale"))
		}
		writeJSON(w, []apiSuggestion{
			{ProductID: "p1", DisplayName: "Vollmilch", Brand: "Demeter", Score: 5},
			{ProductID: "p2", DisplayName: "Fettarme Milch", Score: 2},
		})
	})

	result, err := toolSearchProducts(context.Background(), client, map[string]any{
		"query":  "Milch",
		"locale": "de",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(result, "Vollmilch") {
		t.Errorf("result missing Vollmilch; got: %s", result)
	}
	if !strings.Contains(result, "p1") {
		t.Errorf("result missing product_id p1; got: %s", result)
	}
}

func TestCheckItem_AmbiguousName_ReturnsError(t *testing.T) {
	client := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/lists/list-1" {
			writeJSON(w, apiListDetail{
				List: apiList{ID: "list-1"},
				Items: []apiListItem{
					{ID: "item-a", DisplayName: "Milch 1,5%"},
					{ID: "item-b", DisplayName: "Milch 3,5%"},
				},
			})
		}
	})

	_, err := toolToggleItem(context.Background(), client, map[string]any{
		"list_id":   "list-1",
		"item_name": "Milch",
	}, "item.checked")
	if err == nil {
		t.Fatal("expected error for ambiguous name, got nil")
	}
	if !strings.Contains(err.Error(), "ambiguous") {
		t.Errorf("error message should mention 'ambiguous': %v", err)
	}
}
