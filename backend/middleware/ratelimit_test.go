package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter_BurstThenThrottle(t *testing.T) {
	// 60/min = 1 token/sec, burst 3: first 3 immediate, 4th denied.
	l := &ipRateLimiter{buckets: map[string]*tokenBucket{}, rate: 1, burst: 3, idleTTL: time.Minute}
	for i := 0; i < 3; i++ {
		if !l.allow("1.2.3.4") {
			t.Fatalf("request %d should be allowed within burst", i+1)
		}
	}
	if l.allow("1.2.3.4") {
		t.Fatal("4th request should be throttled once burst is spent")
	}
}

func TestRateLimiter_RefillsOverTime(t *testing.T) {
	l := &ipRateLimiter{buckets: map[string]*tokenBucket{}, rate: 10, burst: 1, idleTTL: time.Minute}
	if !l.allow("ip") {
		t.Fatal("first request should pass")
	}
	if l.allow("ip") {
		t.Fatal("second immediate request should be throttled")
	}
	// Simulate elapsed time by backdating the last refill (10 tokens/sec → 1 token in 100ms).
	l.buckets["ip"].last = time.Now().Add(-200 * time.Millisecond)
	if !l.allow("ip") {
		t.Fatal("request should pass after the bucket refills")
	}
}

func TestRateLimiter_KeysAreIndependent(t *testing.T) {
	l := &ipRateLimiter{buckets: map[string]*tokenBucket{}, rate: 1, burst: 1, idleTTL: time.Minute}
	if !l.allow("a") || !l.allow("b") {
		t.Fatal("distinct clients must not share a bucket")
	}
	if l.allow("a") {
		t.Fatal("client a should now be throttled independently of b")
	}
}

func TestRateLimit_Middleware429(t *testing.T) {
	h := RateLimit(60, 1)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	rec1 := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.1:1111"
	h.ServeHTTP(rec1, req)
	if rec1.Code != http.StatusOK {
		t.Fatalf("first request: got %d, want 200", rec1.Code)
	}

	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, req)
	if rec2.Code != http.StatusTooManyRequests {
		t.Fatalf("second request: got %d, want 429", rec2.Code)
	}
	if rec2.Header().Get("Retry-After") == "" {
		t.Error("429 response should set Retry-After")
	}
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name       string
		remoteAddr string
		xff        string
		xRealIP    string
		want       string
	}{
		{"remote addr only", "192.168.1.5:4444", "", "", "192.168.1.5"},
		{"x-forwarded-for single", "10.0.0.1:80", "203.0.113.7", "", "203.0.113.7"},
		{"x-forwarded-for chain takes leftmost", "10.0.0.1:80", "203.0.113.7, 10.0.0.1", "", "203.0.113.7"},
		{"x-real-ip fallback", "10.0.0.1:80", "", "198.51.100.2", "198.51.100.2"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/", nil)
			r.RemoteAddr = tc.remoteAddr
			if tc.xff != "" {
				r.Header.Set("X-Forwarded-For", tc.xff)
			}
			if tc.xRealIP != "" {
				r.Header.Set("X-Real-IP", tc.xRealIP)
			}
			if got := clientIP(r); got != tc.want {
				t.Errorf("clientIP = %q, want %q", got, tc.want)
			}
		})
	}
}
