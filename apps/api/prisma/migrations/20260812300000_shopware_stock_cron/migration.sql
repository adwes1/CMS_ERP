ALTER TABLE "external_integrations"
ADD COLUMN "last_stock_sync_at" TIMESTAMP(3),
ADD COLUMN "last_stock_sync_status" TEXT,
ADD COLUMN "last_stock_sync_message" TEXT;
