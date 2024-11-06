/*
  Warnings:

  - A unique constraint covering the columns `[pId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN "pId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_pId_key" ON "Product"("pId");
