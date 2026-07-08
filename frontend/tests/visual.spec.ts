import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {
  test('Login page visual comparison', async ({ page }) => {
    // Navigate to the login page (or any accessible public route)
    await page.goto('/');

    // Wait for the page to be fully loaded (e.g. looking for the email input)
    await page.waitForSelector('input[type="email"]');

    // Take a screenshot and compare it with the baseline snapshot.
    // In Playwright, if the baseline doesn't exist, it creates one on the first run.
    // Run `npx playwright test --update-snapshots` to explicitly update baselines.
    expect(await page.screenshot()).toMatchSnapshot('login-page-baseline.png');
  });

  test('StatusBadge visual comparison', async ({ page }) => {
    // Navigate to a page where StatusBadge is rendered
    // Since we mock API calls for isolated tests, we can use a component testing 
    // setup or navigate to a mocked dashboard.
    // Here we'll do a basic page snapshot of a mocked applicant dashboard
    await page.route('**/api/v1/auth/me', async (route) => {
        const json = {
          success: true,
          data: {
            id: 'mock-applicant-id',
            firstName: 'Test',
            lastName: 'Applicant',
            alternateEmail: 'test@gmail.com',
            role: 'APPLICANT'
          }
        };
        await route.fulfill({ json });
    });
  
    await page.route('**/api/v1/applications/my-applications', async (route) => {
        const json = {
          success: true,
          data: [
              { id: '1', trackingId: 'TRK-VISUAL-1', status: 'PENDING_HOD' }
          ]
        };
        await route.fulfill({ json });
    });

    await page.context().addCookies([
        { name: 'token', value: 'dummy-token', url: 'http://localhost:3000' }
    ]);
  
    await page.goto('/dashboard/applicant');
    
    // Wait for applications table/list to load
    await page.waitForSelector('text=PENDING HOD');

    // Screenshot the specific element (table or card container) if possible, or full page
    expect(await page.screenshot()).toMatchSnapshot('applicant-dashboard-baseline.png');
  });
});
