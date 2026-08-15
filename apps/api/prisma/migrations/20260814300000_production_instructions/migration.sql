CREATE TABLE "production_instructions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instruction_number" SERIAL NOT NULL,
  "article_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "completion_date" DATE NOT NULL,
  "part_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_instructions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_instruction_elements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_instruction_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_instruction_elements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_instruction_steps" (
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
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "production_instruction_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_instructions_instruction_number_key" ON "production_instructions"("instruction_number");
CREATE INDEX "production_instructions_article_id_idx" ON "production_instructions"("article_id");
CREATE INDEX "production_instructions_start_date_idx" ON "production_instructions"("start_date");
CREATE UNIQUE INDEX "production_instruction_elements_production_instruction_id_position_key" ON "production_instruction_elements"("production_instruction_id", "position");
CREATE UNIQUE INDEX "production_instruction_steps_element_id_position_key" ON "production_instruction_steps"("element_id", "position");

ALTER TABLE "production_instructions" ADD CONSTRAINT "production_instructions_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_instruction_elements" ADD CONSTRAINT "production_instruction_elements_production_instruction_id_fkey"
  FOREIGN KEY ("production_instruction_id") REFERENCES "production_instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_instruction_steps" ADD CONSTRAINT "production_instruction_steps_element_id_fkey"
  FOREIGN KEY ("element_id") REFERENCES "production_instruction_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
