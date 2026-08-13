ALTER TABLE "articles" ADD COLUMN "stock_entries" JSONB;

UPDATE "articles"
SET "stock_entries" = jsonb_build_array(
  jsonb_build_object(
    'warehouseLocation', 'Hauptlager',
    'stock', "stock"::TEXT,
    'minimumStock', '0'
  )
);
