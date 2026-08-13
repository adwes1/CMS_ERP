ALTER TABLE "external_entity_references" ADD COLUMN "article_id" UUID;

CREATE TABLE "article_import_jobs" (
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

    CONSTRAINT "article_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_entity_references_article_id_idx" ON "external_entity_references"("article_id");
CREATE INDEX "article_import_jobs_integration_id_status_idx" ON "article_import_jobs"("integration_id", "status");

ALTER TABLE "external_entity_references"
ADD CONSTRAINT "external_entity_references_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_import_jobs"
ADD CONSTRAINT "article_import_jobs_integration_id_fkey"
FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
