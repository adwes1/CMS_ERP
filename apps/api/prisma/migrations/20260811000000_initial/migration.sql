CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "user_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "identity_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "display_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_identity_id_key" ON "user_profiles"("identity_id");

