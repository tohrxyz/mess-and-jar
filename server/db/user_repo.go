package db

import (
	"database/sql"
	"server/lib"
)

func CreateUser(username, password, identity_pubkey string) error {
	_, err := DB.Exec(
		"INSERT INTO users (username, password, identity_pubkey) VALUES (?, ?, ?)",
		username, password, identity_pubkey,
	)
	return err
}

func EditUser(username, password, identity_pubkey string) error {
	_, err := DB.Exec(
		"UPDATE users SET password = ?, identity_pubkey = ? WHERE username = ?",
		password, identity_pubkey, username,
	)

	return err
}

func GetUser(username string) (lib.User, error) {
	var user lib.User
	var identityPubkey sql.NullString
	row := DB.QueryRow(
		"SELECT username, password, identity_pubkey FROM users WHERE username = ?",
		username,
	)

	err := row.Scan(&user.Username, &user.Password, &identityPubkey)
	if err != nil {
		if err == sql.ErrNoRows {
			return lib.User{}, nil
		}
		return lib.User{}, err
	}

	if identityPubkey.Valid {
		user.IdentityPubkey = identityPubkey.String
	}

	return user, nil
}
