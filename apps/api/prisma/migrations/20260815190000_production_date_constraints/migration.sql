ALTER TABLE "productions"
  ADD CONSTRAINT "productions_date_order_check"
  CHECK ("completion_date" >= "start_date"),
  ADD CONSTRAINT "productions_planned_days_check"
  CHECK ("planned_days" >= 1 AND "planned_days" = ("completion_date" - "start_date") + 1);
