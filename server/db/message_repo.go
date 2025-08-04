package db

import (
	"database/sql"
	"server/lib"
)

func WriteMessage(message lib.Message) error {
	_, err := DB.Exec(
		"INSERT INTO messages (timestamp, room_id, username, msg, identity_pubkey, signature) VALUES (?, ?, ?, ?, ?, ?)",
		message.Date, message.Room, message.Username, message.Msg, message.IdentityPubkey, message.Signature,
	)
	return err
}

func GetMessagesAfterTimestamp(room string, timestamp int64) ([]lib.Message, error) {
	rows, err := DB.Query(
		"SELECT timestamp, room_id, username, msg, identity_pubkey, signature FROM messages WHERE room_id = ? AND timestamp > ? ORDER BY timestamp",
		room, timestamp,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []lib.Message
	for rows.Next() {
		var msg lib.Message
		var identityPubkey sql.NullString
		var signature sql.NullString
		err := rows.Scan(&msg.Date, &msg.Room, &msg.Username, &msg.Msg, &identityPubkey, &signature)
		if err != nil {
			return nil, err
		}
		if identityPubkey.Valid {
			msg.IdentityPubkey = identityPubkey.String
		} else {
			msg.IdentityPubkey = ""
		}
		if signature.Valid {
			msg.Signature = signature.String
		} else {
			msg.Signature = ""
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
