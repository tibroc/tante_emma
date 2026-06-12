package middleware

import "net/http"

// MaxBytes caps the size of request bodies. A client posting a larger body will
// see reads fail (handlers surface this as a 400), preventing an authenticated
// client from submitting an arbitrarily large event batch.
func MaxBytes(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, n)
			next.ServeHTTP(w, r)
		})
	}
}
