-- Rename scraper_logs columns from camelCase to snake_case
-- The initial migration was generated before @map() annotations were added to the Prisma schema.
-- This migration aligns the physical column names with the @map() values so that
-- Prisma client queries and the scraper's raw SQL both use the same names.

ALTER TABLE "scraper_logs" RENAME COLUMN "recordsAdded" TO "records_added";
ALTER TABLE "scraper_logs" RENAME COLUMN "errorMessage" TO "error_message";
ALTER TABLE "scraper_logs" RENAME COLUMN "startedAt" TO "started_at";
ALTER TABLE "scraper_logs" RENAME COLUMN "finishedAt" TO "finished_at";
