package handlers

import "net/http"

// Auth handles OIDC login, callback, and logout.
type Auth struct {
	// TODO: *oidc.Provider, config, session store
}

func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}

func (a *Auth) Callback(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}

func (a *Auth) Logout(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "not implemented", http.StatusNotImplemented)
}
