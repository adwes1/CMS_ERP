CREATE TABLE "article_variant_links" (
  "article_id" UUID NOT NULL,
  "variant_article_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_variant_links_pkey" PRIMARY KEY ("article_id", "variant_article_id")
);

CREATE INDEX "article_variant_links_variant_article_id_idx" ON "article_variant_links"("variant_article_id");

ALTER TABLE "article_variant_links"
  ADD CONSTRAINT "article_variant_links_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_variant_links"
  ADD CONSTRAINT "article_variant_links_variant_article_id_fkey"
  FOREIGN KEY ("variant_article_id") REFERENCES "articles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_variant_links"
  ADD CONSTRAINT "article_variant_links_not_self_check"
  CHECK ("article_id" <> "variant_article_id");
