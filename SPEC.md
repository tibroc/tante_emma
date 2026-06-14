# TanteEmma – Product Specification

> Self-hosted family shopping list app. Nostalgic name, modern execution.
> Version: 1.0 | Languages: de, en, pt-BR

---

## 1. Product Vision

TanteEmma is a self-hosted progressive web app for families. It combines the simplicity of a paper shopping list with smart suggestions, real-time sync, and store-aware sorting. The primary interaction is: open app → tap input → tap suggestion → done. Everything else is secondary.

**Core values:**
- Speed over features: adding an item must never require more than 2 taps
- Family-first: built for mixed technical abilities (grandparents to teenagers)
- Offline-capable: works in the store basement with no signal
- Self-hosted: no cloud dependency, full data ownership

---

## 2. User Roles

| Role | Permissions |
|---|---|
| **Admin** (parent) | Everything: manage products, categories, stores, shelf order, users, lists |
| **Member** (adult) | Add/edit/delete items, manage own lists, share lists |
| **Child** | Add items, check items off, view lists they have access to. Cannot delete lists, manage stores, or edit product metadata |

One TanteEmma instance = one family. Multi-tenant support is explicitly out of scope for v1 but the schema must not prevent it later (family_id on all relevant tables).

---

## 3. Authentication

- OIDC only (no local password auth)
- Compatible providers: Authentik, Keycloak, Dex, Google, GitHub
- Session: HTTP-only cookie, 30-day expiry with sliding window
- First user to log in after install becomes Admin automatically
- Admin can assign roles to other users in Settings

**OIDC config (environment variables):**
```
OIDC_ISSUER_URL=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_REDIRECT_URL=https://yourdomain.com/auth/callback
```

---

## 4. Data Architecture

### 4.1 Event Sourcing

All mutations are stored as immutable events. Materialized views are derived from the event log and can be rebuilt at any time.

**Event types:**
```
list.created          list.renamed          list.deleted
list.shared           list.unshared
item.added            item.updated          item.deleted
item.checked          item.unchecked
list.cleared          (removes all checked items)
store.created         store.updated
shelf_order.updated   shelf_order.learned   (auto)
product.created       product.updated
```

**Event envelope:**
```json
{
  "id": "01J4K...",          // ULID (time-sortable, offline-safe)
  "type": "item.added",
  "list_id": "01J3...",
  "user_id": "01J1...",
  "client_ts": 1720000000000, // ms, set by client at action time
  "server_ts": 1720000000123, // ms, set by server on receipt
  "payload": { ... }         // event-type specific
}
```

### 4.2 Conflict Resolution

- Events are merged by `client_ts` order on the server
- For shopping list operations, true conflicts cannot occur:
  - Two users checking the same item → idempotent, both are "checked"
  - Two users adding the same product → both events apply, deduplication in materialized view (same product_id in same list = single item, quantity summed)
  - Delete vs. check → delete wins (higher destructiveness wins)
- Offline clients queue events in IndexedDB, replay on reconnect
- Server processes events in ULID order, recomputes materialized views

### 4.3 Database Schema (SQLite)

