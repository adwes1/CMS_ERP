CREATE SEQUENCE "addresses_address_number_seq" START WITH 1 INCREMENT BY 1;

ALTER TABLE "addresses" ADD COLUMN "address_number" INTEGER;
UPDATE "addresses" SET "address_number" = nextval('"addresses_address_number_seq"');
ALTER TABLE "addresses" ALTER COLUMN "address_number" SET DEFAULT nextval('"addresses_address_number_seq"');
ALTER TABLE "addresses" ALTER COLUMN "address_number" SET NOT NULL;
ALTER SEQUENCE "addresses_address_number_seq" OWNED BY "addresses"."address_number";

CREATE UNIQUE INDEX "addresses_address_number_key" ON "addresses"("address_number");
