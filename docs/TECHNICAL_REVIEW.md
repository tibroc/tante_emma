# TanteEmma — Technical Review

> Date: 2026-06-11
> Scope: full codebase (backend Go ~2.0k LOC, frontend SvelteKit ~4.6k LOC)
> Reviewer: code review pass over handlers, services, middleware, schema, stores,
> offline sync, WebSocket layer, and components.

This document inventories **security issues**, **bugs**, and **technical debt**,
then proposes a prioritized remediation plan. Each finding has a stable ID so it
can be referenced in commits/issues (e.g. `fix: BUG-1 shelf-order learning`).

---

## Severity legend

| Severity | Meaning |
|----------|---------|
| 🔴 High   | Broken feature, data loss, or exploitable security gap. Fix soon. |
| 🟠 Medium | Wrong behaviour in a real scenario, or defense-in-depth gap. Fix this cycle. |
| 🟡 Low    | Cosmetic, perf, or convention drift. Fix opportunistically. |

Effort is a rough estimate: **S** (<1h), **M** (half day), **L** (1+ day).

---

## 1. Security

### SEC-1 ✅ ~~Child role is not enforced on the backend~~ RESOLVED (Milestone A)
**Where:** `backend/handlers/items.go` `SubmitEvents`, all event types.
**What:** The events endpoint authorizes only via `canAccessList`. The "child"
role is restricted **only in the UI** (`+page.svelte` hides the share/clear/create
buttons). A child account — or anyone replaying requests — can `POST
/api/lists/{id}/events` to add, check, delete items, or `list.cleared` directly.
Stores/products already check `RoleChild` server-side; events do not.
**Impact:** The role model is bypassable for the core mutation path. For a family
app the blast radius is small, but it contradicts the stated Phase 3 goal
("child role enforcement") and is a defense-in-depth hole.
**Fix:** Decide per-event-type what a child may do (likely: add + check yes;
delete + clear + share no) and enforce in `SubmitEvents` using `sess.Role`.
Centralize the rule so UI and backend can't drift. **Effort: M**

### SEC-2 ✅ ~~Last-admin lockout via role change~~ RESOLVED (Milestone A)
**Where:** `backend/handlers/users.go` `UpdateRole`.
**What:** An admin can demote the only admin (including themselves) to
member/child. There is no "at least one admin must remain" guard.
**Impact:** Irrecoverable loss of admin access (no admin UI to fix it; would
require manual DB surgery). The "first user becomes admin" logic only fires when
the users table is empty, so it won't self-heal.
**Fix:** In `UpdateRole`, if the target is currently admin and the new role is
not admin, count remaining admins (`SELECT COUNT(*) FROM users WHERE role='admin'
AND id != ?`) and reject with 409 if it would reach zero. **Effort: S**

### SEC-3 ✅ ~~Internal error strings leaked to clients~~ RESOLVED (quick-win PR)
**Where:** `backend/handlers/items.go` —
`respondErr(w, http.StatusUnprocessableEntity, err.Error())`.
**What:** Raw `error` text (which wraps SQL/marshal details) is returned in the
JSON body.
**Impact:** Information disclosure about internal structure; minor but avoidable.
**Fix:** Return a generic message to the client; log the detailed error
server-side. **Effort: S**

