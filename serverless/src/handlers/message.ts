import type { Chat } from '../durable-objects/Chat';
import { withCorsHeaders, requirePOST } from '../utils/http';

export async function handleSendMessage(request: Request, stub: DurableObjectStub<Chat>) {
	requirePOST(request);
	const formData = await request.formData();

	const room = formData.get('room')?.toString();
	const username = formData.get('username')?.toString();
	const password = formData.get('password')?.toString();
	const msg = formData.get('msg')?.toString();
	const signature = formData.get('signature')?.toString() ?? null;
	const dateStr = formData.get('date')?.toString();

	if (!room || !username || !password || !msg || !dateStr) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Must specify room, username, password, msg and date',
			}),
		);
	}

	const timestamp = parseInt(dateStr, 10);
	if (isNaN(timestamp)) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Invalid date format',
			}),
		);
	}

	try {
		const user = await stub.getUser(username);
		if (!user) {
			return withCorsHeaders(
				Response.json({
					status: 404,
					error: 'User not found',
				}),
			);
		}
		if (user.password !== password) {
			return withCorsHeaders(
				Response.json({
					status: 401,
					error: 'Wrong password',
				}),
			);
		}

		await stub.writeMessage(timestamp, room, username, msg, user.identity_pubkey ?? null, signature);
		return withCorsHeaders(
			Response.json({
				status: 200,
				message: 'Message sent',
			}),
		);
	} catch (error) {
		return withCorsHeaders(
			Response.json({
				status: 500,
				error: "Can't save your message",
			}),
		);
	}
}

export async function handleEditMessage(request: Request, stub: DurableObjectStub<Chat>) {
	requirePOST(request);
	const formData = await request.formData();

	const room = formData.get('room')?.toString();
	const timestampStr = formData.get('timestamp')?.toString();
	const editedContent = formData.get('edited_content')?.toString();

	if (!room || !timestampStr || !editedContent) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'room, timestamp and edited_content are required',
			}),
		);
	}

	const timestamp = parseInt(timestampStr, 10);
	if (isNaN(timestamp)) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Invalid timestamp format',
			}),
		);
	}

	try {
		await stub.updateMessage(room, timestamp, editedContent);
		return withCorsHeaders(
			Response.json({
				status: 200,
				message: 'Message updated',
			}),
		);
	} catch (error) {
		return withCorsHeaders(
			Response.json({
				status: 500,
				error: "Can't update message",
			}),
		);
	}
}

export async function handleQueryMessages(request: Request, stub: DurableObjectStub<Chat>) {
	const url = new URL(request.url);
	const room = url.searchParams.get('room');
	const timestampStr = url.searchParams.get('timestamp') ?? '0';

	if (!room) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Room is required',
			}),
		);
	}

	const timestamp = parseInt(timestampStr, 10);

	try {
		const messages = await stub.getMessagesAfterTimestamp(room, timestamp);
		return withCorsHeaders(
			Response.json({
				status: 200,
				messages,
			}),
		);
	} catch (error) {
		return withCorsHeaders(
			Response.json({
				status: 500,
				error: "Can't read the room history",
			}),
		);
	}
}
