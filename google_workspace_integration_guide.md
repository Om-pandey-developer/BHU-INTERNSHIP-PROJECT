# BHU Google Workspace & Data Centre Integration Guide

This document outlines the step-by-step process to connect the BHU Email Portal to the official **Google Workspace Admin Directory API** (for auto-provisioning @bhu.ac.in emails) and the **BHU Data Centre** (for internal employee verification/LDAP).

---

## 1. Google Workspace Integration (Auto-Provisioning)

Currently, the application runs in `MOCK MODE`. To switch to live provisioning, you must replace the mocked logic with the actual Google `googleapis` SDK.

### Step 1.1: Install Dependencies
Run the following command in your backend directory to install the official Google APIs client:
```bash
cd backend
npm install googleapis
```

### Step 2.2: Setup Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "BHU Email Provisioning").
3. Enable the **Admin SDK API**.
4. Create **Service Account Credentials**, generate a JSON key file, and save it in your backend root as `google-service-account.json`.
5. In your Google Workspace Admin console, grant this Service Account **Domain-Wide Delegation** with the scope `https://www.googleapis.com/auth/admin.directory.user`.

### Step 3.3: Configure Environment Variables
Update your backend `.env` file:
```env
MOCK_GOOGLE_WORKSPACE=false
GOOGLE_DOMAIN=bhu.ac.in
GOOGLE_ADMIN_DELEGATE_EMAIL=admin@bhu.ac.in
GOOGLE_APPLICATION_CREDENTIALS=./google-service-account.json
```

### Step 4.4: Update `google-workspace.service.ts`
Open your code editor and navigate to:
[backend/src/modules/google-workspace/google-workspace.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/google-workspace/google-workspace.service.ts#L100-L105)

**Locate lines 100-105:**
```typescript
      if (this.isMock) {
        // Mock code...
      } else {
        // TODO: Implement real Google Admin Directory API call
        throw new Error('Real Google API integration not yet implemented');
      }
```

**Replace it with the following code:**
```typescript
      if (this.isMock) {
        this.logger.log(`[MOCK] Provisioned: ${bhuEmail}`);
      } else {
        // 1. Import the library
        const { google } = require('googleapis');
        
        // 2. Initialize Google Auth using the Service Account
        const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
          clientOptions: {
            subject: process.env.GOOGLE_ADMIN_DELEGATE_EMAIL, // Must be an actual super-admin email
          }
        });

        // 3. Initialize the Admin Directory Client
        const admin = google.admin({ version: 'directory_v1', auth });

        // 4. Create the User in Google Workspace
        await admin.users.insert({
          requestBody: {
            primaryEmail: bhuEmail,
            password: tempPassword,
            name: {
              givenName: firstName,
              familyName: lastName,
            },
            changePasswordAtNextLogin: true, // Forces user to set their own password immediately
            orgUnitPath: '/', // Or a specific department path like '/Faculty'
          },
        });

        this.logger.log(`✅ Successfully created ${bhuEmail} in Google Workspace`);
      }
```

---

## 2. BHU Data Centre / LDAP Integration (Employee Verification)

Before granting an email, the BHU Data Centre must verify if the `employeeId` or `enrollmentNo` is legitimate. 

### Step 2.1: Where to Implement
This logic belongs in the **Applications Service** when an application is initially submitted.
File: [backend/src/modules/applications/applications.service.ts](file:///c:/Users/Lenovo/OneDrive/Desktop/BHU%20INTERNSHIP%20PROJECT/backend/src/modules/applications/applications.service.ts#L93-L100)

### Step 2.2: Implementation Approach (REST API vs LDAP)
If the BHU Data Centre provides a REST API, you can use `axios` to verify the ID.

**Add this check around line 100 (before creating the application in the DB):**
```typescript
    // Example: Verification against BHU Data Centre API
    const isEmployee = details.category === 'TEACHING_STAFF' || details.category === 'NON_TEACHING_STAFF';
    const idToVerify = isEmployee ? details.employeeId : details.enrollmentNo;

    try {
      const bhuResponse = await axios.post('https://datacenter.bhu.ac.in/api/verify-user', {
        id: idToVerify,
        dob: details.dateOfBirth
      }, {
        headers: { 'Authorization': `Bearer ${process.env.BHU_API_KEY}` }
      });

      if (!bhuResponse.data.isValid) {
         throw new BadRequestException('Verification failed: Employee ID / Enrollment Number does not exist in BHU Data Centre records.');
      }
    } catch (err) {
       throw new InternalServerErrorException('BHU Data Centre is currently unreachable. Please try again later.');
    }
```

> [!IMPORTANT]
> If BHU uses an old-school **LDAP/Active Directory** instead of a REST API, you will need to install the `ldapjs` package (`npm install ldapjs`) and perform an LDAP bind/search against the university's domain controller `ldap://dc.bhu.ac.in`.

## Summary
By following these steps:
1. You remove the manual provisioning step entirely.
2. The moment an HOD approves an application, the backend will talk directly to Google Servers and instantly create the `bhu.ac.in` inbox.
3. The BHU Data Centre check guarantees that no fake applications ever reach the HOD in the first place.