```sql
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
  id           TEXT PRIMARY KEY,
  name_de      TEXT,
  name_en      TEXT,
  name_pt      TEXT,
  brand        TEXT,
  barcode      TEXT UNIQUE,
  category_id  TEXT REFERENCES categories(id),
  source       TEXT NOT NULL DEFAULT 'builtin', -- builtin|openfoodfacts|custom
  off_id       TEXT,                     -- Open Food Facts product ID
  thumbnail_url TEXT,
  created_by   TEXT REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_products_barcode ON products(barcode);
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
  id          TEXT PRIMARY KEY,
  store_id    TEXT NOT NULL REFERENCES stores(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  position    INTEGER NOT NULL,
  auto_learned INTEGER NOT NULL DEFAULT 1, -- 0=manual, 1=auto
  updated_at  INTEGER NOT NULL,
  UNIQUE(store_id, category_id)
);

-- Preferred store per product (admin-managed)
CREATE TABLE product_stores (
  product_id  TEXT NOT NULL REFERENCES products(id),
  store_id    TEXT NOT NULL REFERENCES stores(id),
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
  id              TEXT PRIMARY KEY,
  list_id         TEXT NOT NULL REFERENCES lists(id),
  product_id      TEXT REFERENCES products(id),  -- null for custom items
  name_override   TEXT,                           -- if no product_id, or custom name
  quantity        REAL,
  unit            TEXT,
  note            TEXT,
  checked         INTEGER NOT NULL DEFAULT 0,
  checked_by      TEXT REFERENCES users(id),
  checked_at      INTEGER,
  added_by        TEXT NOT NULL REFERENCES users(id),
  added_at        INTEGER NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,     -- manual sort within category
  store_id        TEXT REFERENCES stores(id),     -- override preferred store for this item
  UNIQUE(list_id, product_id)                     -- deduplication: one product per list
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
  product_id    TEXT NOT NULL REFERENCES products(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  frequency     INTEGER NOT NULL DEFAULT 1,
  last_used     INTEGER NOT NULL,
  PRIMARY KEY(product_id, user_id)
);

-- Family-level weights (aggregated)
CREATE TABLE suggestion_weights_family (
  product_id    TEXT NOT NULL REFERENCES products(id),
  frequency     INTEGER NOT NULL DEFAULT 1,
  last_used     INTEGER NOT NULL,
  PRIMARY KEY(product_id)
);

-- ============================================================
-- PURCHASE HISTORY
-- ============================================================

CREATE TABLE purchase_history (
  id          TEXT PRIMARY KEY,
  list_id     TEXT NOT NULL REFERENCES lists(id),
  product_id  TEXT REFERENCES products(id),
  name_snapshot TEXT NOT NULL,
  store_id    TEXT REFERENCES stores(id),
  checked_by  TEXT REFERENCES users(id),
  checked_at  INTEGER NOT NULL
);

CREATE INDEX idx_purchase_history_product ON purchase_history(product_id);
```

---

## 5. API Design

### 5.1 REST Endpoints

```
Auth
  GET  /auth/login              → redirect to OIDC
  GET  /auth/callback           → OIDC callback, set session cookie
  POST /auth/logout

Lists
  GET  /api/lists               → all lists visible to user
  POST /api/lists               → create list
  GET  /api/lists/:id           → list + items (initial load)
  PUT  /api/lists/:id           → rename, change icon/color
  DEL  /api/lists/:id           → delete (admin/owner only)
  GET  /api/lists/:id/members   → roster (owner + shared users); readable by anyone with list access
  POST /api/lists/:id/share     → share with user (owner/admin)
  DEL  /api/lists/:id/share/:uid

Items (via events, not direct CRUD)
  POST /api/lists/:id/events    → submit one or more events (batch)
  GET  /api/lists/:id/events?since=<ulid>  → event catchup for offline sync

Products
  GET  /api/products/search?q=&locale=  → search with suggestions
  GET  /api/products/barcode/:code      → barcode lookup (DB first, then OFF)
  POST /api/products               → create custom product (admin/member)
  PUT  /api/products/:id           → update product (admin only)

Stores
  GET  /api/stores
  POST /api/stores
  PUT  /api/stores/:id
  DEL  /api/stores/:id
  GET  /api/stores/:id/shelf-order
  PUT  /api/stores/:id/shelf-order  → update shelf order (admin only)

Users
  GET  /api/users               → family members (admin only)
  PUT  /api/users/:id/role      → change role (admin only)

System
  GET  /api/health
  GET  /api/version
```

### 5.2 WebSocket Protocol

