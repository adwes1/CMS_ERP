CREATE TABLE "external_integrations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_encrypted" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_test_status" TEXT,
    "last_test_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_integrations_name_key" ON "external_integrations"("name");
CREATE INDEX "external_integrations_provider_idx" ON "external_integrations"("provider");
CREATE INDEX "external_integrations_active_idx" ON "external_integrations"("active");
