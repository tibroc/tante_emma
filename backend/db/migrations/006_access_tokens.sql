-- ============================================================
-- PERSONAL ACCESS TOKENS
-- ============================================================
-- Second authentication method alongside OIDC session cookies. Tokens are the
-- foundation for upcoming external integrations (third-party REST API, MCP
-- server). Only the SHA-256 hash of a token is ever stored; the raw token is
-- shown to the user exactly once at creation time.

CREATE TABLE access_tokens (
  id           TEXT PRIMARY KEY,                         -- ULID
  user_id      TEXT NOT NULL REFERENCES users(id),
  name         TEXT NOT NULL,                            -- user-given label, e.g. "Claude MCP"
  token_hash   TEXT NOT NULL UNIQUE,                     -- SHA-256 hash, never the raw token
  token_prefix TEXT NOT NULL,                            -- e.g. "tem_a1b2c3d4", shown in UI for identification
  scopes       TEXT NOT NULL,                            -- JSON array, e.g. ["read","write"]
  last_used_at INTEGER,
  expires_at   INTEGER,                                  -- nullable = no expiry
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_access_tokens_user ON access_tokens(user_id);
