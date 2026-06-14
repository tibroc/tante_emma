# TanteEmma – Claude Code Implementation Guide

> Read SPEC.md first. This file covers architecture decisions, code conventions,
> and the phased implementation order for Claude Code sessions.

---

## Repository Structure

```
tanteemma/
├── backend/
│   ├── main.go
│   ├── config/
│   │   └── config.go              # env-based config, fail fast on missing vars
│   ├── db/
│   │   ├── db.go                  # SQLite setup, WAL mode, migrations
│   │   ├── migrations/
│   │   │   ├── 001_initial.sql
│   │   │   └── 002_seed.sql
│   │   └── seed/
│   │       ├── categories.sql
│   │       └── products.sql
│   ├── handlers/
│   │   ├── auth.go                # OIDC login/callback/logout
│   │   ├── lists.go
│   │   ├── items.go               # event submission
│   │   ├── products.go
│   │   ├── stores.go
│   │   ├── users.go
│   │   └── ws.go                  # WebSocket hub
│   ├── middleware/
│   │   ├── auth.go                # session validation, role checks
│   │   └── cors.go
│   ├── models/
│   │   ├── event.go
│   │   ├── list.go
│   │   ├── product.go
│   │   └── user.go
│   ├── services/
│   │   ├── events.go              # event processing, materialized view updates
│   │   ├── suggestions.go         # search + scoring
│   │   ├── openfoodfacts.go       # OFF API client
│   │   └── shelforder.go          # auto-learning logic
│   └── ws/
│       └── hub.go                 # WebSocket connection manager
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── AddItemBar.svelte
│   │   │   │   ├── ListItem.svelte
│   │   │   │   ├── TileItem.svelte
│   │   │   │   ├── BottomSheet.svelte
│   │   │   │   ├── BarcodeScanner.svelte
│   │   │   │   ├── PresenceAvatars.svelte
│   │   │   │   └── SortBar.svelte
│   │   │   ├── stores/
│   │   │   │   ├── listStore.ts       # active list state
│   │   │   │   ├── syncStore.ts       # online/offline/sync status
│   │   │   │   └── userStore.ts
│   │   │   ├── offline/
│   │   │   │   ├── db.ts             # IndexedDB wrapper
│   │   │   │   ├── eventQueue.ts     # offline event queue
│   │   │   │   └── sync.ts           # sync orchestration
│   │   │   ├── ws.ts                 # WebSocket client
│   │   │   └── api.ts                # fetch wrapper
│   │   ├── routes/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte           # redirect to /lists
│   │   │   ├── login/+page.svelte
│   │   │   ├── lists/
│   │   │   │   ├── +page.svelte       # list overview
│   │   │   │   └── [id]/+page.svelte  # shopping list
│   │   │   ├── stores/+page.svelte
│   │   │   ├── history/+page.svelte
│   │   │   └── settings/+page.svelte
│   │   ├── app.css                    # design tokens, global styles
│   │   └── app.html
│   ├── static/
│   │   ├── manifest.json
│   │   └── icons/
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── .env.example
```

---

## Technology Decisions (rationale)

### Backend: Go + Chi + SQLite

**Why Go:** Single binary, excellent performance, simple deployment, strong stdlib.
**Why Chi:** Lightweight, idiomatic, no magic. `go-chi/chi` + `go-chi/cors` + `go-chi/jwtauth`.
**Why SQLite:** No separate DB container. WAL mode handles concurrent reads well. Litestream for backups. Perfect for single-family scale (< 50k events/day).

Key Go packages:
```go
github.com/go-chi/chi/v5
github.com/coreos/go-oidc/v3
github.com/mattn/go-sqlite3          // or modernc.org/sqlite (pure Go, no CGO)
github.com/oklog/ulid/v2
github.com/gorilla/websocket
golang.org/x/crypto
```

**Use `modernc.org/sqlite`** (pure Go) to avoid CGO complexity in Docker builds.

### Frontend: SvelteKit

**Why SvelteKit:** Excellent PWA support, small bundle, reactive stores fit perfectly with the event-sourcing model. SSR for initial load, SPA for navigation.

Key packages:
```
@zxing/browser          # barcode scanning (WASM, runs in browser)
idb                     # IndexedDB wrapper
svelte-i18n             # internationalisation
@sveltejs/adapter-static # or adapter-node for SSR
```

### WebSocket architecture

- Single `/ws` endpoint per client
- Client subscribes to specific list IDs after connect
- Hub broadcasts events to all subscribers of a list
- Reconnect: exponential backoff starting at 1s, cap at 30s
- Ping/pong every 30s to detect dead connections

