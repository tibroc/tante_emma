package tokens

import (
	"strings"
	"testing"
)

func TestGenerate_ShapeAndUniqueness(t *testing.T) {
	raw1, prefix1, hash1, err := Generate()
	if err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if !strings.HasPrefix(raw1, Prefix) {
		t.Errorf("raw token %q missing prefix %q", raw1, Prefix)
	}
	// "tem_" + 32 url-safe chars = 36 total.
	if len(raw1) != len(Prefix)+32 {
		t.Errorf("raw token length = %d, want %d", len(raw1), len(Prefix)+32)
	}
	if prefix1 != raw1[:len(Prefix)+8] {
		t.Errorf("prefix %q is not the first %d chars of %q", prefix1, len(Prefix)+8, raw1)
	}
	if hash1 != Hash(raw1) {
		t.Errorf("returned hash does not match Hash(raw)")
	}
	if hash1 == raw1 {
		t.Errorf("hash must not equal the raw token")
	}

	raw2, _, hash2, _ := Generate()
	if raw1 == raw2 || hash1 == hash2 {
		t.Errorf("two Generate() calls produced identical output")
	}
}

func TestHash_StableAndDistinct(t *testing.T) {
	// Hash the same input twice via separate calls (not one literal expression,
	// which staticcheck SA4000 would flag) to assert determinism.
	const in = "tem_abc"
	if h1, h2 := Hash(in), Hash(in); h1 != h2 {
		t.Error("Hash is not deterministic")
	}
	if Hash("tem_abc") == Hash("tem_abd") {
		t.Error("distinct inputs hashed to the same value")
	}
	if !Equal(Hash("tem_abc"), Hash("tem_abc")) {
		t.Error("Equal returned false for matching hashes")
	}
}

func TestParseBearer(t *testing.T) {
	tests := []struct {
		header  string
		wantRaw string
		wantOK  bool
	}{
		{"Bearer tem_abc123", "tem_abc123", true},
		{"bearer tem_abc123", "tem_abc123", true}, // scheme is case-insensitive
		{"Bearer  tem_abc123  ", "tem_abc123", true},
		{"Bearer notatoken", "", false}, // wrong prefix
		{"tem_abc123", "", false},       // no scheme
		{"Basic dXNlcjpwYXNz", "", false},
		{"", "", false},
		{"Bearer ", "", false},
	}
	for _, tc := range tests {
		gotRaw, gotOK := ParseBearer(tc.header)
		if gotRaw != tc.wantRaw || gotOK != tc.wantOK {
			t.Errorf("ParseBearer(%q) = (%q, %v), want (%q, %v)",
				tc.header, gotRaw, gotOK, tc.wantRaw, tc.wantOK)
		}
	}
}
