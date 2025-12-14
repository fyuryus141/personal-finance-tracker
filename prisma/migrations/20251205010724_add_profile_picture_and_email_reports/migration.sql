-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL DEFAULT '',
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "profilePicture" TEXT,
    "emailReports" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("email", "id", "name", "password", "tier") SELECT "email", "id", "name", "password", "tier" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
