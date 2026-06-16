// Package tokens holds the crypto primitives for Personal Access Tokens (PATs).
// It deliberately imports nothing from the rest of the project so that both the
// auth middleware (which hashes an incoming token to look it up) and the tokens
// handler (which mints new tokens) can depend on it without an import cycle.
package tokens

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
)

// Prefix is the fixed, human-recognisable marker every raw token starts with.
// It lets users (and secret scanners) spot a TanteEmma token at a glance.
const Prefix = "tem_"

// randomChars is the number of URL-safe random characters after the prefix.
// 24 random bytes base64-url-encode (no padding) to exactly 32 characters.
const randomBytes = 24

// prefixDisplayLen is how many leading characters of the raw token we persist as
// token_prefix for UI identification: the "tem_" marker plus 8 random chars
// (e.g. "tem_a1b2c3d4"). Enough to disambiguate a user's tokens at a glance
// without revealing enough to be useful to an attacker.
const prefixDisplayLen = len(Prefix) + 8

// Generate mints a new token. It returns the raw token (shown to the user
// exactly once), the display prefix to persist for identification, and the
// SHA-256 hash to persist for lookup. The raw token is never stored.
func Generate() (raw, prefix, hash string, err error) {
	buf := make([]byte, randomBytes)
	if _, err = rand.Read(buf); err != nil {
		return "", "", "", fmt.Errorf("tokens.Generate: %w", err)
	}
	raw = Prefix + base64.RawURLEncoding.EncodeToString(buf)
	prefix = raw[:prefixDisplayLen]
	hash = Hash(raw)
	return raw, prefix, hash, nil
}

// Hash returns the hex-encoded SHA-256 of a raw token. A plain hash (no salt) is
// appropriate here because tokens are high-entropy random secrets, not
// low-entropy user passwords — they are not vulnerable to dictionary attacks, and
// constant-time comparison guards the lookup (see Equal).
func Hash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// Equal compares two hex hashes in constant time.
func Equal(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// ParseBearer extracts a raw token from an Authorization header value, returning
// ("", false) if the header is absent, not a Bearer scheme, or not a TanteEmma
// token. It does not validate the token's authenticity — that is the lookup's job.
func ParseBearer(header string) (string, bool) {
	const scheme = "Bearer "
	if len(header) <= len(scheme) || !strings.EqualFold(header[:len(scheme)], scheme) {
		return "", false
	}
	raw := strings.TrimSpace(header[len(scheme):])
	if !strings.HasPrefix(raw, Prefix) {
		return "", false
	}
	return raw, true
}
