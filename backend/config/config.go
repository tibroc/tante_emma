package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	DBPath           string
	Port             string
	SessionHashKey   string
	SessionBlockKey  string
	OIDCIssuerURL    string
	OIDCClientID     string
	OIDCClientSecret string
	OIDCRedirectURL  string
	FrontendURL      string
	LitestreamURL    string
	SecureCookies    bool // set Secure flag on auth cookies (auto: true when serving over HTTPS)
}

func Load() *Config {
	cfg := &Config{
		DBPath:           require("DB_PATH"),
		SessionHashKey:   require("SESSION_HASH_KEY"),
		SessionBlockKey:  require("SESSION_BLOCK_KEY"),
		OIDCIssuerURL:    require("OIDC_ISSUER_URL"),
		OIDCClientID:     require("OIDC_CLIENT_ID"),
		OIDCClientSecret: require("OIDC_CLIENT_SECRET"),
		OIDCRedirectURL:  require("OIDC_REDIRECT_URL"),
		Port:             getenv("PORT", "8080"),
		FrontendURL:      getenv("FRONTEND_URL", "http://localhost:5173"),
		LitestreamURL:    os.Getenv("LITESTREAM_REPLICA_URL"),
	}
	// Auto-detect: cookies must be Secure when the public redirect URL is HTTPS.
	// Explicit SECURE_COOKIES=true|false overrides the heuristic.
	cfg.SecureCookies = strings.HasPrefix(cfg.OIDCRedirectURL, "https://")
	if v := os.Getenv("SECURE_COOKIES"); v != "" {
		cfg.SecureCookies = v == "true" || v == "1"
	}
	return cfg
}

func require(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
