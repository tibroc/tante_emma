# Production Deployment — Caddy + Docker Compose

A minimal production setup that puts [Caddy](https://caddyserver.com) in front of
the two TanteEmma services on a **single domain**, with automatic HTTPS and two
segmented Docker networks.

## Topology

```
                         ┌──────── proxy network ────────┐
   Internet ── 443 ──►  Caddy ──► frontend  (SvelteKit, :3000)
                          │   └──► backend   (Go API,    :8080)
                          │                       │
                          └───────────────────────┼─ backend network ─┐
                                                   └──► litestream (backups)
```

- **Caddy** is the only container with published ports. It terminates TLS and
  path-routes every request to one of the two app services.
- **backend** serves `/api/*`, `/auth/*` (the OIDC flow) and `/ws` (WebSocket).
- **frontend** serves everything else (the SvelteKit app shell + SSR).
- Because everything is on **one origin**, the browser talks to
  `https://shopping.example.com/api/...` and `wss://shopping.example.com/ws`;
  Caddy forwards those to the backend. No CORS, one certificate.

### Why two networks

| Network   | Members                      | Purpose                                                     |
|-----------|------------------------------|------------------------------------------------------------|
| `proxy`   | caddy, frontend, backend     | The public-facing tier Caddy routes into.                  |
| `backend` | backend, litestream          | The data/backup tier. Caddy and the frontend can't reach it. |

The backend bridges both networks. The frontend never shares a network with the
backup sidecar, and litestream is unreachable from the proxy tier — a small
blast-radius reduction, and the natural place to attach a database or cache later.

---

## Caddyfile

Save as `Caddyfile` next to the compose file. This is the whole thing:

```caddyfile
{
	# ACME account email for Let's Encrypt certificate notifications.
	email admin@example.com
}

shopping.example.com {
	# Backend owns the API, the OIDC auth flow, and the WebSocket.
	@backend path /api/* /auth/* /ws
	reverse_proxy @backend backend:8080

	# Everything else is the SvelteKit frontend.
	reverse_proxy frontend:3000
}
```

Caddy provisions and renews the TLS certificate automatically — just point the
domain's DNS at the host and open ports 80 and 443. WebSocket upgrades on `/ws`
are handled transparently by `reverse_proxy`.

---

## docker-compose.caddy.yml

Pre-built images are published by CI to GHCR. Replace `youruser/tante_emma` with
your repository path (`ghcr.io/<owner>/<repo>`).

```yaml
services:
  caddy:
    image: docker.io/library/caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data        # certificates — must persist
      - caddy_config:/config
    networks:
      - proxy
    depends_on:
      - frontend
      - backend

  frontend:
    image: ghcr.io/tibroc/tante_emma/frontend:latest
    restart: unless-stopped
    # PUBLIC_API_URL / PUBLIC_WS_URL are left unset on purpose: the app then uses
    # same-origin relative URLs, which is exactly what the single-domain Caddy
    # setup wants. Set them only if you split the API onto another hostname.
    networks:
      - proxy
    depends_on:
      - backend

  backend:
    image: ghcr.io/tibroc/tante_emma/backend:latest
    restart: unless-stopped
    volumes:
      - tanteemma-data:/data
    environment:
      - DB_PATH=/data/tanteemma.db
      - SESSION_HASH_KEY=${SESSION_HASH_KEY}
      - SESSION_BLOCK_KEY=${SESSION_BLOCK_KEY}
      - OIDC_ISSUER_URL=${OIDC_ISSUER_URL}
      - OIDC_CLIENT_ID=${OIDC_CLIENT_ID}
      - OIDC_CLIENT_SECRET=${OIDC_CLIENT_SECRET}
      - OIDC_REDIRECT_URL=https://shopping.example.com/auth/callback
      - FRONTEND_URL=https://shopping.example.com
      - SECURE_COOKIES=true
      - LOG_LEVEL=info
    networks:
      - proxy
      - backend

  # Optional: continuous SQLite backup to S3-compatible storage.
  # Remove this block (and the litestream.yml volume) if you don't need it.
  litestream:
    image: docker.io/litestream/litestream:0.3
    restart: unless-stopped
    command: replicate
    volumes:
      - tanteemma-data:/data
      - ./litestream.yml:/etc/litestream.yml:ro
    environment:
      - LITESTREAM_ACCESS_KEY_ID=${LITESTREAM_ACCESS_KEY_ID:-}
      - LITESTREAM_SECRET_ACCESS_KEY=${LITESTREAM_SECRET_ACCESS_KEY:-}
    networks:
      - backend
    depends_on:
      - backend

networks:
  proxy:
    driver: bridge
  backend:
    driver: bridge

volumes:
  tanteemma-data:
  caddy_data:
  caddy_config:
```

> **SELinux hosts (Fedora/RHEL):** named volumes are relabeled automatically. If
> you switch the `tanteemma-data` named volume to a bind mount, append `:Z` to
> the mount (e.g. `./data:/data:Z`).

---

## Environment

Create a `.env` file next to the compose file (see `.env.example` for the full
list). At minimum:

```bash
SESSION_HASH_KEY=$(openssl rand -hex 32)
SESSION_BLOCK_KEY=$(openssl rand -hex 32)
OIDC_ISSUER_URL=https://auth.example.com/application/o/tanteemma/
OIDC_CLIENT_ID=tanteemma
OIDC_CLIENT_SECRET=...
```

Make sure your OIDC provider has `https://shopping.example.com/auth/callback`
registered as an allowed redirect URI.

---

## Bring it up

```bash
docker compose -f docker-compose.caddy.yml up -d
docker compose -f docker-compose.caddy.yml logs -f caddy   # watch cert issuance
```

The first request to `https://shopping.example.com` triggers automatic
certificate provisioning; give it a few seconds. The first user to log in is
promoted to admin automatically.
