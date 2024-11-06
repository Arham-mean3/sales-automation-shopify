-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesType" TEXT NOT NULL,
    "saleTags" TEXT NOT NULL,
    "salesTitle" TEXT NOT NULL,
    "salesValue" TEXT NOT NULL,
    "sDate" DATETIME NOT NULL,
    "eDate" DATETIME NOT NULL,
    "stime" TEXT NOT NULL,
    "etime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SalesProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SalesProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SalesProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_SalesProducts_AB_unique" ON "_SalesProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_SalesProducts_B_index" ON "_SalesProducts"("B");
