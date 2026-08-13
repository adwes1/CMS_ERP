ALTER TABLE "external_integrations"
ADD COLUMN "cron_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cron_interval_minutes" INTEGER NOT NULL DEFAULT 15;
