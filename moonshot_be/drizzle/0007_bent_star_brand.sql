CREATE TABLE IF NOT EXISTS "analysis_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticker" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"report_id" uuid,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "idx_analysis_jobs_user_status" ON "analysis_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analysis_jobs_ticker_created" ON "analysis_jobs" USING btree ("ticker","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_analysis_jobs_status_created" ON "analysis_jobs" USING btree ("status","created_at");
