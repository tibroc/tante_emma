-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id          TEXT PRIMARY KEY,          -- ULID
  oidc_sub    TEXT NOT NULL UNIQUE,      -- sub claim from OIDC
  email       TEXT,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'member', -- admin|member|child
  locale      TEXT NOT NULL DEFAULT 'de',
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER
);

-- ============================================================
-- PRODUCTS & CATEGORIES
-- ============================================================

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name_de     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_pt     TEXT NOT NULL,
  icon        TEXT NOT NULL,             -- emoji or icon name
  color       TEXT NOT NULL,             -- hex color for UI
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id            TEXT PRIMARY KEY,
  name_de       TEXT,
  name_en       TEXT,
  name_pt       TEXT,
  brand         TEXT,
  barcode       TEXT UNIQUE,
  category_id   TEXT REFERENCES categories(id),
  source        TEXT NOT NULL DEFAULT 'builtin', -- builtin|openfoodfacts|custom
  off_id        TEXT,                     -- Open Food Facts product ID
  thumbnail_url TEXT,
  created_by    TEXT REFERENCES users(id),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_products_barcode  ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE products_fts USING fts5(
  product_id UNINDEXED,
  name_de, name_en, name_pt, brand,
  content=products,
  content_rowid=rowid
);

-- ============================================================
-- STORES & SHELF ORDER
-- ============================================================

CREATE TABLE stores (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,                      -- emoji
  color       TEXT,                      -- hex, for UI accents
  address     TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE store_shelf_order (
  id           TEXT PRIMARY KEY,
  store_id     TEXT NOT NULL REFERENCES stores(id),
  category_id  TEXT NOT NULL REFERENCES categories(id),
  position     INTEGER NOT NULL,
  auto_learned INTEGER NOT NULL DEFAULT 1, -- 0=manual, 1=auto
  updated_at   INTEGER NOT NULL,
  UNIQUE(store_id, category_id)
);

-- Preferred store per product (admin-managed)
CREATE TABLE product_stores (
  product_id   TEXT NOT NULL REFERENCES products(id),
  store_id     TEXT NOT NULL REFERENCES stores(id),
  is_preferred INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(product_id, store_id)
);

-- ============================================================
-- LISTS & ITEMS
-- ============================================================

CREATE TABLE lists (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'group', -- group|private
  owner_id    TEXT NOT NULL REFERENCES users(id),
  icon        TEXT,
  color       TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE list_shares (
  list_id     TEXT NOT NULL REFERENCES lists(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  permission  TEXT NOT NULL DEFAULT 'write', -- read|write
  created_at  INTEGER NOT NULL,
  PRIMARY KEY(list_id, user_id)
);

-- Materialized view: current state of items
CREATE TABLE list_items (
  id            TEXT PRIMARY KEY,
  list_id       TEXT NOT NULL REFERENCES lists(id),
  product_id    TEXT REFERENCES products(id),  -- null for custom items
  name_override TEXT,                           -- if no product_id, or custom name
  quantity      REAL,
  unit          TEXT,
  note          TEXT,
  checked       INTEGER NOT NULL DEFAULT 0,
  checked_by    TEXT REFERENCES users(id),
  checked_at    INTEGER,
  added_by      TEXT NOT NULL REFERENCES users(id),
  added_at      INTEGER NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,     -- manual sort within category
  store_id      TEXT REFERENCES stores(id),     -- override preferred store for this item
  UNIQUE(list_id, product_id)                   -- deduplication: one product per list
);

CREATE INDEX idx_list_items_list ON list_items(list_id);

-- ============================================================
-- EVENT LOG
-- ============================================================

CREATE TABLE events (
  id          TEXT PRIMARY KEY,          -- ULID
  type        TEXT NOT NULL,
  list_id     TEXT REFERENCES lists(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  payload     TEXT NOT NULL,             -- JSON
  client_ts   INTEGER NOT NULL,
  server_ts   INTEGER NOT NULL
);

CREATE INDEX idx_events_list ON events(list_id, server_ts);
CREATE INDEX idx_events_user ON events(user_id);

-- ============================================================
-- SUGGESTIONS & LEARNING
-- ============================================================

CREATE TABLE suggestion_weights (
  product_id  TEXT NOT NULL REFERENCES products(id),
  user_id     TEXT NOT NULL REFERENCES users(id),
  frequency   INTEGER NOT NULL DEFAULT 1,
  last_used   INTEGER NOT NULL,
  PRIMARY KEY(product_id, user_id)
);

-- Family-level weights (aggregated)
CREATE TABLE suggestion_weights_family (
  product_id  TEXT NOT NULL REFERENCES products(id),
  frequency   INTEGER NOT NULL DEFAULT 1,
  last_used   INTEGER NOT NULL,
  PRIMARY KEY(product_id)
);

-- ============================================================
-- PURCHASE HISTORY
-- ============================================================

CREATE TABLE purchase_history (
  id            TEXT PRIMARY KEY,
  list_id       TEXT NOT NULL REFERENCES lists(id),
  product_id    TEXT REFERENCES products(id),
  name_snapshot TEXT NOT NULL,
  store_id      TEXT REFERENCES stores(id),
  checked_by    TEXT REFERENCES users(id),
  checked_at    INTEGER NOT NULL
);

CREATE INDEX idx_purchase_history_product ON purchase_history(product_id);
