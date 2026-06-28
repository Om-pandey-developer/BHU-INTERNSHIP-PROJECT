-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "approvedPdfPath" TEXT,
ADD COLUMN     "digitalSignatureHash" TEXT,
ADD COLUMN     "signatureStoragePath" TEXT,
ALTER COLUMN "trackingId" SET DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureStoragePath" TEXT;

