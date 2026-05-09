/*
  Warnings:

  - You are about to drop the column `carYear` on the `scraped_part_prices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[partName,carMake,carModel,grade]` on the table `scraped_part_prices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `grade` to the `scraped_part_prices` table without a default value. This is not possible if the table is not empty.
  - Made the column `carMake` on table `scraped_part_prices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `carModel` on table `scraped_part_prices` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PartGrade" AS ENUM ('GENUINE', 'AFTERMARKET', 'USED');

-- DropIndex
DROP INDEX "scraped_part_prices_partName_carMake_idx";

-- AlterTable
ALTER TABLE "scraped_part_prices" DROP COLUMN "carYear",
ADD COLUMN     "grade" "PartGrade" NOT NULL,
ALTER COLUMN "carMake" SET NOT NULL,
ALTER COLUMN "carModel" SET NOT NULL;

-- CreateIndex
CREATE INDEX "scraped_part_prices_partName_carMake_carModel_grade_idx" ON "scraped_part_prices"("partName", "carMake", "carModel", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "scraped_part_prices_partName_carMake_carModel_grade_key" ON "scraped_part_prices"("partName", "carMake", "carModel", "grade");
