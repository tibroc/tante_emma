package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/securecookie"

	"github.com/tante-emma/tanteemma/config"
	"github.com/tante-emma/tanteemma/db"
	"github.com/tante-emma/tanteemma/handlers"
	"github.com/tante-emma/tanteemma/middleware"
	"github.com/tante-emma/tanteemma/ws"
)

func main() {
	cfg := config.Load()

	hashKey, err := hex.DecodeString(cfg.SessionHashKey)
	if err != nil || len(hashKey) < 32 {
		log.Fatalf("SESSION_HASH_KEY must be 32+ bytes hex (got: %v)", err)
	}
	blockKey, err := hex.DecodeString(cfg.SessionBlockKey)
	if err != nil || len(blockKey) != 32 {
		log.Fatalf("SESSION_BLOCK_KEY must be exactly 32 bytes hex (got: %v)", err)
	}
	sc := securecookie.New(hashKey, blockKey)

	database, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer database.Close()

	hub := ws.NewHub()
	go hub.Run()

	auth := &handlers.Auth{SC: sc, DB: database, Cfg: cfg}
	if err := auth.Init(context.Background()); err != nil {
		log.Fatalf("oidc init: %v", err)
	}

	lists   := &handlers.Lists{DB: database}
	items   := &handlers.Items{DB: database, Hub: hub}
	products := &handlers.Products{DB: database}
	stores  := &handlers.Stores{DB: database}
	users   := &handlers.Users{DB: database}
	wsHandler := &handlers.WS{DB: database, Hub: hub, SC: sc}

	requireAuth := middleware.NewRequireAuth(sc)
	requireAdmin := middleware.NewRequireRole("admin")

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS([]string{cfg.FrontendURL}))

	// Auth (no auth required)
	r.Get("/auth/login", auth.Login)
	r.Get("/auth/callback", auth.Callback)
	r.Post("/auth/logout", auth.Logout)

	// WebSocket (self-authenticates via cookie)
	r.Get("/ws", wsHandler.ServeWS)

	// API (auth required)
	r.Group(func(r chi.Router) {
		r.Use(requireAuth)

		r.Get("/api/health", health)
		r.Get("/api/version", version)
		r.Get("/api/auth/me", auth.Me)

		// Lists
		r.Get("/api/lists", lists.GetAll)
		r.Post("/api/lists", lists.Create)
		r.Get("/api/lists/{id}", lists.Get)
		r.Put("/api/lists/{id}", lists.Update)
		r.Delete("/api/lists/{id}", lists.Delete)
		r.Post("/api/lists/{id}/share", lists.Share)
		r.Delete("/api/lists/{id}/share/{uid}", lists.Unshare)

		// Events
		r.Post("/api/lists/{id}/events", items.SubmitEvents)
		r.Get("/api/lists/{id}/events", items.GetEvents)

		// Products
		r.Get("/api/products/search", products.Search)
		r.Get("/api/products/barcode/{code}", products.GetByBarcode)
		r.Post("/api/products", products.Create)
		r.Put("/api/products/{id}", products.Update)

		// Stores
		r.Get("/api/stores", stores.GetAll)
		r.Post("/api/stores", stores.Create)
		r.Put("/api/stores/{id}", stores.Update)
		r.Delete("/api/stores/{id}", stores.Delete)
		r.Get("/api/stores/{id}/shelf-order", stores.GetShelfOrder)
		r.Put("/api/stores/{id}/shelf-order", stores.UpdateShelfOrder)

		// Users (admin only)
		r.Group(func(r chi.Router) {
			r.Use(requireAdmin)
			r.Get("/api/users", users.GetAll)
			r.Put("/api/users/{id}/role", users.UpdateRole)
		})
	})

	log.Printf("tanteemma listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func version(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"version": "1.0.0"})
}
