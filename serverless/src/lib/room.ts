import { Room } from '../types/room';

export const getRoom = (id: string | undefined, sql: SqlStorage) => {
	if (!id || typeof id !== 'string') {
		return null;
	}
	const room = sql.exec(`SELECT id, name, password FROM rooms WHERE id = ?`, id);
	const roomResultArray = room.toArray();
	if (roomResultArray.length === 0) {
		return null;
	} else if (roomResultArray.length === 1) {
		return roomResultArray[0] as Room;
	}
};

export const createRoom = (id: string, name: string, password: string, sql: SqlStorage) => {
	sql.exec(`INSERT INTO rooms (id, name, password) VALUES (?, ?, ?)`, id, name, password);
};

export const updateRoom = (id: string, name: string, sql: SqlStorage) => {
	sql.exec('UPDATE rooms SET name = ? WHERE id = ?', name, id);
};
