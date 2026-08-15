CREATE TABLE "article_type_settings" (
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "padding" INTEGER NOT NULL DEFAULT 6,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "article_type_settings_pkey" PRIMARY KEY ("type")
);

INSERT INTO "article_type_settings" ("type", "label", "prefix", "next_number", "padding") VALUES
  ('VERKAUFSARTIKEL', 'Einkaufsartikel', 'EK-', 1, 6),
  ('PRODUKTIONSARTIKEL', 'Produktionsartikel', 'PA-', 1, 6),
  ('PRODUKTIONSMATERIAL', 'Produktionsmaterial', 'PM-', 1, 6),
  ('STUECKLISTENARTIKEL', 'Stücklistenartikel', 'SL-', 1, 6),
  ('DIGITAL_DOWNLOAD', 'Digital-Download', 'DD-', 1, 6),
  ('RABATT_GUTSCHEIN', 'Rabatt-Gutschein', 'RG-', 1, 6),
  ('VERSANDGEBUEHREN', 'Versandgebühren', 'VG-', 1, 6);