---

## Implementation Phases

### Phase 1 – Foundation (get something running)

**Goal:** Login, create a list, add items, check them off. No offline, no suggestions yet.

Order:
1. `docker-compose.yml` with Go backend + SvelteKit frontend + Litestream
2. DB migrations (schema from SPEC.md section 4.3)
3. OIDC auth (`/auth/login`, `/auth/callback`, session cookie)
4. Auth middleware (role checking)
5. `GET/POST /api/lists` + `GET /api/lists/:id`
6. `POST /api/lists/:id/events` → event processor → update `list_items`
7. `GET /api/products/search` (simple LIKE query for now)
8. Frontend: Login page, List overview, Shopping list page
9. AddItemBar with basic search (no scoring yet)
10. ListItem component (tap to check, swipe to delete)
11. WebSocket hub + frontend ws.ts
12. Real-time sync (online only)

**Definition of done:** Two browser windows, add item in one, appears in other < 500ms.

---

### Phase 2 – Smart Features

**Goal:** Suggestions work well, offline works, barcode scanner, shelf order.

Order:
1. Seed database (categories + ~800 products)
2. FTS5 index + suggestion scoring
3. `suggestion_weights` update on `item.checked`
4. IndexedDB setup (`idb` wrapper)
5. Event queue (write to IndexedDB when offline)
6. Service Worker (app shell cache)
7. Sync on reconnect (`/api/lists/:id/events?since=`)
8. Offline indicator in UI
9. Barcode scanner (`@zxing/browser`)
10. Open Food Facts integration
11. Store management UI
12. Shelf order editor (drag-and-drop)
13. Sorting: by store + shelf order

**Definition of done:** Add items while airplane mode, reconnect, items appear on second device.

---

### Phase 3 – Polish

**Goal:** Production-ready, delightful to use.