### SEC-4 🟡 Barcode path parameter is not validated before OFF lookup
**Where:** `backend/handlers/products.go` `GetByBarcode` →
`services.LookupBarcode` builds `fmt.Sprintf("%s/%s.json", base, barcode)`.
**What:** `barcode` comes straight from the URL path into an outbound URL with no
validation that it is digits only.
**Impact:** Low (chi won't pass slashes by default and the host is fixed), but a
crafted value could append query params or path segments to the OFF request.
**Fix:** Reject `barcode` that isn't `^[0-9]{6,14}$` before the lookup.
**Effort: S**

### SEC-5 🟡 No rate limiting / request body size cap
**Where:** `backend/main.go` (router), `config.MaxUploadSize` (defined, unused).
**What:** No `http.MaxBytesReader` on JSON bodies and no rate limiting on auth or
the OFF proxy. `MaxUploadSize` is read from config but never applied.
**Impact:** Low for a single-family deployment, but an authenticated client can
post arbitrarily large event batches, and the OFF proxy can be used as an
unthrottled outbound requester.
**Fix:** Wrap bodies in `http.MaxBytesReader`; add a lightweight per-IP limiter
(e.g. `golang.org/x/time/rate`) on `/auth/*` and `/api/products/barcode/*`.
**Effort: M**

### SEC-6 🟡 Member directory exposed to all roles
**Where:** `backend/handlers/users.go` `GetMembers`.
**What:** Any authenticated user (including child) can list every user's id, name
and avatar. (Email is not exposed here — `GetAll` which includes email is
admin-gated, that part is fine.)
**Impact:** Minor privacy; acceptable for a family but worth a conscious decision.
**Fix:** If undesired, restrict `GetMembers` to non-child or to owners performing
a share action. **Effort: S**

**Notes — things that are correctly handled** (so they're not re-litigated):
OIDC `state` + `nonce` are validated; session cookie is `HttpOnly` + `SameSite=Lax`
+ auto-`Secure`; role is re-read from DB each request (revocation works);
WebSocket handshake checks `Origin` against an allowlist; CORS is origin-allowlisted
with credentials; `canAccessList` gates list/event/WS access; SQL uses parameterized
queries throughout; FTS input is escaped. CSRF is mitigated by `SameSite=Lax`
(no token, but cross-site POST is blocked) — acceptable, document it.

---

## 2. Bugs

### BUG-1 ✅ ~~Auto-learned shelf order never works~~ RESOLVED (Milestone A)
**Where:** `backend/services/events.go` `processListCleared` →
`backend/services/shelforder.go` `LearnShelfOrder`.
**What:** Two compounding problems:
1. `processListCleared` runs `DELETE FROM list_items WHERE list_id=? AND
   checked=1` **first**, then spawns `LearnShelfOrder`. But `LearnShelfOrder`
   joins `item.checked` events to `list_items` (`JOIN list_items li ON li.id =
   JSON_EXTRACT(e.payload,'$.item_id')`) to reach the category — and those rows
   were just deleted. The join yields zero rows, so nothing is ever learned.
2. It is launched as a fire-and-forget `go func()` using the package-global DB
   while the request transaction is still open. With `SetMaxOpenConns(1)` the
   goroutine blocks on the single connection until the request commits, then
   reads already-committed (post-delete) state. The returned error is discarded.
**Impact:** The "auto-learned shelf order" feature (Phase 3) is silently
non-functional. No crash, just no effect.
**Fix:** Resolve categories **before** deleting, or derive them from the events
themselves joined to `products` (not `list_items`). Run the learning inside the
same transaction (pass `tx`), or capture the needed category list before the
delete and pass it to the learner. Log the error instead of dropping it.
**Effort: M**

### BUG-2 ✅ ~~Deleting a list or store fails silently~~ RESOLVED (Milestone A)
**Where:** `backend/handlers/lists.go` `Delete`, `backend/handlers/stores.go`
`Delete`. Schema: `backend/db/migrations/001_initial.sql`.
**What:** `_foreign_keys=on` is set, but no child table uses `ON DELETE CASCADE`.
`list_items`, `events`, `list_shares`, `purchase_history` all reference
`lists(id)`; `list_items.store_id`, `store_shelf_order`, `purchase_history`,
`product_stores` reference `stores(id)`. `DELETE FROM lists/stores` therefore
fails with a FK constraint violation whenever children exist — and both handlers
**ignore the error** (`_, _ = h.DB.Exec...`) and return `204 No Content`.
**Impact:** Users think a list/store was deleted; it silently remains. Data and
UI drift.
**Fix:** Either add `ON DELETE CASCADE` (requires a migration that rebuilds the
tables — SQLite can't alter FK actions in place) or delete children explicitly in
a transaction (events, list_items, list_shares, purchase_history, then the list).
Check and surface the error. Prefer explicit transactional delete to keep control
over purchase_history retention. **Effort: M**

### BUG-3 ✅ ~~Sender receives its own broadcast (X-Conn-ID is dead code)~~ RESOLVED (Milestone B)
**Where:** `backend/handlers/items.go` (`connID := r.Header.Get("X-Conn-ID")`),
`backend/ws/hub.go` (`Exclude`), `backend/handlers/ws.go` (server-generated
`Client.ID`), `frontend/src/lib/api.ts` (never sends the header).
**What:** The broadcast exclusion relies on the HTTP request carrying the client's
WebSocket connection id in `X-Conn-ID`. The frontend never sends it, and the
client never learns its server-assigned `Client.ID` anyway. So `Exclude` is
always `""` and every event is echoed back to the originating client/tab.
Also: `X-Conn-ID` isn't in the CORS `Access-Control-Allow-Headers` list, so even
if the frontend tried to send it cross-origin the preflight would reject it.
**Impact:** Redundant echo traffic and reliance on client-side idempotency to
avoid duplicate UI updates (currently it happens to be idempotent, so no visible
dup — but it's fragile and wasteful).
**Fix:** Make the connection id real end-to-end: have `/ws` send the assigned
`Client.ID` as a first message, store it client-side, send it as `X-Conn-ID`
(and add it to allowed CORS headers). Or drop the mechanism entirely and rely on
event-id idempotency. Pick one; don't leave it half-wired. **Effort: M**

### BUG-4 ✅ ~~Scanned Open Food Facts products are never persisted~~ RESOLVED (Milestone C)
**Where:** `backend/handlers/products.go` `GetByBarcode`,
`backend/services/openfoodfacts.go`.
**What:** A successful OFF lookup is returned to the client but never inserted
into `products`. The returned object has no `id`. So a scanned item can't be
added with a stable `product_id`, suggestions won't learn it, and every scan
re-hits the network.
**Impact:** Barcode scanning is effectively read-only and doesn't integrate with
the catalogue/suggestions.
**Fix:** On a successful OFF lookup with no local match, insert a `products` row
(`source='openfoodfacts'`, generated ULID, `off_id`) and return it with its id.
Map multilingual names/category where possible (the existing `TODO`). **Effort: M**

### BUG-5 ✅ ~~Offline-synced items lose category/store metadata~~ RESOLVED (Milestone B)
**Where:** `frontend/src/lib/offline/sync.ts` `applyEventLocally` vs
`frontend/src/routes/lists/[id]/+page.svelte` `applyEvent`.
**What:** There are **two** divergent event-apply implementations. The list-page
one carries `category_id`; the offline-sync one does not (it omits `category_id`,
`store_id`, `note`, etc. on `item.added`). Items materialized through the offline
sync path therefore can't sort by store until a full reload.
**Impact:** Inconsistent UI after offline catch-up; store-sort silently wrong for
those rows.
**Fix:** Extract a single shared `applyEvent(items, event)` reducer used by both
paths, carrying the full payload. **Effort: M**

### BUG-6 ✅ ~~pt-BR suggestions show the German category name~~ RESOLVED (quick-win PR)
**Where:** `backend/services/suggestions.go` `SearchProducts` scan loop.
**What:** `localeName` selects `name_pt` for the product, but the category-name
assignment `switch locale { case "en": ... default: NameDe }` has no `pt`/`pt-BR`
case, so the Portuguese UI gets German category names.
**Impact:** Minor i18n correctness bug.
**Fix:** Add `case "pt","pt-BR": s.Category.NamePt = catName`. Better: select the
localized category column in SQL like the product name already does. **Effort: S**

### BUG-7 ✅ ~~Repeat purchases of the same item aren't recorded~~ RESOLVED (quick-win PR)
**Where:** `backend/services/events.go` `processItemChecked`.
**What:** `purchase_history.id` is derived as `fmt.Sprintf("%s_ph", itemID)` with
`INSERT OR IGNORE`. Checking the same `list_items` row again (after uncheck, or
re-add with same id) is ignored, so only the first purchase is ever recorded.
**Impact:** Purchase history undercounts; suggestion learning loses signal.
**Fix:** Use a unique id per check event (e.g. the event ULID) instead of an
item-derived id. **Effort: S**

### BUG-8 ✅ ~~Unguarded `JSON.parse` in the WebSocket client~~ RESOLVED (quick-win PR)
**Where:** `frontend/src/lib/ws.ts` message handler.
**What:** `JSON.parse(e.data)` is not wrapped; a malformed frame throws inside the
event listener (uncaught).
**Impact:** Low (server only sends valid JSON), but a single bad frame would throw.
**Fix:** Wrap in try/catch and ignore unparseable frames. **Effort: S**

### BUG-9 ✅ ~~Shelf-order default position mismatch (frontend 999 vs backend 9999)~~ RESOLVED (Milestone E)
**Where:** frontend `+page.svelte` `sortedItems` uses `999`; backend
`stores.go GetShelfOrder` uses `9999`. Functionally both push to the end, but the
inconsistency is a latent foot-gun if either is ever compared against the other.
**Fix:** Define one constant and reuse. **Effort: S**

---

## 3. Technical Debt

### TD-1 ✅ ~~i18n convention not followed (hardcoded German strings)~~ RESOLVED (Milestone C)
**Where:** `frontend/src/routes/lists/[id]/+page.svelte` (toasts, "Lade…",
"Liste ist leer", "Einkauf bei:", aria-labels), `+layout.svelte` (install/offline
banners), `admin/*`, parts of `settings`. CLAUDE.md mandates all user-visible text
go through `$_('key')`, and the `de/en/pt-BR.json` bundles already exist.
**Impact:** English/Portuguese users see German; convention drift; the i18n
infra is built but only partially used.
**Fix:** Sweep components, move strings into the locale bundles, replace with
`$_()`. **Effort: L**

### TD-2 ✅ ~~Two divergent client-side event reducers~~ RESOLVED (Milestone B)
See BUG-5. Beyond the metadata bug, maintaining two copies guarantees future
drift. Consolidate into `frontend/src/lib/offline/applyEvent.ts`. **Effort: M**

### TD-3 ✅ ~~`SetMaxOpenConns(1)` serializes all DB access~~ RESOLVED (Milestone E — also fixed broken modernc DSN pragma syntax)
**Where:** `backend/db/db.go`.
**What:** A single connection forces every read to queue behind writes. WAL mode
supports concurrent readers; the limit is only needed for writers.
**Impact:** Avoidable latency under concurrent use; also it is what makes BUG-1's
goroutine block on the open transaction.
**Fix:** Use a small pool (e.g. `SetMaxOpenConns(N)`) and serialize **writes**
another way, or keep 1 writer + a separate read-only `*sql.DB`. Validate with the
existing flows. **Effort: M**

### TD-4 ✅ ~~Package-global DB for shelf learning~~ RESOLVED (Milestone A — DB passed explicitly via dependency injection)
**Where:** `backend/services/events.go` `globalDB` + `SetDB`.
**What:** Contradicts the stated convention ("no global state except the DB pool
and WS hub, passed via dependency injection"). Hidden dependency, harder to test.
**Fix:** Pass the DB/handle explicitly (the events handler already has it).
**Effort: S**

### TD-5 ✅ ~~Debug `console.log` left in production code~~ RESOLVED (quick-win PR)
**Where:** ~10 occurrences across `ws.ts`, `lists/[id]/+page.svelte`,
`offline/eventQueue.ts`.
**Fix:** Remove or gate behind a `dev` flag (`import { dev } from
'$app/environment'`). **Effort: S**

### TD-6 ✅ ~~Dropped/ignored errors~~ RESOLVED (Milestone B)
**Where:** multiple `_, _ = h.DB.Exec(...)` (lists/stores delete, list updated_at),
discarded `LearnShelfOrder` error, swallowed `tx.Exec` results in events.
**Impact:** Failures are invisible (BUG-2 is a direct consequence).
**Fix:** Check and log/surface errors, especially on writes. **Effort: M**

### TD-7 ✅ ~~Dead/leftover code~~ RESOLVED (quick-win PR)
- `backend/handlers/stores.go`: `var _ = sql.ErrNoRows` import-keeper hack.
- `config.LogLevel` is parsed but never used (logging is always on via
  `chimw.Logger`); `config.MaxUploadSize` parsed but unused (see SEC-5).
**Fix:** Remove the hack (drop the unused import); either wire `LOG_LEVEL` into a
real logger or drop it from config + docs. **Effort: S**

### TD-8 🟡 Thin automated test coverage
**Where:** only `backend/handlers/auth_test.go` exists; no tests for the event
processor, suggestions, shelf-order, access control, or the offline sync reducer.
**Impact:** Regressions in the most logic-heavy areas (events, sync) go uncaught —
several bugs above would have been caught by unit tests.
**Fix:** Add table-driven tests for `services/events.go` and
`services/suggestions.go`, an access-control test for `canAccessList`, and a
reducer test for the consolidated `applyEvent`. **Effort: L**

### TD-9 ✅ ~~OFF integration is a stub~~ RESOLVED (Milestone C)
**Where:** `services/openfoodfacts.go` (`TODO`: multilingual names, category
mapping). Tied to BUG-4. Currently maps everything into `name_de` regardless of
locale and ignores categories. **Effort: M** (do together with BUG-4).

---

## 4. Prioritized remediation plan

Ordered for maximum risk reduction per unit effort. Group by PR where it makes
sense.

### ✅ Milestone A — correctness & data safety — COMPLETE
1. ✅ **BUG-2** list/store delete fails silently — 🔴 data integrity. *(M)*
2. ✅ **BUG-1** shelf-order learning broken — 🔴 dead feature. *(M)*
3. ✅ **SEC-1** enforce child role on events — 🔴 authorization. *(M)*
4. ✅ **SEC-2** last-admin lockout guard — 🟠 cheap, prevents lockout. *(S)*

### ✅ Milestone B — real-time & sync hardening — COMPLETE
5. ✅ **BUG-5 / TD-2** consolidate event reducer (fixes metadata loss) — 🟠. *(M)*
6. ✅ **BUG-3** fix or remove X-Conn-ID echo mechanism — 🟠. *(M)*
7. ✅ **BUG-8** guard WS `JSON.parse` — 🟡. *(S)* *(landed in quick-win PR)*
8. ✅ **TD-6** stop swallowing write errors (overlaps BUG-2). *(M)*

### ✅ Milestone C — features & polish — COMPLETE
9.  ✅ **BUG-4 + TD-9** persist OFF products + finish mapping — 🟠. *(M)*
10. ✅ **BUG-6** pt-BR category names — 🟡. *(S)* *(landed in quick-win PR)*
11. ✅ **BUG-7** repeat-purchase history — 🟡. *(S)* *(landed in quick-win PR)*
12. ✅ **TD-1** i18n string sweep — 🟠 (large but mechanical). *(L)*

### Milestone D — security & infra hardening — 🔲 OPEN
13. ✅ **SEC-3** stop leaking internal error strings — 🟡. *(S)* *(landed in quick-win PR)*
14. 🔲 **SEC-4** validate barcode input — 🟡. *(S)*
15. 🔲 **SEC-5** body size cap + basic rate limiting — 🟡. *(M)*
16. 🔲 **SEC-6** decide member-directory visibility — 🟡. *(S)*

### ✅ Milestone E — maintainability — COMPLETE
17. ✅ **TD-3** DB connection pooling + fixed modernc DSN pragma syntax. *(M)*
18. ✅ **TD-4** inject DB instead of global. *(S)* *(landed in Milestone A)*
19. ✅ **TD-5** remove debug logging. *(S)* *(landed in quick-win PR)*
20. ✅ **TD-7** remove dead config/code. *(S)* *(landed in quick-win PR)*
21. 🔲 **TD-8** add tests for events/suggestions/access/sync. *(L)*
22. ✅ **BUG-9** unify shelf-order default constant. *(S)*

### ✅ Suggested quick-win first PR — COMPLETE
`SEC-3`, `BUG-6`, `BUG-7`, `BUG-8`, `SEC-2`, `TD-5`, `TD-7` — all resolved in
a single low-risk cleanup PR.

---

## 5. Summary table

| ID | Sev | Area | One-liner | Effort | Status |
|----|-----|------|-----------|--------|--------|
| SEC-1 | 🔴 | Security | Child role not enforced on events endpoint | M | ✅ Milestone A |
| SEC-2 | 🟠 | Security | Last-admin can be demoted → lockout | S | ✅ Milestone A |
| SEC-3 | 🟠 | Security | Internal error text leaked to client | S | ✅ Quick-win PR |
| SEC-4 | 🟡 | Security | Barcode param unvalidated into outbound URL | S | 🔲 Open |
| SEC-5 | 🟡 | Security | No body-size cap / rate limiting | M | 🔲 Open |
| SEC-6 | 🟡 | Security | Member directory visible to all roles | S | 🔲 Open |
| BUG-1 | 🔴 | Bug | Auto shelf-order learning never works | M | ✅ Milestone A |
| BUG-2 | 🔴 | Bug | List/store delete fails silently (FK, swallowed error) | M | ✅ Milestone A |
| BUG-3 | 🟠 | Bug | X-Conn-ID echo-exclusion is dead code | M | ✅ Milestone B |
| BUG-4 | 🟠 | Bug | OFF scanned products never persisted | M | ✅ Milestone C |
| BUG-5 | 🟠 | Bug | Offline sync drops item category/store | M | ✅ Milestone B |
| BUG-6 | 🟡 | Bug | pt-BR category names show German | S | ✅ Quick-win PR |
| BUG-7 | 🟡 | Bug | Repeat purchases not recorded | S | ✅ Quick-win PR |
| BUG-8 | 🟡 | Bug | Unguarded JSON.parse in WS client | S | ✅ Quick-win PR |
| BUG-9 | 🟡 | Bug | Shelf-order default 999 vs 9999 mismatch | S | ✅ Milestone E |
| TD-1 | 🟠 | Debt | Hardcoded German strings (i18n unused) | L | ✅ Milestone C |
| TD-2 | 🟠 | Debt | Two divergent event reducers | M | ✅ Milestone B |
| TD-3 | 🟡 | Debt | MaxOpenConns(1) serializes all reads | M | ✅ Milestone E |
| TD-4 | 🟡 | Debt | Global DB for shelf learning | S | ✅ Milestone A |
| TD-5 | 🟡 | Debt | Debug console.log in prod | S | ✅ Quick-win PR |
| TD-6 | 🟡 | Debt | Ignored write errors | M | ✅ Milestone B |
| TD-7 | 🟡 | Debt | Dead config/code (LogLevel, MaxUploadSize, sql hack) | S | ✅ Quick-win PR |
| TD-8 | 🟡 | Debt | Thin test coverage | L | 🔲 Open |
| TD-9 | 🟡 | Debt | OFF integration is a stub | M | ✅ Milestone C |
</content>
</invoke>
