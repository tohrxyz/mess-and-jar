package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/glebarez/go-sqlite"
)

var DB *sql.DB

const DATABASE_PATH = "./db/mess-and-jar.db"

func Init() {
	var err error
	DB, err = sql.Open("sqlite", DATABASE_PATH)
	if err != nil {
		log.Fatal("Failed to open database: ", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	DB.SetMaxOpenConns(1)

	if _, err = DB.Exec("PRAGMA foreign_keys = ON"); err != nil {
		log.Fatal("Failed to enable foreign keys: ", err)
	}

	if _, err = DB.Exec("PRAGMA journal_mode = WAL"); err != nil {
		log.Fatal("Failed to set WAL mode: ", err)
	}

	createSchema()
	checkAndAddMissingColumns()

	log.Println("Database initialized successfully")
}

func addColumnIfNotExists(table, column, columnType string) error {
	exists, err := isColumnExistInTable(table, column)
	if err != nil {
		return err
	}
	if !exists {
		query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, columnType)
		_, err := DB.Exec(query)
		if err != nil {
			return err
		}
	}
	return nil
}

func isColumnExistInTable(table, column string) (bool, error) {
	query := fmt.Sprintf("PRAGMA table_info(%s);", table)
	rows, err := DB.Query(query)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	var (
		cid        int
		name       string
		colType    string
		notnull    int
		dfltValue  sql.NullString
		primaryKey int
	)

	for rows.Next() {
		if err := rows.Scan(&cid, &name, &colType, &notnull, &dfltValue, &primaryKey); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, nil
}

func checkAndAddMissingColumns() {
	// keep this in sync with newest additions
	tables := map[string][]struct {
		column     string
		columnType string
	}{
		"users": {
			{"identity_pubkey", "TEXT"},
		},
		"messages": {
			{"identity_pubkey", "TEXT"},
			{"signature", "TEXT"},
		},
	}

	for table, columns := range tables {
		for _, col := range columns {
			err := addColumnIfNotExists(table, col.column, col.columnType)
			if err != nil {
				log.Printf("Failed to add column %s to table %s: %v", col.column, table, err)
			}
		}
	}
}

func createSchema() {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		username TEXT PRIMARY KEY,
		password TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS rooms (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		password TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp INTEGER NOT NULL,
		room_id TEXT NOT NULL,
		username TEXT NOT NULL,
		msg TEXT NOT NULL,
		FOREIGN KEY(room_id) REFERENCES rooms(id),
		FOREIGN KEY(username) REFERENCES users(username)
	);

	CREATE TABLE IF NOT EXISTS media (
		id TEXT PRIMARY KEY,
		data BLOB NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_messages_room_date ON messages(room_id, timestamp);
	CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(timestamp);
	CREATE INDEX IF NOT EXISTS idx_messages_username ON messages(username);
	`

	if _, err := DB.Exec(schema); err != nil {
		log.Fatal("Failed to create schema: ", err)
	}
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
