// Extend the auto-generated Env with secrets (not included in wrangler types)
export interface AppEnv extends Env {
	MEDIA_BUCKET: R2Bucket;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	CF_ACCOUNT_ID: string;
}
