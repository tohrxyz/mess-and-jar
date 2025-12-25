import { Message } from '../types/message';

export const writeMessage = (
	timestamp: number,
	room_id: string,
	username: string,
	msg: string,
	identity_pubkey: string | null,
	signature: string | null,
	sql: SqlStorage,
) => {
	sql.exec(
		`INSERT INTO messages (timestamp, room_id, username, msg, identity_pubkey, signature) VALUES (?, ?, ?, ?, ?, ?)`,
		timestamp,
		room_id,
		username,
		msg,
		identity_pubkey,
		signature,
	);
};

export const getMessagesAfterTimestamp = (room_id: string, timestamp: number, sql: SqlStorage) => {
	const result = sql.exec(
		`SELECT timestamp, room_id, username, msg, identity_pubkey, signature FROM messages WHERE room_id = ? AND timestamp > ? ORDER BY timestamp`,
		room_id,
		timestamp,
	);
	return result.toArray() as Message[];
};

export const updateMessage = (room_id: string, timestamp: number, newContent: string, sql: SqlStorage) => {
	sql.exec(`UPDATE messages SET msg = ? WHERE room_id = ? AND timestamp = ?`, newContent, room_id, timestamp);
};
