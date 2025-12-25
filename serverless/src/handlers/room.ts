import type { Chat } from '../durable-objects/Chat';
import { withCorsHeaders, requirePOST } from '../utils/http';
import { ValidRoomOps } from '../types/room';

export async function handleRoom(request: Request, stub: DurableObjectStub<Chat>) {
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
							password: roomData.password,
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
