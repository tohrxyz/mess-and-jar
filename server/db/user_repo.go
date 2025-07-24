package db

import (
	"database/sql"
	"server/lib"
)

func CreateUser(username, password string) error {
	_, err := DB.Exec(
		"INSERT INTO users (username, password) VALUES (?, ?)",
		username, password,
	)
	return err
}

func GetUser(username string) (lib.User, error) {
	var user lib.User
	row := DB.QueryRow(
		"SELECT username, password FROM users WHERE username = ?",
		username,
	)

	err := row.Scan(&user.Username, &user.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			return lib.User{}, nil
		}
		return lib.User{}, err
	}

	return user, nil
}
