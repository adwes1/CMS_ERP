CREATE TABLE "specifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "specifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "specifications_name_key" ON "specifications"("name");

ALTER TABLE "addresses" ADD COLUMN "specification_id" UUID;
CREATE INDEX "addresses_specification_id_idx" ON "addresses"("specification_id");
ALTER TABLE "addresses"
  ADD CONSTRAINT "addresses_specification_id_fkey"
  FOREIGN KEY ("specification_id") REFERENCES "specifications"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "specifications" ("name") VALUES ('Shop');
