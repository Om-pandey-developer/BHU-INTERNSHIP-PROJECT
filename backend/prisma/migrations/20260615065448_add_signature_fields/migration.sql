-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "approvedPdfPath" TEXT,
ADD COLUMN     "digitalSignatureHash" TEXT,
ADD COLUMN     "signatureStoragePath" TEXT,
ALTER COLUMN "trackingId" SET DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureStoragePath" TEXT;

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OtpVerification_email_key" ON "OtpVerification"("email");

-- CreateIndex
CREATE INDEX "OtpVerification_email_idx" ON "OtpVerification"("email");

-- CreateIndex
CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");
