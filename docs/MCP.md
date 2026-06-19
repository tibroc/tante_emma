# TanteEmma MCP Server

The TanteEmma MCP server lets LLM assistants (Claude, etc.) read and manage your
family's shopping lists using the
[Model Context Protocol](https://modelcontextprotocol.io/) stdio transport.

The server is a thin client of the [TanteEmma REST API](API.md) — it holds no
business logic and re-uses the same PAT authentication.

---

## Setup

### 1. Build the binary

```bash
cd mcp
go build -o tanteemma-mcp .
# or install into $GOPATH/bin:
go install .
```

The binary has no external dependencies.

### 2. Get a Personal Access Token

1. Open the TanteEmma web app and go to **Settings → API Access**.
2. Tap **Create token**, give it a name (e.g. `Claude Desktop`), choose
   **Read & write** scope, and set an optional expiry.
3. Copy the token immediately — it is shown once.

The token looks like `tem_Abc123...`. Keep it secret.

### 3. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or the equivalent path on your platform:

```json
{
  "mcpServers": {
    "tanteemma": {
      "command": "/path/to/tanteemma-mcp",
      "env": {
        "TANTEEMMA_URL":   "https://emma.example.com",
        "TANTEEMMA_TOKEN": "tem_Abc123..."
      }
    }
  }
}
```

Restart Claude Desktop. The TanteEmma tools appear automatically.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `TANTEEMMA_TOKEN` | — | **Required.** Personal Access Token with read+write scope. |
| `TANTEEMMA_URL` | `http://localhost:8080` | Base URL of the TanteEmma backend. |

---

## Tools

### `list_shopping_lists`

Returns all lists visible to the user (owned and shared), with item counts.

**No input required.**

**Example output:**
```json
[
  {
    "id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
    "name": "Wocheneinkauf",
    "color": "#f59e0b",
    "item_count": 8,
    "checked_count": 3,
    "is_favorite": true
  }
]
```

**Triggered by prompts like:**
- "What shopping lists do I have?"
- "How many things are on my grocery list?"
- "Show me my lists"

---

### `get_shopping_list`

Returns the full contents of a list — every item with its name, quantity, unit,
note, category (emoji), and checked status.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `list_id` | string | yes | List ID from `list_shopping_lists` |

**Example output:**
```json
{
  "id": "01J4ABCDEFGHIJKLMNOPQRSTUV",
  "name": "Wocheneinkauf",
  "items": [
    {
      "id": "01J4ITEM000000000000000001",
      "name": "Karotten",
      "quantity": 1,
      "unit": "kg",
      "note": "bio wenn möglich",
      "checked": false,
      "category": "🥦"
    },
    {
      "id": "01J4ITEM000000000000000002",
      "name": "Vollmilch",
      "quantity": 2,
      "unit": null,
      "checked": true,
      "category": "🥛"
    }
  ]
}
```

**Triggered by:**
- "What's on my grocery list?"
- "What do I still need to buy?"
- "Read me the shopping list"

---

### `add_item`

Adds an item to a list. The server automatically searches the product catalogue
and uses the top match when found; falls back to a free-text entry when nothing
matches. Use `search_products` first if you want to preview the match.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `list_id` | string | yes | Target list ID |
| `item_name` | string | yes | What to add (e.g. `"milk"`, `"Karotten"`, `"organic eggs"`) |
| `quantity` | number | no | Quantity (e.g. `2`, `0.5`) |
| `unit` | string | no | Unit: `"kg"`, `"g"`, `"ml"`, `"l"`, `"Stk."` (pieces), `"Pkg."` (package) |
| `note` | string | no | Free-text note (e.g. `"bio wenn möglich"`) |

**Example output:**
```json
{
  "added": true,
  "item_id": "1718500000000abcdef012345678",
  "display_name": "Karotten",
  "product_id": "01J4PROD000000000000000001",
  "list_id": "01J4ABCDEFGHIJKLMNOPQRSTUV"
}
```

When `product_id` is `null`, the item was added as free text (no catalogue match).

**Triggered by:**
- "Add milk to my shopping list"
- "Put 2 kg of carrots on the grocery list"
- "Add oat milk and eggs to the Wocheneinkauf"
- "I need bread, butter, and cheese — add them all"

---

### `check_item`

Marks an item as purchased. Accepts either the exact `item_id` (from
`get_shopping_list`) or a name string that is resolved by case-insensitive
substring match within the list.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `list_id` | string | yes | List ID |
| `item_id` | string | no | Exact item ID (preferred) |
| `item_name` | string | no | Name to look up; required when `item_id` is not provided |

At least one of `item_id` or `item_name` must be given.

If `item_name` matches multiple items, the tool returns an error with the
matching names and IDs so the LLM can ask the user to disambiguate or re-call
with an `item_id`.

**Example output:**
```json
{
  "success": true,
  "item_id": "01J4ITEM000000000000000001",
  "item_name": "Karotten",
  "action": "checked off"
}
```

**Triggered by:**
- "Check off bananas"
- "I bought the milk, mark it done"
- "We got everything on the list — check it all off" *(LLM iterates)*

---

### `uncheck_item`

Marks a checked-off item as not purchased — adds it back to the active list.
Same interface as `check_item`.

**Input:** same as `check_item`.

**Triggered by:**
- "Uncheck the eggs, I forgot them"
- "Actually we didn't get the bread, put it back"

---

### `search_products`

Searches the product catalogue. Returns up to 6 results ordered by purchase
frequency (most-bought items rank higher). Useful for the LLM to verify what
`add_item` will resolve a vague name to before actually adding it.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | Search term |
| `locale` | string | no | `"de"` (default), `"en"`, or `"pt-BR"` |

**Example output:**
```json
[
  {
    "product_id": "01J4PROD000000000000000001",
    "name": "Vollmilch",
    "brand": "Demeter",
    "category": "Milch & Milchprodukte",
    "score": 6.0
  },
  {
    "product_id": "01J4PROD000000000000000002",
    "name": "Fettarme Milch",
    "brand": "",
    "category": "Milch & Milchprodukte",
    "score": 2.0
  }
]
```

**Triggered by:**
- "What products do you know about with 'milk'?"
- "Search for bread in the catalogue"
- *(LLM self-verification before adding)*

---

## Error handling

Tool errors are returned as plain-text `isError: true` content blocks, not as
JSON-RPC protocol errors. The LLM sees the error message and can decide how to
proceed (ask the user, try a different tool call, etc.).

Common errors:

| Message | Cause |
|---|---|
| `API 401: unauthorized` | Invalid or expired token |
| `API 403: forbidden` | Token scope too narrow, or wrong role |
| `no item found matching "x" in this list` | Name lookup failed — use `get_shopping_list` to see what's on the list |
| `ambiguous: 2 items match "x"` | Name matched multiple items — re-call with `item_id` |
| `API 429: rate limit exceeded` | 100 req/min per token exceeded; back off and retry |

---

## Example conversation

```
User: What's on my grocery list?

Claude: [calls list_shopping_lists → finds "Wocheneinkauf" with id "01J4..."]
        [calls get_shopping_list with list_id "01J4..."]

        Your Wocheneinkauf has 5 items:
        - Karotten (1 kg) — unchecked
        - Vollmilch (2×) — unchecked
        - Butter — unchecked
        - Eier — checked ✓
        - Brot — checked ✓

User: Add oat milk and 500g of flour please.

Claude: [calls add_item: "oat milk", list_id "01J4..."]
        [calls add_item: "flour", quantity 500, unit "g", list_id "01J4..."]

        Done! Added:
        - Hafermilch (matched from catalogue)
        - Mehl, 500 g

User: Check off bananas.

Claude: [calls check_item: item_name "bananas", list_id "01J4..."]
        Error: no item found matching "bananas" in this list.

        Bananas aren't on your Wocheneinkauf. Would you like me to add them,
        or did you mean a different list?
```

---

## Protocol notes

- Transport: **stdio**, newline-delimited JSON (MCP `2024-11-05`)
- The server handles `initialize`, `tools/list`, `tools/call`, and `ping`.
  Unknown methods return a JSON-RPC `-32601` error.
- All mutations go through the TanteEmma event pipeline — changes appear in
  real time to other family members using the app.
- Rate limit: 100 requests/minute per PAT (shared across all tools).
