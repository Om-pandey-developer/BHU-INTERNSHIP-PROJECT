-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "trackingId" SET DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text);
