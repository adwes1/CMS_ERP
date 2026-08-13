CREATE TABLE "external_entity_references" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "address_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_entity_references_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_import_jobs" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "page" INTEGER NOT NULL DEFAULT 1,
    "batch_size" INTEGER NOT NULL DEFAULT 25,
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "customer_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_entity_references_integration_id_entity_type_external_id_key"
ON "external_entity_references"("integration_id", "entity_type", "external_id");
CREATE INDEX "external_entity_references_address_id_idx" ON "external_entity_references"("address_id");
CREATE INDEX "customer_import_jobs_integration_id_status_idx" ON "customer_import_jobs"("integration_id", "status");

ALTER TABLE "external_entity_references"
ADD CONSTRAINT "external_entity_references_integration_id_fkey"
FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_entity_references"
ADD CONSTRAINT "external_entity_references_address_id_fkey"
FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_import_jobs"
ADD CONSTRAINT "customer_import_jobs_integration_id_fkey"
FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
