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

// ── item.added ─────────────────────────────────────────────────────────────

func seedListUser(t *testing.T, d *sql.DB) (listID, userID string) {
	t.Helper()
	listID, userID = "list1", "u1"
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','sub1','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES (?,?,'group','u1',0,0)`, listID, "L")
	return
}

func addEvent(t *testing.T, listID, userID, itemID string, productID *string, name string) *models.Event {
	t.Helper()
	payload, _ := json.Marshal(models.ItemAddedPayload{
		ItemID:       itemID,
		ProductID:    productID,
		NameOverride: &name,
	})
	return &models.Event{Type: "item.added", ListID: &listID, UserID: userID, Payload: payload}
}

func TestProcessItemAdded_InsertsItem(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	processInTx(t, d, addEvent(t, listID, userID, "i1", nil, "Apples"))

	var name string
	if err := d.QueryRow(`SELECT name_override FROM list_items WHERE id='i1'`).Scan(&name); err != nil {
		t.Fatalf("item not found: %v", err)
	}
	if name != "Apples" {
		t.Errorf("name_override = %q, want Apples", name)
	}
}

func TestProcessItemAdded_WithProductUpdatesWeights(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','A','A','A','🧪','#aaa')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Milch','Milk','Leite','c1','builtin',0,0)`)

	pid := "p1"
	processInTx(t, d, addEvent(t, listID, userID, "i1", &pid, "Milch"))

	var famFreq, userFreq int
	if err := d.QueryRow(`SELECT frequency FROM suggestion_weights_family WHERE product_id='p1'`).Scan(&famFreq); err != nil {
		t.Fatalf("family weight not recorded: %v", err)
	}
	if err := d.QueryRow(`SELECT frequency FROM suggestion_weights WHERE product_id='p1' AND user_id='u1'`).Scan(&userFreq); err != nil {
		t.Fatalf("user weight not recorded: %v", err)
	}
	if famFreq != 1 || userFreq != 1 {
		t.Errorf("weights = fam:%d user:%d, want both 1", famFreq, userFreq)
	}
}

func TestProcessItemAdded_DuplicateProductIgnored(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','A','A','A','🧪','#aaa')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Milch','Milk','Leite','c1','builtin',0,0)`)

	pid := "p1"
	ev := addEvent(t, listID, userID, "i1", &pid, "Milch")
	processInTx(t, d, ev)
	// Second add of the same product in the same list must be silently ignored (upsert ON CONFLICT DO NOTHING).
	processInTx(t, d, addEvent(t, listID, userID, "i2", &pid, "Milch again"))

	var count int
	if err := d.QueryRow(`SELECT COUNT(*) FROM list_items WHERE list_id=?`, listID).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Errorf("list_items count = %d, want 1 (duplicate product ignored)", count)
	}
}

func TestProcessItemAdded_ResolvesCategory(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','Milchprodukte','Dairy','Laticínios','🥛','#fff')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Vollmilch','Whole milk','Leite','c1','builtin',0,0)`)

	pid := "p1"
	processInTx(t, d, addEvent(t, listID, userID, "i1", &pid, "Vollmilch"))

	var catID string
	if err := d.QueryRow(`SELECT COALESCE(category_id,'') FROM list_items WHERE id='i1'`).Scan(&catID); err != nil {
		t.Fatalf("read category_id: %v", err)
	}
	if catID != "c1" {
		t.Errorf("category_id = %q, want c1 (resolved from product)", catID)
	}
}

// ── item.checked / item.unchecked ──────────────────────────────────────────

func TestProcessItemChecked_MarksCheckedAndRecordsPurchaseHistory(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO stores (id, name, created_at) VALUES ('s1','TestStore',0)`)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i1',?,'Eggs',0,'u1',0)`, listID)

	storeID := "s1"
	payload, _ := json.Marshal(models.ItemCheckedPayload{ItemID: "i1", StoreID: &storeID})
	ev := &models.Event{ID: "evt1", Type: "item.checked", ListID: &listID, UserID: userID, Payload: payload}
	processInTx(t, d, ev)

	var checked int
	if err := d.QueryRow(`SELECT checked FROM list_items WHERE id='i1'`).Scan(&checked); err != nil {
		t.Fatalf("read checked: %v", err)
	}
	if checked != 1 {
		t.Errorf("checked = %d, want 1", checked)
	}

	var histCount int
	if err := d.QueryRow(`SELECT COUNT(*) FROM purchase_history WHERE id='evt1'`).Scan(&histCount); err != nil {
		t.Fatalf("read purchase_history: %v", err)
	}
	if histCount != 1 {
		t.Errorf("purchase_history rows = %d, want 1", histCount)
	}
}

