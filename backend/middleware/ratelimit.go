package middleware

import (
	"math"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimit returns a middleware that throttles requests per client using a
// token-bucket algorithm: each client may make `burst` requests immediately and
// then `perMinute` requests per minute sustained. It is basic abuse mitigation
// (login spam, using the Open Food Facts proxy as an unthrottled outbound
// requester) — not a hardened defense — so it lives in-process with no external
// store.
//
// Client identity is the remote IP. In the production deployment the app sits
// behind a reverse proxy (see docker-compose.prod.yml), so X-Forwarded-For /
// X-Real-IP are honored; absent those, RemoteAddr is used. This trusts the proxy
// to set those headers and is appropriate for a self-hosted single-family app.
func RateLimit(perMinute, burst int) func(http.Handler) http.Handler {
	l := &ipRateLimiter{
		buckets: make(map[string]*tokenBucket),
		rate:    float64(perMinute) / 60.0,
		burst:   float64(burst),
		idleTTL: 10 * time.Minute,
	}
	go l.cleanupLoop()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !l.allow(clientIP(r)) {
				w.Header().Set("Retry-After", "60")
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type ipRateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
	rate    float64 // tokens added per second
	burst   float64 // bucket capacity
	idleTTL time.Duration
}

type tokenBucket struct {
	tokens   float64
	last     time.Time // last refill
	lastSeen time.Time // for idle eviction
}

func (l *ipRateLimiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[key]
	if !ok {
		// New client starts with a full bucket minus this request.
		l.buckets[key] = &tokenBucket{tokens: l.burst - 1, last: now, lastSeen: now}
		return true
	}

	// Refill based on elapsed time, capped at burst.
	b.tokens = math.Min(l.burst, b.tokens+now.Sub(b.last).Seconds()*l.rate)
	b.last = now
	b.lastSeen = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// cleanupLoop evicts buckets that have been idle longer than idleTTL so memory
// does not grow without bound for one-off clients.
func (l *ipRateLimiter) cleanupLoop() {
	for range time.Tick(l.idleTTL) {
		cutoff := time.Now().Add(-l.idleTTL)
		l.mu.Lock()
		for k, b := range l.buckets {
			if b.lastSeen.Before(cutoff) {
				delete(l.buckets, k)
			}
		}
		l.mu.Unlock()
	}
}

// clientIP extracts the client address, preferring proxy-set forwarding headers.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Leftmost entry is the original client as seen by the first proxy.
		if i := strings.IndexByte(xff, ','); i >= 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if xr := r.Header.Get("X-Real-IP"); xr != "" {
		return strings.TrimSpace(xr)
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
