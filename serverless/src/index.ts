import { Chat } from './durable-objects/Chat';
import { handleAuth } from './handlers/auth';
import { handleRoom } from './handlers/room';
import { handleSendMessage, handleEditMessage, handleQueryMessages } from './handlers/message';
import { handleGetUploadUrl } from './handlers/media';
import { withCorsHeaders } from './utils/http';

export { Chat };

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
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
			case '/send_message':
				return handleSendMessage(request, stub);
			case '/edit_message':
				return handleEditMessage(request, stub);
			case '/query_messages':
				return handleQueryMessages(request, stub);
			case '/get_upload_url':
				return handleGetUploadUrl(request, env);
			default:
				return withCorsHeaders(
					Response.json({
						status: 400,
						error: 'This route does not exist',
					}),
				);
		}
	},
} satisfies ExportedHandler<Env>;