```
Connection: GET /ws?token=<session_token>

Server → Client messages:
  { "type": "event", "event": { ...event } }          // new event from another user
  { "type": "presence", "user_id": "...", "list_id": "...", "active": true }
  { "type": "ping" }

Client → Server messages:
  { "type": "subscribe", "list_id": "..." }
  { "type": "unsubscribe", "list_id": "..." }
  { "type": "pong" }
  { "type": "presence", "list_id": "...", "active": true }
```

All mutations go through `POST /api/lists/:id/events`, not WebSocket.
WebSocket is receive-only for real-time updates.

---

## 6. Suggestion Algorithm

**Score formula:**
```
score = (family_frequency * 2 + user_frequency * 3) * recency_factor
recency_factor = 1 / (1 + days_since_last_use / 30)
```

**Search pipeline (in order):**
1. FTS5 full-text match on query (name_de/en/pt + brand)
2. Score each result with suggestion formula
3. Items already in current list → exclude from suggestions
4. Return top 6 results

**Suggestion response:**
```json
[
  {
    "product_id": "...",
    "display_name": "Milch 3,5%",
    "brand": "Weihenstephan",
    "category": { "id": "...", "name": "Kühlregal", "icon": "🥛", "color": "#06B6D4" },
    "preferred_store": { "id": "...", "name": "REWE" },
    "score": 42.3
  }
]
```

---

## 7. Offline Sync

### Client-side (IndexedDB structure)
```
tantoemma_db
├── events_queue     // pending events not yet sent to server
├── lists            // cached list metadata
├── list_items       // cached item state per list
├── products         // cached product lookups
└── sync_cursors     // { list_id → last_known_event_ulid }
```

### Sync flow
1. **Online:** Events POST'd immediately, WebSocket delivers updates
2. **Going offline:** Events written to `events_queue` + applied to local state optimistically
3. **Coming back online:**
   - POST all queued events to `/api/lists/:id/events` (batch)
   - GET `/api/lists/:id/events?since=<last_cursor>` to catch up
   - Merge: server is authoritative, recompute local state from merged event stream
4. **Service Worker** caches app shell + API responses for offline rendering

---

## 8. Auto-learned Shelf Order

After each completed shopping trip (user taps "Clear checked"):
1. Collect all `item.checked` events for that list session, in timestamp order
2. Extract the category sequence from those events
3. Update `store_shelf_order` positions using exponential moving average:
   ```
   new_position = 0.7 * observed_position + 0.3 * current_position
   ```
4. Mark `auto_learned = 1`
5. If admin has manually set an order (`auto_learned = 0`), skip that category

---

## 9. Internationalisation

- Backend: locale stored per user, passed in `Accept-Language` header or user profile
- Frontend: i18n via `svelte-i18n` (or `next-intl` if Next.js)
- Product names: `name_de`, `name_en`, `name_pt` columns — display the user's locale, fall back to `name_de`
- Category names: same pattern
- UI strings: translation files in `locales/de.json`, `en.json`, `pt-BR.json`
- Date/number formatting: use `Intl` API, locale-aware

---

## 10. Barcode Scanner

1. User taps camera icon in add-item bar
2. WebRTC camera stream, decode via `@zxing/browser` (WASM, no backend needed)
3. On decode:
   a. POST `/api/products/barcode/:code`
   b. Backend checks local DB first
   c. If not found: fetch `https://world.openfoodfacts.org/api/v2/product/:code`
   d. Map OFF response → product schema, save to DB (source = 'openfoodfacts')
   e. Return product to client → show "Add X to list?" confirmation sheet
4. Unknown barcode → show "New product" form with barcode pre-filled

---

## 11. Seed Data

The initial database must ship with:
- **~20 categories** with icons and colors (Obst & Gemüse, Brot & Backwaren, Kühlregal, Tiefkühl, Getränke, Süßwaren, Snacks, Konserven, Nudeln & Reis, Gewürze, Hygiene, Reinigung, Haushalt, Baby, Tier, Drogerie, Käse, Fleisch & Wurst, Fisch, Sonstiges)
- **~800 curated products** covering everyday German household shopping
- Products include: brand name items (Nutella, Milka, Haribo, Adelholzener etc.), store-brand generics, fresh produce
- Each product has: name in de/en/pt, category, no barcode required
- Seed file: `backend/db/seed.sql` generated from `scripts/generate_seed.py`

