-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'PENDING_DEAN';
ALTER TYPE "ApplicationStatus" ADD VALUE 'APPROVED_DEAN';
ALTER TYPE "ApplicationStatus" ADD VALUE 'REJECTED_DEAN';
ALTER TYPE "ApplicationStatus" ADD VALUE 'REJECTED_CC';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DEAN';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "expectedExpiryDate" TIMESTAMP(3),
ALTER COLUMN "trackingId" SET DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text);

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "deanId" TEXT;
