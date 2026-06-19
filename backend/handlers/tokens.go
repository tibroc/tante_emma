package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/oklog/ulid/v2"

	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
	"github.com/tante-emma/tanteemma/tokens"
)

type Tokens struct {
	DB *sql.DB
}

// maxTokenNameLen bounds the user-supplied label so a token row can't be used to
// store arbitrary blobs.
const maxTokenNameLen = 100

// List returns the current user's tokens (metadata only — never the hash or raw
// token). Newest first.
func (h *Tokens) List(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())

	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT id, name, token_prefix, scopes, last_used_at, expires_at, created_at
		  FROM access_tokens
		 WHERE user_id = ?
		 ORDER BY created_at DESC`, sess.UserID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close() //nolint:errcheck

	out := make([]models.AccessToken, 0)
	for rows.Next() {
		var (
			tok       models.AccessToken
			scopesRaw string
		)
		if err := rows.Scan(&tok.ID, &tok.Name, &tok.TokenPrefix, &scopesRaw,
			&tok.LastUsedAt, &tok.ExpiresAt, &tok.CreatedAt); err != nil {
			continue
		}
		_ = json.Unmarshal([]byte(scopesRaw), &tok.Scopes)
		out = append(out, tok)
	}
	respond(w, http.StatusOK, out)
}

// Create mints a new token for the current user. The raw token is returned
// exactly once, in this response only; afterwards only its hash is stored.
func (h *Tokens) Create(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())

	var req struct {
		Name      string   `json:"name"`
		Scopes    []string `json:"scopes"`
		ExpiresAt *int64   `json:"expires_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondErr(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	name := trimName(req.Name)
	if name == "" {
		respondErr(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	if len(name) > maxTokenNameLen {
		respondErr(w, http.StatusUnprocessableEntity, "name too long")
		return
	}

	scopes, ok := normalizeScopes(req.Scopes)
	if !ok {
		respondErr(w, http.StatusUnprocessableEntity, "scopes must be a subset of [\"read\",\"write\"]")
		return
	}

	now := time.Now().UnixMilli()
	if req.ExpiresAt != nil && *req.ExpiresAt <= now {
		respondErr(w, http.StatusUnprocessableEntity, "expires_at must be in the future")
		return
	}

	raw, prefix, hash, err := tokens.Generate()
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "token generation failed")
		return
	}

	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "encode error")
		return
	}

	tok := models.AccessToken{
		ID:          ulid.Make().String(),
		Name:        name,
		TokenPrefix: prefix,
		Scopes:      scopes,
		ExpiresAt:   req.ExpiresAt,
		CreatedAt:   now,
	}

	_, err = h.DB.ExecContext(r.Context(), `
		INSERT INTO access_tokens (id, user_id, name, token_hash, token_prefix, scopes, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		tok.ID, sess.UserID, tok.Name, hash, tok.TokenPrefix, string(scopesJSON), tok.ExpiresAt, tok.CreatedAt)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}

	// Echo the metadata plus the raw token — the only time the raw token leaves
	// the server.
	respond(w, http.StatusCreated, struct {
		models.AccessToken
		RawToken string `json:"raw_token"`
	}{AccessToken: tok, RawToken: raw})
}

// Delete revokes (deletes) one of the current user's tokens. Scoping the DELETE
// by user_id ensures a user can only revoke their own tokens, and makes deleting
// someone else's (or a missing) token a 404 rather than a silent no-op.
func (h *Tokens) Delete(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	id := chi.URLParam(r, "id")

	res, err := h.DB.ExecContext(r.Context(),
		`DELETE FROM access_tokens WHERE id = ? AND user_id = ?`, id, sess.UserID)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		respondErr(w, http.StatusNotFound, "token not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func trimName(s string) string {
	// Trim surrounding whitespace without pulling in a heavyweight sanitiser;
	// the name is only ever rendered as text, never interpreted.
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

// normalizeScopes validates the requested scopes against the v1 vocabulary
// (read, write) and normalises them: "write" implies "read", and duplicates are
// collapsed. An empty request defaults to read-only. Returns ok=false for any
// unrecognised scope.
func normalizeScopes(requested []string) ([]string, bool) {
	hasRead, hasWrite := false, false
	for _, s := range requested {
		switch s {
		case models.ScopeRead:
			hasRead = true
		case models.ScopeWrite:
			hasWrite = true
		default:
			return nil, false
		}
	}
	if hasWrite {
		// write implies read — store both so the set is self-describing.
		return []string{models.ScopeRead, models.ScopeWrite}, true
	}
	// default (and explicit read-only) → read
	_ = hasRead
	return []string{models.ScopeRead}, true
}
