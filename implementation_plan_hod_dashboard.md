# Goal Description

Create a dedicated workflow for Department HODs to login, view email approval requests specific to their department, digitally sign them, and have the approved status (and signature) reflect on the applicant's user dashboard.

## User Review Required

> [!IMPORTANT]
> The plan has been updated to reflect your feedback:
> - HOD uploads signature once during onboarding.
> - Clicking "Approve" automatically applies the signature and a cryptographic hologram.
> - The final PDF is generated on the backend with both signatures.
> - HODs will be onboarded via the CC Admin to prevent unauthorized access.
> 
> Please review the **Proposed Changes** below, specifically the HOD Onboarding Flow, and let me know if this aligns with your vision.

## Open Questions

> [!WARNING]
> None at the moment. We are ready to proceed once you approve this finalized plan.

## Proposed Changes

### 1. Database Schema (`backend/prisma/schema.prisma`)
#### [MODIFY] `schema.prisma`
- Add `signatureStoragePath String?` to the `User` model to store the HOD's physical signature image safely.
- Add `digitalSignatureHash String?` to the `Application` model. This will store a unique cryptographic hash (SHA-256) generated when the HOD approves it, ensuring document integrity.

### 2. HOD Onboarding & Login Strategy
- **Onboarding (Admin Action):** HODs will NOT self-register. The CC Admin will create HOD accounts from the Admin Dashboard, assign them to a `Department`, and provide their initial credentials. 
- **Signature Upload:** When the HOD logs in for the first time, they will be prompted to upload their physical signature image in their `Settings`. This image will be stored in a secured, non-public directory on the server.
- **Dedicated Login UI:** We will create a visually distinct `/hod/login` page on the frontend for HODs. Under the hood, it uses the same secure authentication as applicants but strictly verifies `role === 'HOD'` upon successful login, redirecting them to the HOD Dashboard.

### 3. Backend API Updates
#### [MODIFY] `backend/src/modules/applications/applications.controller.ts` & `applications.service.ts`
- Update the `PATCH /api/v1/applications/:id/hod-status` route. When status is `APPROVED_HOD`:
  1. Fetch the HOD's securely stored signature from the `User` model.
  2. Generate a cryptographic hash using the application data, timestamp, and HOD ID.
  3. Trigger the PDF Generation service to create the final PDF, embedding the Applicant's signature, the HOD's signature, and a "Digitally Signed & Approved" hologram stamp containing the hash.
  4. Save the generated PDF path to the application record.

#### [NEW] `backend/src/modules/users/users.controller.ts`
- Add endpoints for the HOD to securely upload and update their signature (`POST /api/v1/users/me/signature`).

#### [NEW] `backend/src/modules/pdf/pdf.service.ts`
- Integrate PDF generation on the backend. This service will take the application JSON data and the signature paths, and use a library (like `puppeteer` or `pdfkit`) to generate the official A4 form layout server-side.

### 4. Frontend - HOD Dashboard (`frontend/src/app/dashboard/hod`)
#### [MODIFY] `frontend/src/app/dashboard/hod/page.tsx`
- The "Approve" button will simply trigger the approval. The system will handle the automated fetching and placing of the signature.
- If the HOD hasn't uploaded a signature yet, the UI will block approval and prompt them to visit their Settings to upload it.

### 5. Frontend - User Dashboard (`frontend/src/app/dashboard/applicant`)
#### [MODIFY] `frontend/src/app/dashboard/applicant/page.tsx`
- Display the status as "Digitally Signed & Approved by HOD".
- Provide a button to download the finalized, stamped PDF document directly from the server.

## Verification Plan

### Manual Verification
1. **Admin Flow:** Admin creates an HOD account.
2. **HOD Flow:** HOD logs in via the dedicated HOD login page, uploads their signature in settings, and approves an application.
3. **PDF Generation:** Verify that upon approval, the backend correctly generates the PDF with both signatures and the cryptographic text.
4. **User Flow:** Applicant downloads the PDF and verifies the placement of the signatures and hologram.
