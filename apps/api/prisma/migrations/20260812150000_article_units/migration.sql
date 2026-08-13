CREATE TABLE "article_units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "article_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "article_units_name_key" ON "article_units"("name");

INSERT INTO "article_units" ("name", "updated_at") VALUES
  ('Stück', CURRENT_TIMESTAMP),
  ('Liter', CURRENT_TIMESTAMP),
  ('Meter', CURRENT_TIMESTAMP);

INSERT INTO "article_units" ("name", "updated_at")
SELECT DISTINCT "unit", CURRENT_TIMESTAMP
FROM "articles"
WHERE "unit" NOT IN ('Stk.', 'Stück', 'Liter', 'Meter')
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "articles" ADD COLUMN "unit_id" UUID;

UPDATE "articles"
SET "unit_id" = (
  SELECT "id"
  FROM "article_units"
  WHERE "name" = CASE WHEN "articles"."unit" IN ('Stk.', 'Stück') THEN 'Stück' ELSE "articles"."unit" END
);

ALTER TABLE "articles" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "articles" DROP COLUMN "unit";
CREATE INDEX "articles_unit_id_idx" ON "articles"("unit_id");
ALTER TABLE "articles"
  ADD CONSTRAINT "articles_unit_id_fkey"
  FOREIGN KEY ("unit_id") REFERENCES "article_units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
