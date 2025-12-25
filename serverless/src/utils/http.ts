export const withCorsHeaders = (res: Response) => {
	const response = res;
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return response;
};

export const requirePOST = (request: Request) => {
	if (request.method !== 'POST') {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'Method not allowed',
			}),
		);
	}
};
