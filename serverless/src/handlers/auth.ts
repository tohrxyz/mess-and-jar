import type { Chat } from '../durable-objects/Chat';
import { withCorsHeaders, requirePOST } from '../utils/http';

export async function handleAuth(request: Request, stub: DurableObjectStub<Chat>) {
	requirePOST(request);
	const formData = await request.formData();
	const username = formData.get('username')?.toString();
	const password = formData.get('password')?.toString();
	const identityPubkey = formData.get('identity_pubkey')?.toString();
	const authResponse = await stub.auth(username, password, identityPubkey);
	return withCorsHeaders(Response.json(await authResponse.json()));
}
