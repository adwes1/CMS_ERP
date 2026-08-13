ALTER TABLE "external_entity_references"
ADD COLUMN "variant_type" TEXT;

ALTER TABLE "article_variant_links"
ADD COLUMN "variant_type" TEXT;
