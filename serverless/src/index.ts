import { DurableObject } from "cloudflare:workers";
import { createUser, editUser, getUser } from "./lib/auth";

export class Chat extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS users (
				username TEXT PRIMARY KEY,
				password TEXT NOT NULL,
				identity_pubkey TEXT
			)
		`)
		super(ctx, env);
	}
	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
	}

	async auth(
		username: string | undefined,
		password: string | undefined,
		identityPubkey: string | undefined
	) {
		if (!username) {
			return Response.json({
				status: 400,
				error: "Username is required"
			})
		}
		if (!password) {
			return Response.json({
				status: 400,
				error: "Password is required"
			})
		}
		if (!identityPubkey) {
			return Response.json({
				status: 400,
				error: "Username is required"
			})
		}

		try {
			const user = getUser(username, this.ctx.storage.sql)
			if (!user) {
				createUser(
					username,
					password,
					identityPubkey,
					this.ctx.storage.sql
				)
				return Response.json({
					status: 200,
					message: "User created"
				})
			} else if (
				user.identity_pubkey !== identityPubkey &&
				(user.username !== "" && password === user.password)
			) {
				editUser(username, identityPubkey, this.ctx.storage.sql)
				return Response.json({
					status: 200,
					message: "User edited"
				})
			}
			else {
				return Response.json({
					status: 200,
					message: "User with this username already exists"
				})
			}
		} catch (error) {
			return Response.json({
				status: 500,
				error: "Internal Server Error"
			})
		}
	}
}

const withCorsHeaders = (res: Response) => {
	const response = res
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return response
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
		const url = new URL(request.url)
		const { pathname } = url
		const stub = env.CHAT_DURABLE_OBJECT.getByName("chat")
		switch (pathname) {
			case "/auth":
				if (request.method !== "POST") {
					return withCorsHeaders(Response.json({
						status: 400,
						error: "Method not allowed"
					}))
				}
				const formData = await request.formData()
				const username = formData.get("username")?.toString()
				const password = formData.get("password")?.toString()
				const identityPubkey = formData.get("identity_pubkey")?.toString()
				const authResponse = await stub.auth(username, password, identityPubkey)
				return withCorsHeaders(Response.json(await authResponse.json()))
			default:
				const badRequest = {
					status: 400,
					error: "This route does not exist"
				}
				return withCorsHeaders(new Response(JSON.stringify(badRequest)))
		}
	},
} satisfies ExportedHandler<Env>;
