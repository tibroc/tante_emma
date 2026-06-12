package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/models"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	database, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return database
}

func exec(t *testing.T, d *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := d.Exec(q, args...); err != nil {
		t.Fatalf("exec %q: %v", q, err)
	}
}

// seedClearScenario sets up a user, list, store, two categories, and two checked
// items belonging to those categories with a known check order.
func seedClearScenario(t *testing.T, d *sql.DB) (listID, storeID, catA, catB string) {
	t.Helper()
	listID, storeID, catA, catB = "list1", "store1", "catA", "catB"

	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','sub1','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES (?,?,'group','u1',0,0)`, listID, "L")
	exec(t, d, `INSERT INTO stores (id, name, created_at) VALUES (?,?,0)`, storeID, "S")
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES (?,?,?,?,?,?)`, catA, "A", "A", "A", "🥦", "#0f0")
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES (?,?,?,?,?,?)`, catB, "B", "B", "B", "🥛", "#00f")

	// catB was checked first (checked_at=100), catA second (checked_at=200).
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, category_id, checked, checked_at, added_by, added_at) VALUES ('i1',?,?,?,1,100,'u1',0)`, listID, "milk", catB)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, category_id, checked, checked_at, added_by, added_at) VALUES ('i2',?,?,?,1,200,'u1',0)`, listID, "broccoli", catA)
	return
}

func clearEvent(t *testing.T, listID, storeID string) *models.Event {
	t.Helper()
	payload, _ := json.Marshal(models.ListClearedPayload{StoreID: &storeID, SessionStart: 0})
	return &models.Event{Type: "list.cleared", ListID: &listID, UserID: "u1", Payload: payload}
}

func processInTx(t *testing.T, d *sql.DB, ev *models.Event) {
	t.Helper()
	tx, err := d.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if err := ProcessEvent(tx, ev); err != nil {
		tx.Rollback()
		t.Fatalf("ProcessEvent: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}
}

// BUG-1: list.cleared with a store must learn shelf-order positions in the order
// items were checked off. The old code deleted the items first and learned
// nothing; this verifies the fix actually records positions.
func TestProcessListCleared_LearnsShelfOrder(t *testing.T) {
	d := newTestDB(t)
	listID, storeID, catA, catB := seedClearScenario(t, d)

	processInTx(t, d, clearEvent(t, listID, storeID))

	pos := map[string]int{}
	rows, err := d.Query(`SELECT category_id, position FROM store_shelf_order WHERE store_id=?`, storeID)
	if err != nil {
		t.Fatalf("query shelf order: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var c string
		var p int
		if err := rows.Scan(&c, &p); err != nil {
			t.Fatalf("scan: %v", err)
		}
		pos[c] = p
	}

	// catB was checked first → position 1; catA second → position 2.
	if pos[catB] != 1 {
		t.Errorf("catB position = %d, want 1 (checked first)", pos[catB])
	}
	if pos[catA] != 2 {
		t.Errorf("catA position = %d, want 2 (checked second)", pos[catA])
	}
}

// list.cleared must remove checked items but keep unchecked ones.
func TestProcessListCleared_DeletesOnlyChecked(t *testing.T) {
	d := newTestDB(t)
	listID, storeID, _, _ := seedClearScenario(t, d)
	// Add an unchecked item that must survive.
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i3',?,?,0,'u1',0)`, listID, "eggs")

	processInTx(t, d, clearEvent(t, listID, storeID))

	var remaining int
	if err := d.QueryRow(`SELECT COUNT(*) FROM list_items WHERE list_id=?`, listID).Scan(&remaining); err != nil {
		t.Fatalf("count: %v", err)
	}
	if remaining != 1 {
		t.Errorf("remaining items = %d, want 1 (only the unchecked one)", remaining)
	}
}

// item.updated store_id semantics: a value sets it, an explicit empty string
// clears it (revert to the product's preferred store for filtering), and a nil
// pointer (field absent) leaves it unchanged.
func TestProcessItemUpdated_StoreSetAndClear(t *testing.T) {
	d := newTestDB(t)
	listID := "list1"
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','sub1','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES (?,?,'group','u1',0,0)`, listID, "L")
	exec(t, d, `INSERT INTO stores (id, name, created_at) VALUES ('store1','S',0)`)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i1',?,?,0,'u1',0)`, listID, "milk")

	storeID := func(s string) *string { return &s }
	updEvent := func(p models.ItemUpdatedPayload) *models.Event {
		b, _ := json.Marshal(p)
		return &models.Event{Type: "item.updated", ListID: &listID, UserID: "u1", Payload: b}
	}
	currentStore := func() *string {
		var s sql.NullString
		if err := d.QueryRow(`SELECT store_id FROM list_items WHERE id='i1'`).Scan(&s); err != nil {
			t.Fatalf("read store_id: %v", err)
		}
		if s.Valid {
			return &s.String
		}
		return nil
	}

	// Set the store.
	processInTx(t, d, updEvent(models.ItemUpdatedPayload{ItemID: "i1", StoreID: storeID("store1")}))
	if got := currentStore(); got == nil || *got != "store1" {
		t.Fatalf("after set: store_id = %v, want store1", got)
	}

	// Absent store_id (note-only update) must leave the store intact.
	note := "ripe ones"
	processInTx(t, d, updEvent(models.ItemUpdatedPayload{ItemID: "i1", Note: &note}))
	if got := currentStore(); got == nil || *got != "store1" {
		t.Fatalf("after note update: store_id = %v, want store1 (unchanged)", got)
	}

	// Explicit empty string clears it.
	processInTx(t, d, updEvent(models.ItemUpdatedPayload{ItemID: "i1", StoreID: storeID("")}))
	if got := currentStore(); got != nil {
		t.Fatalf("after clear: store_id = %v, want nil", got)
	}
}

// A manually-set position (auto_learned=0) must never be overwritten by learning.
func TestProcessListCleared_RespectsManualOrder(t *testing.T) {
	d := newTestDB(t)
	listID, storeID, _, catB := seedClearScenario(t, d)
	// Pin catB to position 5 as a manual override.
	exec(t, d, `INSERT INTO store_shelf_order (id, store_id, category_id, position, auto_learned, updated_at) VALUES ('s1',?,?,5,0,0)`, storeID, catB)

	processInTx(t, d, clearEvent(t, listID, storeID))

	var pos, auto int
	if err := d.QueryRow(`SELECT position, auto_learned FROM store_shelf_order WHERE store_id=? AND category_id=?`, storeID, catB).Scan(&pos, &auto); err != nil {
		t.Fatalf("query: %v", err)
	}
	if pos != 5 || auto != 0 {
		t.Errorf("manual override changed: position=%d auto_learned=%d, want 5/0", pos, auto)
	}
}
