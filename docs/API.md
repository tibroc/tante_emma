# TanteEmma API Reference

The TanteEmma backend exposes a JSON REST API used by the web app and available
to external integrations (home-automation scripts, MCP servers, etc.) through
Personal Access Tokens.

---

## Authentication

### Session cookies (web app)

The web app authenticates via an OIDC flow at `/auth/login`. The server sets an
`HttpOnly` session cookie on success. All browser-originated requests carry this
cookie automatically. This method is not available to external clients.

### Personal Access Tokens (PAT)

External clients authenticate with a long-lived bearer token:

```
Authorization: Bearer tem_<32 url-safe chars>
```

**Creating a token:**

1. Log into the TanteEmma web app and open **Settings → API Access**.
2. Tap **Create token**, give it a name, choose **Read only** or **Read & write**,
   and set an optional expiry.
3. Copy the token immediately — it is shown once and never stored in plaintext.

The token's authority is bounded by:
- The **scope** chosen at creation (`read` or `write`; write implies read).
- The underlying **user's role** (admin / member / child) — a token never grants
  more than the user's own permissions.

**Example – list all shopping lists:**

```bash
curl -s https://emma.example.com/api/lists \
  -H "Authorization: Bearer tem_Abc123..."
```

### CORS

CORS headers are set only for the configured frontend origin. External integrations
(server-to-server scripts, MCP servers) run outside the browser and send no `Origin`
header, so CORS does not apply — no special configuration is needed.

---

## Rate Limiting

| Auth method | Limit | Scope |
|---|---|---|
| Personal Access Token | **100 requests / minute** (token bucket, burst up to 100) | Per token ID |
| Session cookie | None | — |

