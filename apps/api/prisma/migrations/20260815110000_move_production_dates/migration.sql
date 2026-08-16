ALTER TABLE "productions" ADD COLUMN "planned_days" INTEGER;

UPDATE "productions"
SET "planned_days" = ("completion_date" - "start_date") + 1;

ALTER TABLE "productions" ALTER COLUMN "planned_days" SET NOT NULL;

DROP INDEX IF EXISTS "production_instructions_start_date_idx";

-- Die bisherigen Vorlagentermine bleiben aus Gründen der Nachvollziehbarkeit
-- erhalten. Neue Produktionsanweisungen besitzen hier keine Werte mehr.
ALTER TABLE "production_instructions" ALTER COLUMN "start_date" DROP NOT NULL;
ALTER TABLE "production_instructions" ALTER COLUMN "completion_date" DROP NOT NULL;
