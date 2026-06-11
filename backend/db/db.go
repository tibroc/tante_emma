package db

import (
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrations embed.FS

// maxOpenConns bounds the connection pool. Under WAL mode SQLite allows many
// concurrent readers alongside a single writer, so a pool > 1 lets read-heavy
// requests run in parallel. Writers still serialize at the SQLite level (see
// _txlock=immediate below), so this is purely read concurrency.
const maxOpenConns = 8

func Open(path string) (*sql.DB, error) {
	// NOTE: modernc.org/sqlite (pure Go) does NOT understand the mattn/go-sqlite3
	// DSN flags (_journal_mode=, _busy_timeout=, _foreign_keys=); it silently
	// ignores them, leaving the DB in rollback-journal mode with no busy timeout
	// and foreign keys OFF. Pragmas must be passed via _pragma=name(value).
	//
	// _txlock=immediate makes every write transaction grab the write lock at BEGIN
	// rather than upgrading mid-transaction. That avoids the deadlock where two
	// connections each hold a read lock and then both try to write — which the
	// busy_timeout cannot resolve and surfaces as an immediate SQLITE_BUSY.
	dsn := path + "?" + strings.Join([]string{
		"_pragma=journal_mode(WAL)",
		"_pragma=busy_timeout(5000)",
		"_pragma=foreign_keys(on)",
		"_pragma=synchronous(NORMAL)",
		"_txlock=immediate",
	}, "&")
	database, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("db.Open: %w", err)
	}
	database.SetMaxOpenConns(maxOpenConns)
	database.SetMaxIdleConns(maxOpenConns)
	database.SetConnMaxIdleTime(5 * time.Minute)
	if err := database.Ping(); err != nil {
		return nil, fmt.Errorf("db.Ping: %w", err)
	}
	if err := runMigrations(database); err != nil {
		return nil, fmt.Errorf("db.runMigrations: %w", err)
	}
	return database, nil
}

func runMigrations(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at INTEGER NOT NULL
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.ReadDir(migrations, "migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		version := strings.TrimSuffix(entry.Name(), ".sql")

		var exists int
		if err := db.QueryRow(`SELECT COUNT(*) FROM schema_migrations WHERE version = ?`, version).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists > 0 {
			continue
		}

		content, err := migrations.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin migration %s: %w", version, err)
		}
		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", version, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, unixepoch())`, version); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", version, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %s: %w", version, err)
		}
	}
	return nil
}
