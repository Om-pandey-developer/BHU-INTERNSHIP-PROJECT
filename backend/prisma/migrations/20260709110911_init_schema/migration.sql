-- CreateEnum
CREATE TYPE "Role" AS ENUM ('APPLICANT', 'HOD', 'DEAN', 'CC_ADMIN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PENDING_HOD', 'APPROVED_HOD', 'REJECTED_HOD', 'PENDING_DEAN', 'APPROVED_DEAN', 'REJECTED_DEAN', 'PENDING_CC', 'PROVISIONED', 'FAILED_PROVISIONING', 'REJECTED_CC', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "alternateEmail" TEXT NOT NULL,
    "bhuEmail" TEXT,
    "passwordHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'APPLICANT',
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "signatureStoragePath" TEXT,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleExpiryDate" TIMESTAMP(3),
    "retirementDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hodId" TEXT,
    "deanId" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL DEFAULT concat('BHU-', to_char(now(), 'YYYYMMDD'), '-', floor(random() * 9000 + 1000)::text),
    "applicantId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_HOD',
    "applicantDetails" JSONB NOT NULL,
    "photoStoragePath" TEXT NOT NULL,
    "signatureStoragePath" TEXT,
    "hodId" TEXT,
    "hodRemarks" TEXT,
    "hodApprovedAt" TIMESTAMP(3),
    "deanId" TEXT,
    "deanRemarks" TEXT,
    "deanApprovedAt" TIMESTAMP(3),
    "digitalSignatureHash" TEXT,
    "approvedPdfPath" TEXT,
    "ccAdminRemarks" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "quotaAssignedGB" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expectedExpiryDate" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ReapplyRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rollEmployeeId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hodRemarks" TEXT,
    "deanRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReapplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentRequest" (
    "id" TEXT NOT NULL,
    "requestedName" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_alternateEmail_key" ON "User"("alternateEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_bhuEmail_key" ON "User"("bhuEmail");

-- CreateIndex
CREATE INDEX "User_alternateEmail_idx" ON "User"("alternateEmail");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_hodId_key" ON "Department"("hodId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_trackingId_key" ON "Application"("trackingId");

-- CreateIndex
CREATE INDEX "Application_status_departmentId_idx" ON "Application"("status", "departmentId");

-- CreateIndex
CREATE INDEX "Application_applicantId_idx" ON "Application"("applicantId");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "AuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OtpVerification_email_key" ON "OtpVerification"("email");

-- CreateIndex
CREATE INDEX "OtpVerification_email_idx" ON "OtpVerification"("email");

-- CreateIndex
CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "ReapplyRequest_applicantId_idx" ON "ReapplyRequest"("applicantId");

-- CreateIndex
CREATE INDEX "ReapplyRequest_applicationId_idx" ON "ReapplyRequest"("applicationId");

-- CreateIndex
CREATE INDEX "ReapplyRequest_status_idx" ON "ReapplyRequest"("status");

-- CreateIndex
CREATE INDEX "DepartmentRequest_status_idx" ON "DepartmentRequest"("status");

-- CreateIndex
CREATE INDEX "DepartmentRequest_applicantId_idx" ON "DepartmentRequest"("applicantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_deanId_fkey" FOREIGN KEY ("deanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReapplyRequest" ADD CONSTRAINT "ReapplyRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReapplyRequest" ADD CONSTRAINT "ReapplyRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRequest" ADD CONSTRAINT "DepartmentRequest_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
