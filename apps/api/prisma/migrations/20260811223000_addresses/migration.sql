CREATE TABLE "addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_number" TEXT,
  "type" TEXT NOT NULL DEFAULT 'KUNDE',
  "company" TEXT,
  "salutation" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "street" TEXT,
  "house_number" TEXT,
  "postal_code" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'Deutschland',
  "email" TEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "website" TEXT,
  "tax_number" TEXT,
  "notes" TEXT,
  "bank_data" JSONB,
  "contacts" JSONB,
  "documents" JSONB,
  "purchased_items" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "addresses_company_idx" ON "addresses"("company");
CREATE INDEX "addresses_last_name_idx" ON "addresses"("last_name");
CREATE INDEX "addresses_customer_number_idx" ON "addresses"("customer_number");
