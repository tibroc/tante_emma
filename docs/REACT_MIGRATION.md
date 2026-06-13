# Svelte → React Frontend Migration Plan

> Honest assessment. Written after a failed attempt to re-skin the SvelteKit
> frontend with Claude Design's output. The conclusion of that attempt: getting
> the *exact* Claude Design look is dragging because the design is authored as
> React, and porting it into Svelte is a manual re-implementation per component,
> not the "near-mechanical" job that was claimed. Migrating the frontend to
> React makes the design drop in natively and unlocks `/design-sync`.
>
> This document does **not** sugar-coat the cost. Read the Risks and Estimate
> sections before committing.

## Scope (measured)

| Area | Files | ~LOC | Migration nature |
|---|---|---:|---|
| Route pages | 9 (`routes/**/+page.svelte`) | 3,219 | **Rewrite** (biggest lift) |
| Components | 9 (`lib/components/*.svelte`) | 1,505 | **Rewrite** (design drops in here) |
| Offline/sync | 5 (`lib/offline/*.ts`) | 424 | **Mostly carries over** (plain TS) |
| i18n + locales | de/en/pt-BR JSON + wiring | 504 | Data carries; wiring rewritten |
| Stores | 4 (`lib/stores/*.ts`) | 78 | Rewrite (small) |
| `api.ts`, `ws.ts`, `ulid.ts` | 3 | ~250 | **Mostly carries over** (plain TS) |
| **Backend (Go)** | — | — | **No change.** REST+WS API is framework-agnostic |

Total frontend ≈ **5,500 LOC**. The backend, event model, OIDC, and DB are all
reused as-is — that is the single biggest thing keeping this from being a
ground-up rewrite.

## Target stack

Mirror the current architecture (client-rendered SPA, client-side auth, fetch +
WebSocket, reactive stores) to minimise conceptual translation:

- **Vite + React 18 + TypeScript** — SPA, same as today's effective runtime.
- **React Router** — replaces SvelteKit file routing (9 routes, one dynamic `[id]`).
- **Zustand** — replaces Svelte stores (`writable`) almost 1:1; minimal surface.
- **@tanstack/react-query** *(optional)* — for server cache; or keep the existing
  hand-rolled fetch in `api.ts`. Recommend keeping `api.ts` to reduce churn.
- **react-i18next** — replaces `svelte-i18n`; locale JSON reused verbatim.
- **vite-plugin-pwa (Workbox)** — replaces SvelteKit's `$service-worker`.
- **@zxing/browser** — unchanged (already framework-agnostic) for the scanner.
- A drag-and-drop lib (**@dnd-kit/core**) for the shelf-order editor.
- Serve via a small Node/static server in the existing `Dockerfile.frontend`
  shape; the Go backend and compose topology are unchanged.

**Deliberately NOT Next.js** — its SSR/RSC model is a much larger migration
surface than this client-rendered app needs, and adds risk for no benefit here.

## What carries over with little change

- `lib/offline/applyEvent.ts` — pure reducer, **copies verbatim** (and its
  vitest test comes along — the one piece of real test coverage).
- `lib/offline/db.ts`, `eventQueue.ts`, `sync.ts` — IndexedDB (`idb`) logic is
  framework-agnostic; only the `$app/environment` `browser` guard and any store
  imports change.
- `lib/ws.ts` — WebSocket client is plain TS; re-wire its subscribe/reconnect
  into React effects, but the protocol logic is reusable.
- `lib/api.ts`, `lib/ulid.ts` — copy; swap `$env/dynamic/public` for
  `import.meta.env`.
- Locale JSON (de/en/pt-BR) — reused; only the `$_()` call sites change to `t()`.

## Work breakdown (sequenced)

1. **Scaffold + build/deploy/PWA/env parity.** Vite React TS project; wire
   `import.meta.env` for `PUBLIC_API_URL`/`PUBLIC_WS_URL`; reproduce the PWA
   manifest + service worker; update `Dockerfile.frontend`. *Fiddly — this is
   where we already lost time (env, service worker, container perms).*
2. **Routing + root layout + auth gate.** 9 routes; the bottom-nav layout; the
   `onMount` auth-check/redirect → a route guard + effect.
3. **Framework-agnostic lib port + Zustand stores + tests.** Bring over
   offline/ws/api/ulid; port 4 stores; get `applyEvent` test green.
4. **i18n.** react-i18next setup; migrate every `$_()` to `t()`.
5. **Components (9).** Rebuild in React — this is where Claude Design output
   lands natively. Re-wire BarcodeScanner, the bottom sheets, presence.
