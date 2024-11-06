/*
  Warnings:

  - Added the required column `status` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesType" TEXT NOT NULL,
    "saleTags" TEXT NOT NULL,
    "salesTitle" TEXT NOT NULL,
    "salesValue" TEXT NOT NULL,
    "sDate" DATETIME NOT NULL,
    "eDate" DATETIME NOT NULL,
    "stime" TEXT NOT NULL,
    "etime" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sale" ("createdAt", "eDate", "etime", "id", "sDate", "saleTags", "salesTitle", "salesType", "salesValue", "stime", "updatedAt") SELECT "createdAt", "eDate", "etime", "id", "sDate", "saleTags", "salesTitle", "salesType", "salesValue", "stime", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