---

## 12. Design System

### Colors
```css
:root {
  /* Primary – Fuchsia */
  --color-primary-50:  #fdf4ff;
  --color-primary-100: #fae8ff;
  --color-primary-400: #e879f9;
  --color-primary-500: #d946ef;  /* main */
  --color-primary-600: #c026d3;
  --color-primary-700: #a21caf;

  /* Accent – Emerald */
  --color-accent-400:  #34d399;
  --color-accent-500:  #10b981;  /* main */
  --color-accent-600:  #059669;

  /* Neutrals */
  --color-surface:     #ffffff;
  --color-surface-2:   #f9fafb;
  --color-border:      #e5e7eb;
  --color-text:        #111827;
  --color-text-muted:  #6b7280;
}

[data-theme="dark"] {
  --color-surface:     #0f0f11;
  --color-surface-2:   #1a1a1f;
  --color-border:      #2d2d35;
  --color-text:        #f9fafb;
  --color-text-muted:  #9ca3af;
}
```

### Typography
- Display/headings: `Fraunces` (Google Fonts) — warm, characterful serif
- Body/UI: `DM Sans` (Google Fonts) — clean, friendly, highly legible
- Monospace: `JetBrains Mono` — for barcodes, codes

### Spacing & Touch Targets
- Minimum tap target: **48×48px** (WCAG 2.5.5)
- List item height: **56px** (comfortable thumb reach)
- Tile size: **min 80px height**, 2-column grid
- Bottom navigation height: **64px** + safe area inset
- Input bar height: **56px**

### Motion
- Transitions: 150ms ease for state changes, 250ms for panel slides
- Item check: quick scale + color fade (100ms)
- Item add: slide-in from top (200ms)
- Delete: swipe + fade (150ms) with 5s undo snackbar
- No motion if `prefers-reduced-motion`

---

## 13. Screen Inventory

### Screens
1. **Login** — OIDC redirect, minimal branding
2. **List Overview** — all lists, create new
3. **Shopping List** (main screen)
   - Add-item bar (sticky top)
   - View toggle: List / Tiles
   - Sort/filter bar: by Category | by Store | by Date | Alphabetical
   - Store picker (filters items to that store's items + shelf order)
   - Checked items section (collapsed by default)
   - "Clear checked" button
4. **Item Detail Sheet** (bottom sheet)
   - Name, quantity, unit, store override, note
   - Admin: link to product, edit category
5. **Barcode Scanner** (full-screen camera overlay)
6. **Product Search / New Product** (during add flow)
7. **Stores** — list of stores, add/edit
8. **Store Shelf Order Editor** — drag-and-drop categories
9. **Purchase History** — timeline of checked items
10. **Settings**
    - User profile (name, avatar, locale)
    - Family members + roles (admin only)
    - App theme (light/dark/system)
    - OIDC info

---

## 14. Progressive Web App

- `manifest.json`: name, short_name, icons (192, 512), theme_color `#d946ef`, background_color, display: standalone
- Service Worker: cache-first for app shell, network-first for API
- Install prompt: shown after 3rd visit or when adding first item
- iOS: `apple-mobile-web-app-capable`, splash screens

---

## 15. Non-Functional Requirements

| Concern | Target |
|---|---|
| Initial load (cold, 4G) | < 2s |
| Add item interaction | < 100ms (optimistic) |
| Suggestion latency | < 200ms |
| WebSocket reconnect | Auto, exponential backoff, max 30s |
| SQLite WAL mode | Always on |
| Max list items | 500 (soft warning at 200) |
| Backup | Litestream to local volume or S3-compatible |
| Logs | Structured JSON to stdout |