func TestProcessItemUnchecked_ClearsChecked(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i1',?,'Eggs',1,'u1',0)`, listID)

	payload, _ := json.Marshal(models.ItemUncheckedPayload{ItemID: "i1"})
	ev := &models.Event{Type: "item.unchecked", ListID: &listID, UserID: userID, Payload: payload}
	processInTx(t, d, ev)

	var checked int
	if err := d.QueryRow(`SELECT checked FROM list_items WHERE id='i1'`).Scan(&checked); err != nil {
		t.Fatalf("read checked: %v", err)
	}
	if checked != 0 {
		t.Errorf("checked = %d, want 0", checked)
	}
}

// ── item.deleted ───────────────────────────────────────────────────────────

func TestProcessItemDeleted_RemovesItem(t *testing.T) {
	d := newTestDB(t)
	listID, userID := seedListUser(t, d)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i1',?,'Apples',0,'u1',0)`, listID)

	payload, _ := json.Marshal(models.ItemDeletedPayload{ItemID: "i1"})
	ev := &models.Event{Type: "item.deleted", ListID: &listID, UserID: userID, Payload: payload}
	processInTx(t, d, ev)

	var count int
	if err := d.QueryRow(`SELECT COUNT(*) FROM list_items WHERE id='i1'`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 0 {
		t.Errorf("list_items count = %d after delete, want 0", count)
	}
}

// ── unknown / no-op event types ────────────────────────────────────────────

func TestProcessEvent_UnknownTypeErrors(t *testing.T) {
	d := newTestDB(t)
	tx, _ := d.Begin()
	listID := "l1"
	ev := &models.Event{Type: "event.unknown", ListID: &listID, UserID: "u1", Payload: json.RawMessage(`{}`)}
	err := ProcessEvent(tx, ev)
	tx.Rollback() //nolint:errcheck
	if err == nil {
		t.Error("ProcessEvent with unknown type should return an error")
	}
}

func TestProcessEvent_KnownNoopTypesDoNotError(t *testing.T) {
	noopTypes := []string{
		"list.created",
		"list.shared", "list.unshared",
		"store.created", "store.updated",
		"shelf_order.updated", "shelf_order.learned",
		"product.created", "product.updated",
	}
	d := newTestDB(t)
	listID := "l1"
	for _, typ := range noopTypes {
		tx, _ := d.Begin()
		ev := &models.Event{Type: typ, ListID: &listID, UserID: "u1", Payload: json.RawMessage(`{}`)}
		if err := ProcessEvent(tx, ev); err != nil {
			t.Errorf("ProcessEvent(%q) should be a no-op (no error), got: %v", typ, err)
		}
		tx.Rollback() //nolint:errcheck
	}
}

func TestProcessListRenamed(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','s','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('l1','Old','group','u1',0,0)`)

	payload, _ := json.Marshal(models.ListRenamedPayload{Name: "New"})
	listID := "l1"
	processInTx(t, d, &models.Event{Type: "list.renamed", ListID: &listID, UserID: "u1", Payload: payload})

	var name string
	if err := d.QueryRow(`SELECT name FROM lists WHERE id='l1'`).Scan(&name); err != nil {
		t.Fatalf("query: %v", err)
	}
	if name != "New" {
		t.Errorf("list name = %q, want %q", name, "New")
	}
}

func TestProcessListUpdated(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','s','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, color, created_at, updated_at) VALUES ('l1','L','group','u1','#old',0,0)`)

	payload, _ := json.Marshal(models.ListUpdatedPayload{Color: "#new"})
	listID := "l1"
	processInTx(t, d, &models.Event{Type: "list.updated", ListID: &listID, UserID: "u1", Payload: payload})

	var color string
	if err := d.QueryRow(`SELECT COALESCE(color,'') FROM lists WHERE id='l1'`).Scan(&color); err != nil {
		t.Fatalf("query: %v", err)
	}
	if color != "#new" {
		t.Errorf("list color = %q, want %q", color, "#new")
	}
}

func TestProcessListDeleted(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','s','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('l1','L','group','u1',0,0)`)
	exec(t, d, `INSERT INTO list_items (id, list_id, name_override, checked, added_by, added_at) VALUES ('i1','l1','item',0,'u1',0)`)

	listID := "l1"
	processInTx(t, d, &models.Event{Type: "list.deleted", ListID: &listID, UserID: "u1", Payload: json.RawMessage(`{}`)})

	var n int
	if err := d.QueryRow(`SELECT COUNT(*) FROM lists WHERE id='l1'`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 0 {
		t.Errorf("list still exists after list.deleted")
	}
	if err := d.QueryRow(`SELECT COUNT(*) FROM list_items WHERE list_id='l1'`).Scan(&n); err != nil {
		t.Fatalf("query: %v", err)
	}
	if n != 0 {
		t.Errorf("list_items still exist after list.deleted")
	}
}

// ── A manually-set position (auto_learned=0) must never be overwritten by learning.
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
