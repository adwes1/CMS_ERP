CREATE TABLE "productions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_number" SERIAL NOT NULL,
  "production_instruction_id" UUID NOT NULL,
  "instruction_number" INTEGER NOT NULL,
  "article_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "completion_date" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "productions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_elements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_elements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "element_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "work_type" TEXT NOT NULL,
  "control_active" BOOLEAN NOT NULL DEFAULT true,
  "employee_instruction" TEXT,
  "employee_instruction_active" BOOLEAN NOT NULL DEFAULT false,
  "confirmation_required" BOOLEAN NOT NULL DEFAULT false,
  "planned_hours" INTEGER NOT NULL DEFAULT 0,
  "planned_minutes" INTEGER NOT NULL DEFAULT 0,
  "time_estimate_active" BOOLEAN NOT NULL DEFAULT false,
  "timer_hours" INTEGER NOT NULL DEFAULT 0,
  "timer_minutes" INTEGER NOT NULL DEFAULT 0,
  "timer_active" BOOLEAN NOT NULL DEFAULT false,
  "serial_number_mode" TEXT NOT NULL DEFAULT 'NONE',
  "serial_number_active" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "productions_production_number_key" ON "productions"("production_number");
CREATE INDEX "productions_production_instruction_id_idx" ON "productions"("production_instruction_id");
CREATE INDEX "productions_article_id_idx" ON "productions"("article_id");
CREATE INDEX "productions_status_idx" ON "productions"("status");
CREATE UNIQUE INDEX "production_elements_production_id_position_key" ON "production_elements"("production_id", "position");
CREATE UNIQUE INDEX "production_steps_element_id_position_key" ON "production_steps"("element_id", "position");

ALTER TABLE "productions" ADD CONSTRAINT "productions_production_instruction_id_fkey"
  FOREIGN KEY ("production_instruction_id") REFERENCES "production_instructions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "productions" ADD CONSTRAINT "productions_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_elements" ADD CONSTRAINT "production_elements_production_id_fkey"
  FOREIGN KEY ("production_id") REFERENCES "productions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_steps" ADD CONSTRAINT "production_steps_element_id_fkey"
  FOREIGN KEY ("element_id") REFERENCES "production_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
