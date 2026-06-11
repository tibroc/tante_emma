package db

import (
	"path/filepath"
	"testing"
)

// TestOpenAppliesPragmas guards against silently-ignored DSN flags. modernc.org/sqlite
// does not understand the mattn/go-sqlite3 DSN syntax, so an incorrect connection
// string leaves the DB in rollback-journal mode with foreign keys OFF and no busy
// timeout. SetMaxOpenConns(1) masks the symptoms, so assert the pragmas directly.
func TestOpenAppliesPragmas(t *testing.T) {
	database, err := Open(filepath.Join(t.TempDir(), "pragma.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	defer database.Close()

	var journalMode string
	if err := database.QueryRow("PRAGMA journal_mode").Scan(&journalMode); err != nil {
		t.Fatalf("query journal_mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("journal_mode = %q, want wal", journalMode)
	}

	var busyTimeout int
	if err := database.QueryRow("PRAGMA busy_timeout").Scan(&busyTimeout); err != nil {
		t.Fatalf("query busy_timeout: %v", err)
	}
	if busyTimeout != 5000 {
		t.Errorf("busy_timeout = %d, want 5000", busyTimeout)
	}

	var foreignKeys int
	if err := database.QueryRow("PRAGMA foreign_keys").Scan(&foreignKeys); err != nil {
		t.Fatalf("query foreign_keys: %v", err)
	}
	if foreignKeys != 1 {
		t.Errorf("foreign_keys = %d, want 1", foreignKeys)
	}
}
