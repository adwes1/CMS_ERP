ALTER TABLE "external_integrations"
ADD COLUMN "allow_import" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allow_export" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allow_update" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allow_delete" BOOLEAN NOT NULL DEFAULT false;
