package db

import (
	"database/sql"
	"server/lib"
)

func CreateRoom(roomId, roomName, roomPassword string) error {
	_, err := DB.Exec(
		"INSERT OR IGNORE INTO rooms (id, name, password) VALUES (?, ?, ?)",
		roomId, roomName, roomPassword,
	)
	return err
}

func UpdateRoom(nameToUpdate, roomId string) error {
	_, err := DB.Exec(
		"UPDATE rooms SET name = ? WHERE id = ?",
		nameToUpdate, roomId,
	)
	return err
}

func GetRoom(roomId string) (lib.Room, error) {
	var room lib.Room
	row := DB.QueryRow(
		"SELECT id, name, password FROM rooms WHERE id = ?",
		roomId,
	)
	err := row.Scan(&room.Id, &room.Name, &room.Password)
	if err != nil {
		if err == sql.ErrNoRows {
			return lib.Room{}, nil
		}
		return lib.Room{}, err
	}
	return room, nil
}
