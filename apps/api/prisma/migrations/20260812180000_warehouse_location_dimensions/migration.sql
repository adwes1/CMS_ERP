ALTER TABLE "warehouse_locations"
  ADD COLUMN "max_weight" DECIMAL(12, 3),
  ADD COLUMN "length" DECIMAL(12, 3),
  ADD COLUMN "width" DECIMAL(12, 3),
  ADD COLUMN "depth" DECIMAL(12, 3);
