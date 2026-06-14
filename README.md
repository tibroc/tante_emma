# 🛒 TanteEmma

A self-hosted family shopping-list PWA — fast, offline-capable, with real-time
sync and smart suggestions. Go backend + React PWA, single SQLite file, OIDC login.

## Self-hosting at home (Docker Compose)

The simplest reliable setup runs both services behind [Caddy](https://caddyserver.com)
on **one domain** with automatic HTTPS, using prebuilt images from GHCR (no local
build needed).

**You'll need**

- Docker + Docker Compose
- A domain name pointing at your server (Caddy fetches a free Let's Encrypt cert)
- An **OIDC login provider** — there is no password login. Use one you run
  (Authentik, Keycloak, Pocket ID, Dex) or a public one (Google, GitHub). The
  first person to log in becomes the admin.

**Steps**

1. Clone this repo onto your server.
2. Create your env file and fill in the secrets:
   ```sh
   cp .env.example .env
   ```
   In `.env`, set the two session keys (`openssl rand -hex 32` each) and your
   `OIDC_*` values, and register `https://YOUR-DOMAIN/auth/callback` as a redirect
   URI in your OIDC provider.
3. Create `Caddyfile` and `docker-compose.caddy.yml` by copy-pasting from
   **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (swap in your domain + image owner).
4. Bring it up:
   ```sh
   docker compose -f docker-compose.caddy.yml up -d
   ```
5. Open `https://YOUR-DOMAIN`, log in — you're the admin. Add family members and
   assign their roles in **Settings**.

**Data & backups:** all state is one SQLite file in the `tanteemma-data` volume.
An optional Litestream sidecar streams continuous backups to S3-compatible storage.

## Local development

Run the backend (Go) and `cd frontend && npm run dev` — see
**[frontend/README.md](frontend/README.md)** for the dev workflow and
**[.env.example](.env.example)** for local env values. The root `docker-compose.yml`
is a dev convenience and expects a same-origin reverse proxy for real use.

## Docs

- **[SPEC.md](SPEC.md)** — product spec, data model, API
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — production Caddy + Compose setup
- **[CLAUDE.md](CLAUDE.md)** — architecture & conventions
