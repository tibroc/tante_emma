package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"time"

	gooidc "github.com/coreos/go-oidc/v3/oidc"
	"github.com/gorilla/securecookie"
	"github.com/oklog/ulid/v2"
	"golang.org/x/oauth2"

	"github.com/tante-emma/tanteemma/config"
	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/models"
)

type Auth struct {
	SC       *securecookie.SecureCookie
	DB       *sql.DB
	Cfg      *config.Config
	provider *gooidc.Provider
	verifier *gooidc.IDTokenVerifier
	oauth2   oauth2.Config
}

// Init connects to the OIDC provider. Call once at startup.
func (a *Auth) Init(ctx context.Context) error {
	p, err := gooidc.NewProvider(ctx, a.Cfg.OIDCIssuerURL)
	if err != nil {
		return fmt.Errorf("oidc provider: %w", err)
	}
	a.provider = p
	a.verifier = p.Verifier(&gooidc.Config{ClientID: a.Cfg.OIDCClientID})
	a.oauth2 = oauth2.Config{
		ClientID:     a.Cfg.OIDCClientID,
		ClientSecret: a.Cfg.OIDCClientSecret,
		RedirectURL:  a.Cfg.OIDCRedirectURL,
		Endpoint:     p.Endpoint(),
		Scopes:       []string{gooidc.ScopeOpenID, "profile", "email"},
	}
	return nil
}

func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	state, err := randomToken()
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	nonce, err := randomToken()
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	a.setShortCookie(w, "oauth_state", state)
	a.setShortCookie(w, "oauth_nonce", nonce)

	http.Redirect(w, r, a.oauth2.AuthCodeURL(state, gooidc.Nonce(nonce)), http.StatusFound)
}

func (a *Auth) Callback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value == "" || stateCookie.Value != r.URL.Query().Get("state") {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}
	nonceCookie, err := r.Cookie("oauth_nonce")
	if err != nil || nonceCookie.Value == "" {
		http.Error(w, "missing nonce", http.StatusBadRequest)
		return
	}
	a.clearCookie(w, "oauth_state")
	a.clearCookie(w, "oauth_nonce")

	token, err := a.oauth2.Exchange(r.Context(), r.URL.Query().Get("code"))
	if err != nil {
		log.Printf("token exchange error: %v", err)
		http.Error(w, "token exchange failed", http.StatusBadRequest)
		return
	}

	rawID, ok := token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "missing id_token", http.StatusBadRequest)
		return
	}
	idToken, err := a.verifier.Verify(r.Context(), rawID)
	if err != nil {
		http.Error(w, "id_token verify failed", http.StatusUnauthorized)
		return
	}
	// Bind the ID token to this login (OIDC replay protection).
	if idToken.Nonce != nonceCookie.Value {
		http.Error(w, "invalid nonce", http.StatusUnauthorized)
		return
	}

	var claims struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := idToken.Claims(&claims); err != nil {
		http.Error(w, "claims decode failed", http.StatusInternalServerError)
		return
	}

	user, err := a.upsertUser(r.Context(), claims.Sub, claims.Email, claims.Name)
	if err != nil {
		http.Error(w, "user upsert failed", http.StatusInternalServerError)
		return
	}

	encoded, err := a.SC.Encode("session", models.Session{UserID: user.ID, Role: user.Role})
	if err != nil {
		http.Error(w, "session encode failed", http.StatusInternalServerError)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    encoded,
		Path:     "/",
		MaxAge:   30 * 24 * 3600,
		HttpOnly: true,
		Secure:   a.Cfg.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, a.Cfg.FrontendURL+"/lists", http.StatusFound)
}

func (a *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	a.clearCookie(w, "session")
	w.WriteHeader(http.StatusNoContent)
}

// setShortCookie writes a 5-minute HttpOnly cookie for the OIDC handshake.
func (a *Auth) setShortCookie(w http.ResponseWriter, name, value string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		Secure:   a.Cfg.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *Auth) clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.Cfg.SecureCookies,
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *Auth) Me(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess == nil {
		respondErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var u models.User
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, COALESCE(email,''), name, COALESCE(avatar_url,''), role, locale, created_at, last_seen
		   FROM users WHERE id = ?`, sess.UserID,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.Locale, &u.CreatedAt, &u.LastSeen)
	if err != nil {
		log.Printf("auth.Me scan error: %v", err)
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	respond(w, http.StatusOK, u)
}

func (a *Auth) upsertUser(ctx context.Context, sub, email, name string) (*models.User, error) {
	now := time.Now().UnixMilli()
	newID := ulid.Make().String()

	// Single atomic upsert. The "first user becomes admin" decision is made
	// inside the INSERT via a scalar subquery, so it cannot race two concurrent
	// first-logins into both becoming admin. A repeat login for the same
	// oidc_sub hits the conflict clause and just refreshes the profile fields;
	// the role is left untouched.
	_, err := a.DB.ExecContext(ctx, `
		INSERT INTO users (id, oidc_sub, email, name, role, locale, created_at, last_seen)
		VALUES (?, ?, ?, ?,
		        CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'admin' ELSE 'member' END,
		        'de', ?, ?)
		ON CONFLICT(oidc_sub) DO UPDATE SET
		        email     = excluded.email,
		        name      = excluded.name,
		        last_seen = excluded.last_seen`,
		newID, sub, email, name, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("upsertUser: %w", err)
	}

	var user models.User
	if err := a.DB.QueryRowContext(ctx,
		`SELECT id, role FROM users WHERE oidc_sub = ?`, sub,
	).Scan(&user.ID, &user.Role); err != nil {
		return nil, fmt.Errorf("upsertUser read-back: %w", err)
	}
	return &user, nil
}

// randomToken returns a 128-bit URL-safe random value, failing closed on
// entropy errors rather than producing a predictable token.
func randomToken() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("randomToken: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
