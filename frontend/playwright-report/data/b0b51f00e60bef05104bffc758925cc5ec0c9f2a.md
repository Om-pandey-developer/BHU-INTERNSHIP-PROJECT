# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: applicant-flow.spec.ts >> Applicant Flow >> should allow an applicant to navigate to dashboard after login
- Location: tests\applicant-flow.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=My Applications')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=My Applications')

```

```yaml
- alert
- img "BHU Campus Buildings"
- heading "Banaras Hindu University" [level=1]
- paragraph: Capital of Knowledge
- text: mail Institutional Email Registration Portal verified_user Automated @bhu.ac.in Provisioning speed Fast, Paperless Digital Workflow
- img "BHU Logo"
- heading "Welcome back" [level=2]
- paragraph: This portal is for HOD, Teaching Staff, Non-Teaching Staff, Non-Teaching Group A, CC Admin, and others. Sign in with your alternate email to access the portal.
- text: mail
- textbox "Email Address"
- text: Email Address lock
- textbox "Password"
- text: Password
- button "visibility"
- button "login Sign In"
- paragraph: Test Accounts (Click to auto-fill)
- button "Applicant"
- button "HOD"
- button "Dean"
- button "Admin"
- button "Forgot your password?"
- link "Don't have an account? Register here":
  - /url: /register
- paragraph: © 2026 Banaras Hindu University — Computer Centre
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Applicant Flow', () => {
  4  |   test('should allow an applicant to navigate to dashboard after login', async ({ page }) => {
  5  |     // Navigate to homepage / login
  6  |     await page.goto('/');
  7  | 
  8  |     // Assuming we have a direct login route for tests or we can just 
  9  |     // click through a mock login in development. 
  10 |     // For this e2e, we will just visit the applicant dashboard to ensure it mounts properly
  11 |     // Note: If authentication is strictly enforced, this might redirect to login.
  12 |     // In Playwright tests, we often use page.route to mock API responses for isolated E2E.
  13 |     
  14 |     // Mock the session/me API
  15 |     await page.route('**/api/v1/auth/me', async (route) => {
  16 |       const json = {
  17 |         success: true,
  18 |         data: {
  19 |           id: 'mock-applicant-id',
  20 |           firstName: 'Test',
  21 |           lastName: 'Applicant',
  22 |           alternateEmail: 'test@gmail.com',
  23 |           role: 'APPLICANT'
  24 |         }
  25 |       };
  26 |       await route.fulfill({ json });
  27 |     });
  28 | 
  29 |     // Mock applications list
  30 |     await page.route('**/api/v1/applications/my-applications', async (route) => {
  31 |       const json = {
  32 |         success: true,
  33 |         data: [] // No applications initially
  34 |       };
  35 |       await route.fulfill({ json });
  36 |     });
  37 |     
  38 |     // Mock departments list for the new application form
  39 |     await page.route('**/api/v1/departments', async (route) => {
  40 |       const json = {
  41 |         success: true,
  42 |         data: [
  43 |           { id: 'dept-1', name: 'Computer Science', code: 'CS' }
  44 |         ]
  45 |       };
  46 |       await route.fulfill({ json });
  47 |     });
  48 | 
  49 |     // Go to applicant dashboard
  50 |     await page.goto('/dashboard/applicant');
  51 |     
  52 |     // Wait for the page to load
> 53 |     await expect(page.locator('text=My Applications')).toBeVisible();
     |                                                        ^ Error: expect(locator).toBeVisible() failed
  54 |     await expect(page.locator('text=Apply for New Account')).toBeVisible();
  55 | 
  56 |     // Click on apply
  57 |     await page.click('text=Apply for New Account');
  58 | 
  59 |     // Check if form modal opens
  60 |     await expect(page.locator('text=Apply for Email Account')).toBeVisible();
  61 |   });
  62 | });
  63 | 
```