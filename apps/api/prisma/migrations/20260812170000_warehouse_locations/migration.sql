CREATE TABLE "warehouse_locations" (
  "id" UUID NOT NULL,
  "location" TEXT NOT NULL,
  "shelf" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "warehouse_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "warehouse_locations_location_shelf_position_key"
  ON "warehouse_locations"("location", "shelf", "position");

CREATE INDEX "warehouse_locations_location_idx" ON "warehouse_locations"("location");