When the limit is exceeded the server responds with `429 Too Many Requests`:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{"error":"rate limit exceeded; retry after 60 seconds"}
```

Retry after the number of seconds given in `Retry-After`.

---

## Error Format

All error responses use a consistent JSON body regardless of which layer (auth
middleware, handler, rate limiter) produced them:

```json
{"error": "human-readable message"}
```

Common status codes:

| Code | Meaning |
|---|---|
| `400` | Bad request (missing or invalid fields) |
| `401` | Not authenticated |
| `403` | Authenticated but not authorised (wrong scope, wrong role) |
| `404` | Resource not found |
| `422` | Event processing failed (malformed payload) |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Timestamps

All timestamps are **Unix milliseconds** (integer). Example: `1718500000000`.

---

## Endpoints

### `GET /api/health`

Unauthenticated liveness probe.

```json
{"status": "ok"}
```

---

### `GET /api/lists`

Returns all lists visible to the authenticated user (owned + shared), ordered
favourites-first, then by creation date descending.

**Auth:** read scope

**Response `200`:**

```json
[
  {
    "id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
    "name": "Wocheneinkauf",
    "type": "group",
    "owner_id": "01J4...",
    "icon": "",
    "color": "",
    "archived": false,
    "created_at": 1718500000000,
    "updated_at": 1718500001000,
    "is_favorite": false
  }
]
```

| Field | Type | Description |
|---|---|---|
| `id` | string (ULID) | Unique list ID |
| `name` | string | Display name |
| `type` | `"group"` \| `"private"` | Shared family list or personal |
| `owner_id` | string | User ID of the list creator |
| `icon` | string | Emoji or icon key (may be empty) |
| `color` | string | Hex colour string (may be empty) |
| `archived` | bool | Always `false` (archived lists are excluded) |
| `created_at` | int64 | Creation timestamp (ms) |
| `updated_at` | int64 | Last-modified timestamp (ms) |
| `is_favorite` | bool | Whether the authenticated user has starred this list |

---

### `GET /api/lists/:id`

Returns a single list and its current items.

**Auth:** read scope; user must own or have a share on the list

**Response `200`:**

```json
{
  "list": {
    "id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
    "name": "Wocheneinkauf",
    "type": "group",
    "owner_id": "01J4...",
    "icon": "",
    "color": "",
    "archived": false,
    "created_at": 1718500000000,
    "updated_at": 1718500001000,
    "is_favorite": false
  },
  "items": [
    {
      "id": "01J4ITEM000000000000000001",
      "list_id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
      "product_id": "01J4PROD000000000000000001",
      "name_override": null,
      "quantity": 2.0,
      "unit": "kg",
      "note": null,
      "checked": false,
      "checked_by": null,
      "checked_at": null,
      "added_by": "01J4...",
      "added_at": 1718500000500,
      "sort_order": 0,
      "store_id": null,
      "category_id": "cat-vegetables",
      "category_color": "#4ade80",
      "category_icon": "🥦",
      "display_name": "Karotten",
      "preferred_store_ids": ["store-01J4..."]
    }
  ]
}
```

**Item fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string (ULID) | Item ID (stable across sessions) |
| `list_id` | string | Parent list ID |
| `product_id` | string \| null | Catalogue product ID (null for free-text items) |
| `name_override` | string \| null | Name entered by the user, overrides the product name |
| `display_name` | string | Resolved display name: `name_override` → `name_de` → `name_en` |
| `quantity` | number \| null | Numeric quantity |
| `unit` | string \| null | Unit of measure (`"kg"`, `"ml"`, `"Stk."`, …) |
| `note` | string \| null | Free-text note |
| `checked` | bool | Whether the item has been ticked off |
| `checked_by` | string \| null | User ID who checked it |
| `checked_at` | int64 \| null | When it was checked (ms) |
| `added_by` | string | User ID who added it |
| `added_at` | int64 | When it was added (ms) |
| `sort_order` | int | Display position within the list |
| `store_id` | string \| null | Store assigned to this item specifically |
| `category_id` | string \| null | Category ID |
| `category_color` | string \| null | Category colour (#hex) |
| `category_icon` | string \| null | Category icon (emoji) |
| `preferred_store_ids` | string[] | Admin-assigned preferred stores for the product (may be empty) |

---

### `GET /api/lists/:id/events`

Returns the event log for a list, optionally from a cursor.

**Auth:** read scope; user must own or have a share on the list

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `since` | string (ULID) | Return only events with ID greater than this cursor (exclusive). Omit to get all events. |

**Response `200`:**

```json
{
  "events": [
    {
      "id": "01J4EVT000000000000000001",
      "type": "item.added",
      "list_id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
      "user_id": "01J4...",
      "payload": { "item_id": "01J4ITEM...", "product_id": "01J4PROD...", "quantity": 2 },
      "client_ts": 1718500000000,
      "server_ts": 1718500000050
    }
  ]
}
```

Events are ordered by ID (ULID) ascending, which is chronological.

---

### `POST /api/lists/:id/events`

Submits one or more events that mutate list state. The server applies them to the
materialized view and broadcasts them to connected WebSocket clients.

**Auth:** write scope; user must own or have a share on the list

**Request body — single event:**

```json
{
  "type": "item.added",
  "client_ts": 1718500000000,
  "payload": { ... }
}
```

**Request body — batch:**

```json
{
  "events": [
    { "type": "item.added", "client_ts": 1718500000000, "payload": { ... } },
    { "type": "item.checked", "client_ts": 1718500000100, "payload": { ... } }
  ]
}
```

The server fills `id`, `list_id`, `user_id`, and `server_ts`. You may supply an
`id` (ULID) for idempotency — re-submitting a known ID is a safe no-op.

`client_ts` must not be more than 5 minutes in the future.

**Response `200`:**

```json
{
  "events": [ /* processed event objects, same shape as GET /events */ ]
}
```

---

#### Event types for external clients

> **Child role restriction:** tokens belonging to users with the `child` role may only
> submit `item.added`, `item.checked`, and `item.unchecked`.

##### `item.added`

Add a new item to the list.

```json
{
  "type": "item.added",
  "client_ts": 1718500000000,
  "payload": {
    "item_id": "01J4ITEM000000000000000001",
    "product_id": "01J4PROD000000000000000001",
    "name_override": null,
    "quantity": 1,
    "unit": "kg",
    "note": null,
    "store_id": null,
    "category_id": null
  }
}
```

| Payload field | Required | Description |
|---|---|---|
| `item_id` | yes | Client-generated ULID for this item (stable ID) |
| `product_id` | no | Catalogue product ID from `/api/products/search` |
| `name_override` | no | Free-text name (used when `product_id` is absent, or to override the product name) |
| `quantity` | no | Numeric quantity |
| `unit` | no | Unit of measure |
| `note` | no | Free-text note |
| `store_id` | no | Associate with a specific store |
| `category_id` | no | Override the product's category |

Either `product_id` or `name_override` should be provided (both is fine;
`name_override` is what is displayed).

##### `item.checked`

Mark an item as purchased.

```json
{
  "type": "item.checked",
  "client_ts": 1718500000000,
  "payload": {
    "item_id": "01J4ITEM000000000000000001",
    "store_id": "01J4STORE0000000000000001"
  }
}
```

| Payload field | Required | Description |
|---|---|---|
| `item_id` | yes | ID of the item to check |
| `store_id` | no | Store where the item was purchased (improves shelf-order learning) |

##### `item.unchecked`

Undo a check (re-add to the active list).

```json
{
  "type": "item.unchecked",
  "client_ts": 1718500000000,
  "payload": {
    "item_id": "01J4ITEM000000000000000001"
  }
}
```

##### `item.deleted`

Remove an item from the list permanently.

```json
{
  "type": "item.deleted",
  "client_ts": 1718500000000,
  "payload": {
    "item_id": "01J4ITEM000000000000000001"
  }
}
```

##### `item.updated`

Update item metadata (quantity, note, store, name override).

```json
{
  "type": "item.updated",
  "client_ts": 1718500000000,
  "payload": {
    "item_id": "01J4ITEM000000000000000001",
    "quantity": 3,
    "unit": "Stk.",
    "note": "bio wenn möglich",
    "store_id": null,
    "name_override": null
  }
}
```

All payload fields except `item_id` are optional; only supplied (non-null) fields
are updated.

##### `list.cleared`

Remove all checked items from the list (end-of-shopping cleanup).

```json
{
  "type": "list.cleared",
  "client_ts": 1718500000000,
  "payload": {}
}
```

---

### `GET /api/products/search`

Search the product catalogue with FTS5 full-text search scored by purchase
frequency (family-wide and per-user). Items already in `list_id` are excluded.

**Auth:** read scope

**Query parameters:**

| Param | Default | Description |
|---|---|---|
| `q` | — | Search term (required; empty returns `[]`) |
| `locale` | `"de"` | Preferred name language: `"de"`, `"en"`, `"pt-BR"` |
| `list_id` | — | ULID of the list to exclude already-added products from |

**Response `200`:**

```json
[
  {
    "product_id": "01J4PROD000000000000000001",
    "display_name": "Karotten",
    "brand": "Demeter",
    "category": {
      "id": "cat-vegetables",
      "name_de": "Gemüse",
      "name_en": "",
      "name_pt": "",
      "icon": "🥦",
      "color": "#4ade80",
      "sort_order": 0
    },
    "preferred_store": null,
    "score": 6.0
  }
]
```

Returns up to 6 results ordered by score descending.

| Field | Type | Description |
|---|---|---|
| `product_id` | string | Use this as `product_id` in `item.added` |
| `display_name` | string | Localised product name |
| `brand` | string | Brand name (may be empty) |
| `category` | object \| null | Category metadata for display |
| `preferred_store` | object \| null | Store object if there is a single preferred store |
| `score` | number | Ranking score (family × 2 + personal × 3 frequency) |

---

### `GET /api/stores`

Returns all stores configured in the app.

**Auth:** read scope

**Response `200`:**

```json
[
  {
    "id": "01J4STORE0000000000000001",
    "name": "Rewe Hauptstraße",
    "icon": "🛒",
    "color": "#ef4444",
    "address": "Hauptstraße 1",
    "created_at": 1718500000000
  }
]
```

Store IDs can be used as `store_id` in event payloads and in product preferred-store fields.

---

### `GET /api/categories`

Returns all product categories. Useful for resolving `category_id` values in
list items and product search results.

**Auth:** read scope

**Response `200`:**

```json
[
  {
    "id": "cat-vegetables",
    "name_de": "Gemüse",
    "name_en": "Vegetables",
    "icon": "🥦",
    "color": "#4ade80"
  }
]
```

---

### `GET /api/history`

Returns up to 200 recent purchase events across all accessible lists.

**Auth:** read scope

**Response `200`:**

```json
{
  "history": [
    {
      "id": "01J4HIST000000000000000001",
      "list_id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
      "name_snapshot": "Karotten",
      "store_name": "Rewe Hauptstraße",
      "store_icon": "🛒",
      "category_id": "cat-vegetables",
      "category_color": "#4ade80",
      "category_icon": "🥦",
      "checked_at": 1718500005000
    }
  ]
}
```

`name_snapshot` is the product name at the time it was checked off (immutable).
Entries are ordered by `checked_at` descending (most recent first).

---

## Working Example — Add an item to a list

```bash
# 1. Find the list
LIST=$(curl -s https://emma.example.com/api/lists \
  -H "Authorization: Bearer tem_Abc123..." \
  | jq -r '.[0].id')