Order:
1. Tile view
2. Auto-learned shelf order
3. Purchase history screen
4. List sharing (select specific user)
5. Presence avatars (who's shopping now)
6. Child role enforcement in UI
7. i18n (de, en, pt-BR) — all UI strings, product names
8. Dark mode (CSS variables, `prefers-color-scheme` + manual toggle)
9. PWA manifest + install prompt
10. Admin: product management UI
11. Admin: user management UI
12. Performance audit (Lighthouse mobile)

---

## Critical Implementation Details

### Event Processor (backend/services/events.go)

Every event type must update the `list_items` materialized view atomically:

```go
// Pseudocode — implement each case
func ProcessEvent(tx *sql.Tx, event Event) error {
    switch event.Type {
    case "item.added":
        // Upsert into list_items (conflict on list_id+product_id → ignore)
        // Increment suggestion_weights_family and suggestion_weights
    case "item.checked":
        // UPDATE list_items SET checked=1, checked_by, checked_at
        // Insert into purchase_history
        // Trigger shelf order learning if store_id present
    case "item.unchecked":
        // UPDATE list_items SET checked=0
    case "item.deleted":
        // DELETE from list_items
    case "list.cleared":
        // DELETE from list_items WHERE list_id=? AND checked=1
    case "item.updated":
        // UPDATE list_items (quantity, unit, note, store_id, name_override)
    }
    return nil
}
```

### ULID Generation

Generate on the **client** so offline events have stable IDs:
```typescript
// frontend/src/lib/ulid.ts
import { monotonicFactory } from 'ulid'
export const ulid = monotonicFactory()
```

On the backend, validate that ULIDs are plausible (not in the future by more than 5 minutes).

### WebSocket Hub

```go
type Hub struct {
    // map[listID]map[connID]*Client
    rooms   map[string]map[string]*Client
    mu      sync.RWMutex
    register   chan *Client
    unregister chan *Client
    broadcast  chan BroadcastMsg
}

type BroadcastMsg struct {
    ListID  string
    Payload []byte
    Exclude string // connID to skip (sender)
}
```

After processing an event, the handler calls `hub.Broadcast(listID, eventJSON, senderConnID)`.

### Suggestions API

```go
func SearchProducts(db *sql.DB, query, locale string, listID string, userID string) ([]Suggestion, error) {
    // 1. FTS5 search
    // 2. LEFT JOIN suggestion_weights_family swf ON p.id = swf.product_id
    // 3. LEFT JOIN suggestion_weights sw ON p.id = sw.product_id AND sw.user_id = ?
    // 4. WHERE p.id NOT IN (SELECT product_id FROM list_items WHERE list_id = ?)
    // 5. ORDER BY (COALESCE(swf.frequency,0)*2 + COALESCE(sw.frequency,0)*3) * ... DESC
    // 6. LIMIT 6
}
```

### Offline Event Queue (frontend)

```typescript
// On any user action:
async function submitEvent(event: LocalEvent) {
  // 1. Apply optimistically to local Svelte store (immediate UI update)
  applyEventLocally(event)

  // 2. Try to send to server
  if (navigator.onLine) {
    try {
      await api.post(`/api/lists/${event.list_id}/events`, event)
      return
    } catch { /* fall through */ }
  }

  // 3. Queue for later
  await db.add('events_queue', event)
}

// On reconnect:
async function drainQueue(listId: string) {
  const pending = await db.getAllFromIndex('events_queue', 'list_id', listId)
  if (pending.length > 0) {
    await api.post(`/api/lists/${listId}/events`, { events: pending })
    await db.deleteBulk('events_queue', pending.map(e => e.id))
  }
  // Catch up from server
  const cursor = await db.get('sync_cursors', listId)
  const { events } = await api.get(`/api/lists/${listId}/events?since=${cursor ?? ''}`)
  events.forEach(applyEventLocally)
  if (events.length > 0) {
    await db.put('sync_cursors', events.at(-1).id, listId)
  }
}
```

### Session Handling

```go
// Use a simple signed cookie (no JWT needed for this use case)
// go get github.com/gorilla/securecookie
var store = securecookie.New(hashKey, blockKey)

type Session struct {
    UserID string
    Role   string
}
```

Environment variables for keys: `SESSION_HASH_KEY` (32 bytes), `SESSION_BLOCK_KEY` (32 bytes).

---

## Docker Compose Setup

```yaml
# docker-compose.yml (development)
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8080:8080"
    volumes:
      - ./data:/data
    environment:
      - DB_PATH=/data/tanteemma.db
      - SESSION_HASH_KEY=${SESSION_HASH_KEY}
      - SESSION_BLOCK_KEY=${SESSION_BLOCK_KEY}
      - OIDC_ISSUER_URL=${OIDC_ISSUER_URL}
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_REDIRECT_URL=${OIDC_REDIRECT_URL}
      - FRONTEND_URL=http://localhost:5173

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "5173:3000"
    environment:
      - PUBLIC_API_URL=http://localhost:8080
      - PUBLIC_WS_URL=ws://localhost:8080

# docker-compose.prod.yml adds:
#   litestream sidecar for backup
#   Traefik or Caddy for HTTPS
#   resource limits
```

```dockerfile
# Dockerfile.backend — multi-stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o tanteemma ./main.go

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/tanteemma /tanteemma
EXPOSE 8080
CMD ["/tanteemma"]
```

---

## Environment Variables Reference

```bash
# Required
DB_PATH=/data/tanteemma.db
SESSION_HASH_KEY=<32-random-bytes-hex>
SESSION_BLOCK_KEY=<32-random-bytes-hex>
OIDC_ISSUER_URL=https://auth.yourdomain.com/application/o/tanteemma/
OIDC_CLIENT_ID=tanteemma
OIDC_CLIENT_SECRET=<secret>
OIDC_REDIRECT_URL=https://shopping.yourdomain.com/auth/callback

# Optional
PORT=8080                          # default 8080
LOG_LEVEL=info                     # debug|info|warn|error
FRONTEND_URL=https://shopping.yourdomain.com
MAX_UPLOAD_SIZE=5242880            # 5MB, for future avatar uploads
LITESTREAM_REPLICA_URL=s3://bucket/tanteemma  # if using Litestream
```

---

## Code Conventions

### Go
- Error wrapping: `fmt.Errorf("processEvent: %w", err)`
- No global state except the DB pool and WS hub (passed via dependency injection)
- Handlers return early on error, use `http.Error` for client errors
- All DB operations in transactions when they touch multiple tables
- Use `context.Context` for cancellation on all DB and HTTP calls
- Test files: `_test.go` suffix, use `testing` stdlib only

### SvelteKit / TypeScript
- Strict TypeScript (`"strict": true`)
- No `any` — use `unknown` and type guards
- Svelte stores for shared state, component-local `let` for UI state
- API calls only in `+page.ts` load functions or event handlers, never in `onMount`
- CSS: use design token variables from `app.css`, no hardcoded colors in components
- All user-visible strings go through `$_('key')` from svelte-i18n — no hardcoded UI text

### Git
- Branch strategy: `main` (prod), `dev` (default), feature branches
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`)

---

## Starting Prompt for New Claude Code Session

Use this when starting implementation:

```
You are implementing TanteEmma, a self-hosted family shopping list PWA.
Read SPEC.md and CLAUDE.md completely before writing any code.

We are currently working on Phase [1/2/3].
The next task is: [specific task from the phase list].

Key constraints:
- Backend: Go, Chi router, modernc.org/sqlite (no CGO)
- Frontend: SvelteKit with TypeScript
- No external services except OIDC provider
- All mutations go through the event log
- Touch targets minimum 48px, list items 56px height

Current working state: [describe what exists so far]
```

---

## Known Complexity Areas

1. **FTS5 + scoring in one query** — test with EXPLAIN QUERY PLAN, add indexes as needed
2. **WebSocket hub under load** — use `sync.RWMutex` carefully, benchmark with 10 concurrent connections
3. **@zxing/browser on iOS Safari** — test early, WebRTC camera permissions are finicky
4. **IndexedDB + SvelteKit SSR** — guard all `idb` calls with `if (browser)` from `$app/environment`
5. **OIDC with Authentik** — Authentik uses non-standard scopes sometimes; test `openid profile email` explicitly
6. **SQLite WAL + Litestream** — Litestream needs `_journal_mode=WAL` and `_busy_timeout=5000`; set in DB connect string

---

## Frontend Migration: Svelte → React

> The frontend is being migrated from SvelteKit to React so the UI interoperates
> cleanly with **Claude Design** (which emits React). **The Go backend and its API
> contracts do not change** — match request/response shapes, routes, auth, and
> errors exactly. If the API seems to need a change, stop and ask. Plan of record:
> `docs/REACT_MIGRATION.md`. A working, validated proof-of-concept lives in
> `frontend-poc/` (throwaway — see below).

### Target stack (validated by the PoC)

- **Vite + React 18 + TypeScript** — client-rendered SPA (mirrors today's runtime). Strict TS, no `any`.
- **React Router** — replaces SvelteKit file routing (9 routes incl. dynamic `lists/:id`).
- **Zustand** — replaces Svelte `writable` stores (~1:1).
- Keep the hand-rolled **`api.ts`** fetch wrapper (`credentials: 'include'`); don't add react-query.
- **react-i18next** — replaces `svelte-i18n`; locale JSON (de/en/pt-BR) reused verbatim, `$_()` → `t()`.
- **vite-plugin-pwa (Workbox)** — replaces SvelteKit `$service-worker`.
- **@zxing/browser** (scanner) and **@dnd-kit/core** (shelf-order DnD) — unchanged / new respectively.
- **NOT Next.js** (SSR/RSC is needless surface here).
- **Styling: CSS custom-property tokens, NOT Tailwind.** Deliberate. Claude Design
  emits inline `style={{}}` referencing CSS vars (`var(--accent)`, `var(--surface-base)`,
  …), not utility classes. Adopting Tailwind would mean converting every generated
  component — the opposite of frictionless handoff. Do not "fix" this back to Tailwind.

### Design tokens (single source of truth)

- The authoritative token values are in `frontend/design-ref/` — the `<style>` block of
  `TanteEmma.html` (surfaces, borders, text, shadows, light/dark) plus the 5-theme accent
  registry in `themes.jsx`. These **supersede** the hex tables in `SPEC.md`/`UI_DESIGN.md`
  (design-ref uses warmer, purple-tinted neutrals).
- Ported in the PoC to `frontend-poc/src/styles/tokens.css` (verbatim) + `lib/themes.ts`.
- `--accent` / `--accent-600` are injected inline on the `.app` element per active theme;
  everything else lives in `.app` / `.app[data-theme="dark"]`.
- **Promoted "Tweaks":** only **light/dark/system** + the **5-theme accent picker** are real,
  persisted product features. The design-ref's other knobs (type weight/scale, header
  plain/gradient, the third "card" item view) are design-exploration scaffolding — dropped.
  Keep **List + Tiles** views only (SPEC parity).

### Svelte → React mapping

| Svelte | React | Notes |
|---|---|---|
| `routes/**/+page.svelte` | React Router routes + page components | 9 routes; `lists/[id]` is the hardest |
| `+layout.svelte` + `onMount` auth check | root layout + route guard + `useAuth` effect | |
| `lib/stores/*.ts` (`writable`) | Zustand stores / local hooks | small surface |
| `lib/offline/*.ts`, `ws.ts`, `api.ts`, `ulid.ts` | copy ~verbatim (plain TS) | swap `$env/dynamic/public`→`import.meta.env`, `$app/environment` `browser` guards |
| `lib/offline/applyEvent.ts` (+ its test) | copy verbatim — pure reducer | the one real test; keep green |
| `$_()` / svelte-i18n | `t()` / react-i18next | locale JSON reused |
| `$service-worker` | vite-plugin-pwa | |
| Svelte reactivity (`$:`) | `useMemo`/derived selectors | |

### Backend API facts the frontend must honor (verified against handlers)

- **Auth is the `session` cookie** (HttpOnly), set by `/auth/callback`. REST uses
  `credentials:'include'`; **WS authenticates via the same cookie** (no `?token=` — SPEC §5.2
  is stale). WS sends a `hello` frame with `conn_id`; echo it as **`X-Conn-ID`** on event
  POSTs so the hub skips your own broadcast. `GET /api/auth/me` → current user; 401 = anon.
- `GET /api/lists/:id` → `{ list, items }`. Items include `display_name`, `category_id`,
  `category_color`, `category_icon`, `store_id`, `quantity`, `unit`, `checked` — but **no
  category name, no store name, no brand**. Resolve names via `GET /api/categories`
  (`{id,name_de,name_en,icon,color}`, no `sort_order`) and `GET /api/stores`.
- `GET /api/lists/:id/members` → `[{user_id,name,avatar_url,is_owner}]`, the roster
  (owner + shared users), readable by **anyone with list access** — used for the
  overview member-avatar stacks. (Added during the migration with approval; share
  *management* `POST/DELETE /api/lists/:id/share` stays owner/admin-only. The latter's
  `GET .../share` is still owner/admin-gated and is used by the list detail share sheet.)
- Events: `POST /api/lists/:id/events` accepts a single event or `{events:[...]}`; server
  fills `id`/`list_id`/`user_id`/`server_ts`. `item.checked` payload = `{item_id, store_id?}`.
  Child role may only send `item.added`/`item.checked`/`item.unchecked` (else 403).
- **Remote `item.added` over WS carries only `{item_id, product_id}`** (no name) for product
  adds → enrich on receipt via `GET /api/products/:id` (the PoC does this in `useList`).
- Errors are `{ "error": "..." }` with appropriate status (401/403/404/422/500).
- Timestamps are **milliseconds**.

### Claude Design integration workflow (repeatable handoff)

A generated component must, to drop in cleanly:
1. **Be presentational** — receive data via props; **no `fetch`/`api`/store access inside**.
   API calls live in hooks (`hooks/use*.ts`) or the page/route component, never in a
   presentational component.
2. **Use tokens** — no hardcoded hex/spacing; reference `var(--*)` (or values resolved from
   `lib/themes.ts` / `categories.ts`). Inline `style={{}}` is fine and expected.
3. **File/folder layout** — presentational pieces in `src/components/`, screens in
   `src/screens/` (or route components), hooks in `src/hooks/`, contract types in
   `src/lib/types.ts`, adapters in `src/lib/viewmodel.ts`. PascalCase component files.
4. **Types** — props typed; data shapes come from `src/lib/types.ts` (which mirrors the Go
   structs). Map backend rows → component props with a `viewmodel` adapter, not ad hoc.

When pasting a new component from Claude Design:
1. Drop the file into `src/components/` (or `screens/`), PascalCase name.
2. Replace any hardcoded colors/spacing with `var(--*)` tokens; delete demo/mock data.
3. Define/extend a `*VM` view-model + adapter in `lib/viewmodel.ts`; type props from `lib/types.ts`.
4. Move any data access out into a hook; pass data + callbacks down as props.
5. Wire events through the events API (`useList.submit`) — optimistic apply, `X-Conn-ID`, WS.
6. Swap the Svelte equivalent at its route; delete the `.svelte` file once parity is confirmed.
7. Verify parity: visual (vs `design-ref/screenshots-ref/`), behavior, i18n (de/en/pt-BR),
   light + dark, and the real-time/offline paths.

### The PoC (`frontend-poc/`)

Throwaway standalone Vite-React app proving the riskiest paths against the **live backend**:
OIDC login, load list, optimistic check/add/delete/edit, live product search, and real-time
WS sync (incl. product-add enrichment) — at full design fidelity. **Not** the production app
(no router, no offline/IndexedDB, no i18n, no PWA; one screen + minimal overview). Run notes
and findings in `frontend-poc/README.md`. The real migration reuses its lib/components patterns
but lands in `frontend/`. Delete `frontend-poc/` once the real migration absorbs it.
