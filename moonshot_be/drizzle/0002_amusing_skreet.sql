ALTER TABLE "auth_users" ADD COLUMN IF NOT EXISTS "refresh_token_hash" text;
