package db

import "server/lib"

func WriteMessage(message lib.Message) error {
	_, err := DB.Exec(
		"INSERT INTO messages (timestamp, room_id, username, msg) VALUES (?, ?, ?, ?)",
		message.Date, message.Room, message.Username, message.Msg,
	)
	return err
}

func GetMessagesAfterTimestamp(room string, timestamp int64) ([]lib.Message, error) {
	rows, err := DB.Query(
		"SELECT timestamp, room_id, username, msg FROM messages WHERE room_id = ? AND timestamp > ? ORDER BY timestamp",
		room, timestamp,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []lib.Message
	for rows.Next() {
		var msg lib.Message
		err := rows.Scan(&msg.Date, &msg.Room, &msg.Username, &msg.Msg)
		if err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

func GetAllMessages(room string) ([]lib.Message, error) {
	return GetMessagesAfterTimestamp(room, 0)
}

func UpdateMessage(room string, timestamp int64, newContent string) error {
	_, err := DB.Exec(
		"UPDATE messages SET msg = ? WHERE room_id = ? AND timestamp = ?",
		newContent, room, timestamp,
	)

	return err
}
