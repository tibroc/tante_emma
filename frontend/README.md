# TanteEmma — Frontend

React 18 + Vite + TypeScript SPA. Routing via React Router, state via Zustand,
i18n via react-i18next (de/en/pt-BR), PWA via vite-plugin-pwa. Styling uses CSS
custom-property design tokens (`src/styles/tokens.css`, from `design-ref/`) — no
Tailwind, since that's what Claude Design emits.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173
```

`npm run dev` proxies `/api`, `/auth`, and `/ws` to the Go backend on `:8080`, so
everything is same-origin (the session cookie and WebSocket just work). Run the
backend with `FRONTEND_URL=http://localhost:5173`,
`OIDC_REDIRECT_URL=http://localhost:5173/auth/callback`, `SECURE_COOKIES=false`
(see the repo root `.env.example`).

## Scripts

| Command                             | What                                      |
| ----------------------------------- | ----------------------------------------- |
| `npm run dev`                       | Vite dev server (+ backend proxy)         |
| `npm run build`                     | Type-check + production build → `dist/`   |
| `npm run start`                     | Serve the built `dist/` (sirv, port 3000) |
| `npm run test`                      | Vitest unit tests                         |
| `npm run lint` / `format` / `check` | ESLint / Prettier / `tsc --noEmit`        |

The SPA talks to the backend same-origin in production (behind the reverse
proxy); set `VITE_API_URL` / `VITE_WS_URL` at build time only for a cross-origin
deploy.

## Layout

```
src/
  lib/         api, ws, ulid, applyEvent (+test), offline queue/sync,
               themes, categories, viewmodel adapter, i18n, types
  stores/      Zustand stores (list, sync, user, theme)
  hooks/       useList (load + events + WS + offline), useTheme
  components/  Icon, item views, sheets, add bar, scanner, headers, layout
  pages/       login, lists overview, list detail, stores, history, settings, admin
```

## Claude Design integration

`design-ref/` is the visual source of truth. To wire in a generated component:
drop it in `components/`, swap hardcoded values for `var(--*)` tokens, type its
props from `lib/types.ts`, keep data-fetching in a hook (not the component), and
verify parity (visual, i18n, light/dark). Full conventions are in the root
`CLAUDE.md` → "Frontend Migration".