6. **Pages (9).** The bulk. `lists/[id]` (~600 LOC: event submission, WS
   subscribe, offline queue, optimistic UI, sort/filter, detail + share sheets)
   is the hardest and riskiest single file. Then stores (drag-drop shelf order),
   admin (products/users), history, settings, login, overview.
7. **Real-time + offline/sync integration.** Wire WS + IndexedDB drain +
   optimistic updates into React lifecycle. Subtle; expect debugging.
8. **Visual fidelity pass / Claude Design integration** (optionally via
   `/design-sync`).
9. **Parity testing, bug-fixing, deploy.**

## Risks (read this part)

- **The offline + real-time + optimistic-UI triad is the hard part**, not the UI.
  Re-implementing event submission, the offline queue drain on reconnect, and
  optimistic store updates correctly in React is where subtle, hard-to-reproduce
  bugs live. Current automated coverage is thin (only `applyEvent`), so
  regressions can go unnoticed (this is exactly TD-8).
- **WebSocket lifecycle in React** is a classic footgun: StrictMode double-mounts
  effects, reconnect/cleanup races, subscribing twice. The Svelte version already
  had a subscribe race we fixed once; React reintroduces the whole class.
- **PWA/service-worker caching** bit us this session and will bite again —
  framework migration does not fix it. Same for env config and container rebuilds.
- **Drag-and-drop shelf-order editor** is a genuine re-implementation with a new
  library and its own touch/pointer edge cases.
- **i18n regressions** across three languages are easy to introduce in a 9-page,
  9-component sweep.
- **Long-lived branch / dual frontends.** During migration you either freeze
  feature work or maintain two frontends. A 5,500-LOC rewrite is not a
  weekend; expect the branch to live for a while.
- **"Claude Design output is React" is necessary but not sufficient.** The
  generated components still need wiring to real data, handlers, i18n, and the
  event model. React lowers the *impedance* versus Svelte, but the integration
  work itself remains — do not expect drag-and-drop-and-done.
- **`/design-sync` is itself a heavy workflow** (its own docs describe a
  high-fidelity sync that can take hours and burns significant tokens). It is a
  payoff of going React, but not a cheap one.
- **My estimate could be wrong on the high side.** Given how this session went,
  treat the upper bound as the planning number, not the lower.

## What migrating does NOT improve

- The slow rebuild/test loop (container builds, podman, browser/SW cache).
- Environment/secret/URL configuration friction.
- The need to actually verify fidelity visually each iteration.

These dominated the wasted effort this session and are framework-independent.

## Effort estimate (Claude Pro sessions)

A "session" here = one focused working block / context window — roughly a few
hours of work before usage limits or context compaction force a break. This is
fuzzy; Pro limits vary by window.

**Critically: the cost is dominated by the iterate → rebuild → inspect → debug
loop, not by generating code.** That loop is what made this session expensive,
and it applies to React too.

| Phase | Sessions |
|---|---:|
| Scaffold, build/deploy, PWA, env parity | 1–2 |
| Routing, layout, auth gate | 0.5–1 |
| Lib/stores/offline port + tests | 1–1.5 |
| i18n | 0.5–1 |
| Components (9) | 1.5–2.5 |
| Pages (9), incl. `lists/[id]`, DnD, admin | 3–5 |
| Real-time + offline/sync integration + debug | 1–2 |
| Visual fidelity / Claude Design integration | 1–2 |
| Parity testing, bug-fixing, deploy | 1–2 |
| **Subtotal** | **~11–18** |
| Friction buffer (env, SW, rebuilds, missteps) +30–50% | +4–9 |
| **Realistic total** | **~18–25 sessions** |

Plan for **~20 sessions**. A clean run might land near 15; if the
offline/real-time/PWA integration fights back (likely, based on this codebase),
25–30 is plausible. Anyone who tells you "a few sessions" is repeating the
mistake that got us here.

## Strong recommendation before committing

Do **not** start a 20-session rewrite on faith. First spend **1–2 sessions on a
throwaway React proof-of-concept**: a standalone Vite-React app rendering the
`lists/[id]` screen with Claude Design components, wired to the **real backend**
(login + load a list + check an item over the live API/WS). That single screen
exercises auth, fetch, WebSocket, optimistic update, and design fidelity — the
riskiest pieces — and produces the visible, working artifact this effort still
lacks. If that PoC convinces you, commit to the full migration with eyes open. If
it doesn't, you've spent 1–2 sessions instead of 20.
