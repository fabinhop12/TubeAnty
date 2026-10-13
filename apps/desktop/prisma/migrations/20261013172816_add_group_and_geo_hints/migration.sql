-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "group" TEXT;

-- AlterTable
ALTER TABLE "Proxy" ADD COLUMN "lastCountryCode" TEXT;
ALTER TABLE "Proxy" ADD COLUMN "lastLocale" TEXT;
ALTER TABLE "Proxy" ADD COLUMN "lastTimezone" TEXT;
