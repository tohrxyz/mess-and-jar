import { DurableObject } from 'cloudflare:workers';
import { createUser, editUser, getUser } from '../lib/auth';
import { createRoom, getRoom, updateRoom } from '../lib/room';
import { getMessagesAfterTimestamp, updateMessage, writeMessage } from '../lib/message';

export class Chat extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS users (
				username TEXT PRIMARY KEY,
				password TEXT NOT NULL,
				identity_pubkey TEXT
			)
		`);
		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS rooms (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				password TEXT NOT NULL
			)
		`);
		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS messages (
				timestamp INTEGER NOT NULL,
				room_id TEXT NOT NULL,
				username TEXT NOT NULL,
				msg TEXT NOT NULL,
				identity_pubkey TEXT,
				signature TEXT,
				PRIMARY KEY (room_id, timestamp)
			)
		`);
	}

	async auth(username: string | undefined, password: string | undefined, identityPubkey: string | undefined) {
		if (!username) {
			return Response.json({
				status: 400,
				error: 'Username is required',
			});
		}
		if (!password) {
			return Response.json({
				status: 400,
				error: 'Password is required',
			});
		}
		if (!identityPubkey) {
			return Response.json({
				status: 400,
				error: 'Username is required',
			});
		}

		try {
			const user = getUser(username, this.ctx.storage.sql);
			if (!user) {
				createUser(username, password, identityPubkey, this.ctx.storage.sql);
				return Response.json({
					status: 200,
					message: 'User created',
				});
			} else if (user.identity_pubkey !== identityPubkey && user.username !== '' && password === user.password) {
				editUser(username, identityPubkey, this.ctx.storage.sql);
				return Response.json({
					status: 200,
					message: 'User edited',
				});
			} else {
				return Response.json({
					status: 200,
					message: 'User with this username already exists',
				});
			}
		} catch (error) {
			return Response.json({
				status: 500,
				error: 'Internal Server Error',
			});
		}
	}

	async createRoom(id: string, name: string, password: string) {
		createRoom(id, name, password, this.ctx.storage.sql);
	}

	async getRoom(id: string) {
		return getRoom(id, this.ctx.storage.sql);
	}

	async updateRoom(id: string, name: string) {
		updateRoom(id, name, this.ctx.storage.sql);
	}

	async writeMessage(
		timestamp: number,
		room_id: string,
		username: string,
		msg: string,
		identity_pubkey: string | null,
		signature: string | null,
	) {
		writeMessage(timestamp, room_id, username, msg, identity_pubkey, signature, this.ctx.storage.sql);
	}

	async getMessagesAfterTimestamp(room_id: string, timestamp: number) {
		return getMessagesAfterTimestamp(room_id, timestamp, this.ctx.storage.sql);
	}

	async updateMessage(room_id: string, timestamp: number, newContent: string) {
		updateMessage(room_id, timestamp, newContent, this.ctx.storage.sql);
	}

	async getUser(username: string) {
		return getUser(username, this.ctx.storage.sql);
	}
}
