ALTER TABLE "external_entity_references"
ADD COLUMN "parent_external_id" TEXT;

CREATE INDEX "external_entity_references_parent_external_id_idx"
ON "external_entity_references"("parent_external_id");
