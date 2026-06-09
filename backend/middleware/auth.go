package middleware

import "net/http"

// RequireAuth validates the session cookie and injects the session into context.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: decode securecookie, validate session, inject into ctx
		next.ServeHTTP(w, r)
	})
}

// RequireRole checks that the session role meets the minimum required role.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// TODO: read session from ctx, check role hierarchy
			next.ServeHTTP(w, r)
		})
	}
}
