import { DurableObject } from 'cloudflare:workers';
import { createUser, editUser, getUser } from './lib/auth';
import { createRoom, getRoom, updateRoom } from './lib/room';
import { ValidRoomOps } from './types/room';

export class Chat extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
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
		super(ctx, env);
	}
	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
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
}

const withCorsHeaders = (res: Response) => {
	const response = res;
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return response;
};

const requirePOST = (request: Request) => {
	if (request.method !== 'POST') {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Method not allowed',
			}),
		);
	}
};

async function handleAuth(request: Request, stub: DurableObjectStub<Chat>) {
	requirePOST(request);
	const formData = await request.formData();
	const username = formData.get('username')?.toString();
	const password = formData.get('password')?.toString();
	const identityPubkey = formData.get('identity_pubkey')?.toString();
	const authResponse = await stub.auth(username, password, identityPubkey);
	return withCorsHeaders(Response.json(await authResponse.json()));
}

async function handleRoom(request: Request, stub: DurableObjectStub<Chat>) {
	requirePOST(request);
	const formData = await request.formData();
	const method = formData.get('method')?.toString();
	if (!ValidRoomOps.includes((method ?? '') as ValidRoomOps)) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Must specify room method (create/edit/get)',
			}),
		);
	}

	const id = formData.get('id')?.toString();
	const name = formData.get('name')?.toString();
	const password = formData.get('password')?.toString();

	if (!id) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Room id is required',
			}),
		);
	}

	switch (method) {
		case 'create':
			if (!name || !password) {
				return withCorsHeaders(
					Response.json({
						status: 400,
						error: 'Must specify room id, name and password',
					}),
				);
			}
			try {
				await stub.createRoom(id, name, password);
				return withCorsHeaders(
					Response.json({
						status: 201,
						message: 'Room created',
					}),
				);
			} catch (error) {
				return withCorsHeaders(
					Response.json({
						status: 500,
						error: 'Cannot create room',
					}),
				);
			}

		case 'edit':
			if (!name || !password) {
				return withCorsHeaders(
					Response.json({
						status: 400,
						error: 'Must specify room id, name and password',
					}),
				);
			}
			try {
				const existingRoom = await stub.getRoom(id);
				if (!existingRoom) {
					return withCorsHeaders(
						Response.json({
							status: 404,
							error: 'Room not found',
						}),
					);
				}
				if (existingRoom.password !== password) {
					return withCorsHeaders(
						Response.json({
							status: 401,
							error: 'Unauthorized: incorrect room password',
						}),
					);
				}
				await stub.updateRoom(id, name);
				return withCorsHeaders(
					Response.json({
						status: 200,
						message: 'Room updated',
					}),
				);
			} catch (error) {
				return withCorsHeaders(
					Response.json({
						status: 500,
						error: 'Cannot edit room',
					}),
				);
			}

		case 'get':
			try {
				const roomData = await stub.getRoom(id);
				if (!roomData) {
					return withCorsHeaders(
						Response.json({
							status: 404,
							error: 'Room not found',
						}),
					);
				}
				return withCorsHeaders(
					Response.json({
						status: 200,
						room: {
							id: roomData.id,
							name: roomData.name,
						},
					}),
				);
			} catch (error) {
				return withCorsHeaders(
					Response.json({
						status: 500,
						error: 'Cannot get room',
					}),
				);
			}

		default:
			return withCorsHeaders(
				Response.json({
					status: 400,
					error: 'Unsupported room method',
				}),
			);
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*', // or 'http://localhost:3000'
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		}
		const url = new URL(request.url);
		const { pathname } = url;
		const stub = env.CHAT_DURABLE_OBJECT.getByName('chat');
		switch (pathname) {
			case '/auth':
				return handleAuth(request, stub);
			case '/room':
				return handleRoom(request, stub);
			default:
				const badRequest = {
					status: 400,
					error: 'This route does not exist',
				};
				return withCorsHeaders(new Response(JSON.stringify(badRequest)));
		}
	},
} satisfies ExportedHandler<Env>;
