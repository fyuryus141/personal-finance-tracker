/*
  Warnings:

  - Added the required column `plaidItemId` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BankAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "plaidItemId" INTEGER NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BankAccount_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BankAccount" ("balance", "id", "name", "plaidAccountId", "type", "userId") SELECT "balance", "id", "name", "plaidAccountId", "type", "userId" FROM "BankAccount";
DROP TABLE "BankAccount";
ALTER TABLE "new_BankAccount" RENAME TO "BankAccount";
CREATE UNIQUE INDEX "BankAccount_plaidAccountId_key" ON "BankAccount"("plaidAccountId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_plaidItemId_key" ON "PlaidItem"("plaidItemId");
