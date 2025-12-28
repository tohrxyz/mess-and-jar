import { AwsClient } from 'aws4fetch';
import { withCorsHeaders, requirePOST } from '../utils/http';

interface MediaEnv {
	MEDIA_BUCKET: R2Bucket;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	CF_ACCOUNT_ID: string;
}

export async function handleGetUploadUrl(request: Request, env: MediaEnv) {
	requirePOST(request);

	const formData = await request.formData();
	const filename = formData.get('filename')?.toString();
	const contentType = formData.get('content_type')?.toString() || 'application/octet-stream';

	if (!filename) {
		return withCorsHeaders(
			Response.json({
				status: 400,
				error: 'filename is required',
			}),
		);
	}

	// Use the provided filename directly as the key (frontend generates unique IDs)
	const key = filename;

	const r2 = new AwsClient({
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	});

	const bucketName = 'maj-media-bucket';
	const url = new URL(`https://${env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${key}`);
	url.searchParams.set('X-Amz-Expires', '3600'); // 1 hour expiry

	const signed = await r2.sign(
		new Request(url, {
			method: 'PUT',
			headers: {
				'Content-Type': contentType,
			},
		}),
		{
			aws: { signQuery: true },
		},
	);

	return withCorsHeaders(
		Response.json({
			status: 200,
			upload_url: signed.url,
			key,
		}),
	);
}
