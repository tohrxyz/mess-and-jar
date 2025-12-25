import { User } from '../types/user';

export const getUser = (username: string | undefined, sql: SqlStorage) => {
	if (!username || typeof username !== 'string') {
		return null;
	}
	const user = sql.exec(`SELECT username, password, identity_pubkey FROM users WHERE username = ?`, username);
	const userResultArray = user.toArray();
	if (userResultArray.length === 0) {
		return null;
	} else if (userResultArray.length === 1) {
		return userResultArray[0] as User;
	}
};

export const createUser = (username: string, password: string, identityPubkey: string, sql: SqlStorage) => {
	sql.exec(`INSERT INTO users (username, password, identity_pubkey) VALUES (?, ?, ?)`, username, password, identityPubkey);
};

export const editUser = (username: string, identity_pubkey: string, sql: SqlStorage) => {
	sql.exec('UPDATE users SET identity_pubkey = ? WHERE username = ?', identity_pubkey, username);
};
