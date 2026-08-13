CREATE TABLE "articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "article_number" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'VERKAUFSARTIKEL',
  "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT 'Stk.',
  "vat_rate" TEXT NOT NULL DEFAULT '19',
  "notes" TEXT,
  "purchase_prices" JSONB,
  "sale_prices" JSONB,
  "positions" JSONB,
  "external_numbers" JSONB,
  "files" JSONB,
  "purchasing" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "articles_article_number_key" ON "articles"("article_number");
CREATE INDEX "articles_name_idx" ON "articles"("name");
CREATE INDEX "articles_type_idx" ON "articles"("type");
