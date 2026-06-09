package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
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
	state := randomState()
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, a.oauth2.AuthCodeURL(state), http.StatusFound)
}

func (a *Auth) Callback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}
	http.SetCookie(w, &http.Cookie{Name: "oauth_state", MaxAge: -1, Path: "/"})

	token, err := a.oauth2.Exchange(r.Context(), r.URL.Query().Get("code"))
	if err != nil {
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
		SameSite: http.SameSiteLaxMode,
	})
	http.Redirect(w, r, a.Cfg.FrontendURL+"/lists", http.StatusFound)
}

func (a *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "session", MaxAge: -1, Path: "/"})
	w.WriteHeader(http.StatusNoContent)
}

func (a *Auth) Me(w http.ResponseWriter, r *http.Request) {
	sess := middleware.SessionFromContext(r.Context())
	if sess == nil {
		respondErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var u models.User
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, email, name, avatar_url, role, locale, created_at, last_seen
		   FROM users WHERE id = ?`, sess.UserID,
	).Scan(&u.ID, &u.Email, &u.Name, &u.AvatarURL, &u.Role, &u.Locale, &u.CreatedAt, &u.LastSeen)
	if err != nil {
		respondErr(w, http.StatusInternalServerError, "db error")
		return
	}
	respond(w, http.StatusOK, u)
}

func (a *Auth) upsertUser(ctx context.Context, sub, email, name string) (*models.User, error) {
	now := time.Now().UnixMilli()

	var user models.User
	err := a.DB.QueryRowContext(ctx,
		`SELECT id, role FROM users WHERE oidc_sub = ?`, sub,
	).Scan(&user.ID, &user.Role)

	if err == sql.ErrNoRows {
		var count int
		_ = a.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
		role := models.RoleMember
		if count == 0 {
			role = models.RoleAdmin
		}
		user.ID = ulid.Make().String()
		user.Role = role
		_, err = a.DB.ExecContext(ctx, `
			INSERT INTO users (id, oidc_sub, email, name, role, locale, created_at, last_seen)
			VALUES (?, ?, ?, ?, ?, 'de', ?, ?)`,
			user.ID, sub, email, name, role, now, now,
		)
		if err != nil {
			return nil, fmt.Errorf("upsertUser insert: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("upsertUser query: %w", err)
	} else {
		_, _ = a.DB.ExecContext(ctx,
			`UPDATE users SET email=?, name=?, last_seen=? WHERE id=?`,
			email, name, now, user.ID,
		)
	}
	return &user, nil
}

func randomState() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
