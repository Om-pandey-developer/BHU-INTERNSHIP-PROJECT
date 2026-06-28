-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "trackingId" SET DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text);

-- CreateTable
CREATE TABLE "ReapplyRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hodRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReapplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReapplyRequest_applicantId_idx" ON "ReapplyRequest"("applicantId");

-- CreateIndex
CREATE INDEX "ReapplyRequest_applicationId_idx" ON "ReapplyRequest"("applicationId");

-- CreateIndex
CREATE INDEX "ReapplyRequest_status_idx" ON "ReapplyRequest"("status");

-- AddForeignKey
ALTER TABLE "ReapplyRequest" ADD CONSTRAINT "ReapplyRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReapplyRequest" ADD CONSTRAINT "ReapplyRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