# 2. Search for the product
PROD=$(curl -s "https://emma.example.com/api/products/search?q=Karotten&locale=de&list_id=${LIST}" \
  -H "Authorization: Bearer tem_Abc123..." \
  | jq -r '.[0].product_id')

# 3. Generate a ULID for the item (e.g. via the `ulid` CLI)
ITEM_ID=$(ulid)

# 4. Submit the event
curl -s -X POST "https://emma.example.com/api/lists/${LIST}/events" \
  -H "Authorization: Bearer tem_Abc123..." \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"item.added\",
    \"client_ts\": $(date +%s000),
    \"payload\": {
      \"item_id\": \"${ITEM_ID}\",
      \"product_id\": \"${PROD}\",
      \"quantity\": 1
    }
  }"
```

---

## Not Available to External Clients

The following endpoints exist but are intentionally out of scope for PAT-based
external access (admin-only operations, per-user personal state, or internal WS
coordination):

- `PUT /api/lists/:id` — rename/recolor a list
- `DELETE /api/lists/:id` — delete a list
- `GET /api/lists/:id/share`, `POST /api/lists/:id/share`, `DELETE /api/lists/:id/share/:uid` — share management
- `POST /api/products`, `PUT /api/products/:id`, `PUT /api/products/:id/stores` — product catalogue editing
- `POST /api/stores`, `PUT /api/stores/:id`, `DELETE /api/stores/:id` — store create/update/delete (admin only)
- `GET/PUT /api/stores/:id/shelf-order` — shelf order editing
- `GET /api/users`, `PUT /api/users/:id/role` — user management (admin only)
- `GET /api/tokens`, `POST /api/tokens`, `DELETE /api/tokens/:id` — token management (session-cookie only; tokens cannot create tokens)
- `GET /ws` — WebSocket hub (cookie auth only)
