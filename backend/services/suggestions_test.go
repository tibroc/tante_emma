package services

import (
	"testing"
)

// ── ftsEscape ──────────────────────────────────────────────────────────────

func TestFtsEscape(t *testing.T) {
	cases := []struct{ in, want string }{
		{"milk", "milk"},
		{"soy-milk", "soymilk"},
		{`say "hello"`, "say hello"},
		{"item.name", "itemname"},
		{"search+term", "searchterm"},
		{"(parens)", "parens"},
		{"a:b", "ab"},
	}
	for _, tc := range cases {
		got := ftsEscape(tc.in)
		if got != tc.want {
			t.Errorf("ftsEscape(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

// ── localeName ─────────────────────────────────────────────────────────────

func TestLocaleName(t *testing.T) {
	cases := []struct{ locale, want string }{
		{"de", "name_de"},
		{"", "name_de"},   // fallback
		{"fr", "name_de"}, // unknown → fallback
		{"en", "name_en"},
		{"pt", "name_pt"},
		{"pt-BR", "name_pt"},
	}
	for _, tc := range cases {
		got := localeName(tc.locale)
		if got != tc.want {
			t.Errorf("localeName(%q) = %q, want %q", tc.locale, got, tc.want)
		}
	}
}

// ── SearchProducts ──────────────────────────────────────────────────────────
//
// All product names are prefixed with "Zzz" to avoid matching anything in the
// seeded catalogue that migrations load into the test DB.

func TestSearchProducts_BasicMatch(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','Milch','Dairy','Leite','🥛','#fff')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Zzzvolmilch test','Zzzwhole milk test','Zzz','c1','builtin',0,0)`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p2','Zzzbutter test','Zzzbutter test','Zzz','c1','builtin',0,0)`)

	got, err := SearchProducts(d, "zzzvolmilch", "de", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d results, want 1", len(got))
	}
	if got[0].ProductID != "p1" {
		t.Errorf("got product %q, want p1", got[0].ProductID)
	}
}

func TestSearchProducts_ExcludesItemsAlreadyInList(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','A','A','A','🧪','#aaa')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Zzzmilchtest','Zzzmilchtest','Zzz','c1','builtin',0,0)`)
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','s1','U','member','de',0)`)
	exec(t, d, `INSERT INTO lists (id, name, type, owner_id, created_at, updated_at) VALUES ('l1','L','group','u1',0,0)`)
	exec(t, d, `INSERT INTO list_items (id, list_id, product_id, name_override, checked, added_by, added_at)
		VALUES ('i1','l1','p1','Zzzmilchtest',0,'u1',0)`)

	// Product already in l1 must be excluded.
	got, err := SearchProducts(d, "zzzmilchtest", "de", "l1", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) != 0 {
		t.Errorf("got %d results, want 0 (product already in list)", len(got))
	}

	// Without list filter: must appear.
	got2, err := SearchProducts(d, "zzzmilchtest", "de", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts no-list: %v", err)
	}
	if len(got2) != 1 {
		t.Errorf("got %d results without list filter, want 1", len(got2))
	}
}

func TestSearchProducts_FamilyWeightSortsHigherFirst(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','A','A','A','🧪','#aaa')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('pa','Zzzproduct alfa','Zzzproduct alfa','Zzz','c1','builtin',0,0)`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('pb','Zzzproduct beta','Zzzproduct beta','Zzz','c1','builtin',0,0)`)
	// pb has a higher family frequency → should rank first.
	exec(t, d, `INSERT INTO suggestion_weights_family (product_id, frequency, last_used) VALUES ('pb', 100, 0)`)

	got, err := SearchProducts(d, "zzzproduct", "de", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) < 2 {
		t.Fatalf("got %d results, want at least 2", len(got))
	}
	if got[0].ProductID != "pb" {
		t.Errorf("first result = %q, want pb (higher family frequency)", got[0].ProductID)
	}
}

func TestSearchProducts_UserWeightSortsHigherFirst(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','A','A','A','🧪','#aaa')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('pa','Zzzproduct2 alfa','Zzzproduct2 alfa','Zzz','c1','builtin',0,0)`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('pb','Zzzproduct2 beta','Zzzproduct2 beta','Zzz','c1','builtin',0,0)`)
	exec(t, d, `INSERT INTO users (id, oidc_sub, name, role, locale, created_at) VALUES ('u1','s1','U','member','de',0)`)
	// pb has a higher personal frequency for u1.
	exec(t, d, `INSERT INTO suggestion_weights (product_id, user_id, frequency, last_used) VALUES ('pb', 'u1', 100, 0)`)

	got, err := SearchProducts(d, "zzzproduct2", "de", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) < 2 {
		t.Fatalf("got %d results, want at least 2", len(got))
	}
	if got[0].ProductID != "pb" {
		t.Errorf("first result = %q, want pb (higher user frequency)", got[0].ProductID)
	}
}

func TestSearchProducts_LocaleEnReturnsEnglishName(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','Milch','Dairy','Leite','🥛','#fff')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Zzzvolmilch entest','Zzzwhole milk entest','Zzz','c1','builtin',0,0)`)

	got, err := SearchProducts(d, "zzzwhole milk entest", "en", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d results, want 1", len(got))
	}
	if got[0].DisplayName != "Zzzwhole milk entest" {
		t.Errorf("display_name = %q, want 'Zzzwhole milk entest'", got[0].DisplayName)
	}
}

func TestSearchProducts_CategoryAttachedToResult(t *testing.T) {
	d := newTestDB(t)
	exec(t, d, `INSERT INTO categories (id, name_de, name_en, name_pt, icon, color) VALUES ('c1','Milch','Dairy','Leite','🥛','#blue')`)
	exec(t, d, `INSERT INTO products (id, name_de, name_en, name_pt, category_id, source, created_at, updated_at)
		VALUES ('p1','Zzzcattest','Zzzcattest','Zzz','c1','builtin',0,0)`)

	got, err := SearchProducts(d, "zzzcattest", "de", "", "u1")
	if err != nil {
		t.Fatalf("SearchProducts: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d results, want 1", len(got))
	}
	if got[0].Category == nil {
		t.Fatal("category is nil, want c1")
	}
	if got[0].Category.ID != "c1" {
		t.Errorf("category.id = %q, want c1", got[0].Category.ID)
	}
}

// FTS5 special chars in user input must not cause a query error.
func TestSearchProducts_SpecialCharsNoError(t *testing.T) {
	d := newTestDB(t)
	if _, err := SearchProducts(d, `"milk*-test(foo)`, "de", "", "u1"); err != nil {
		t.Errorf("SearchProducts with special chars should not error: %v", err)
	}
}
