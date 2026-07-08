import { test, expect } from '@playwright/test';

test.describe('Applicant Flow', () => {
  test('should allow an applicant to navigate to dashboard after login', async ({ page, context }) => {
    await context.addCookies([
      { name: 'token', value: 'dummy-token', url: 'http://localhost:3000' }
    ]);
    
    // Navigate to homepage / login
    await page.goto('/');

    // Assuming we have a direct login route for tests or we can just 
    // click through a mock login in development. 
    // For this e2e, we will just visit the applicant dashboard to ensure it mounts properly
    // Note: If authentication is strictly enforced, this might redirect to login.
    // In Playwright tests, we often use page.route to mock API responses for isolated E2E.
    
    // Mock the session/me API
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

    // Mock applications list
    await page.route('**/api/v1/applications/my-applications', async (route) => {
      const json = {
        success: true,
        data: [] // No applications initially
      };
      await route.fulfill({ json });
    });
    
    // Mock departments list for the new application form
    await page.route('**/api/v1/departments', async (route) => {
      const json = {
        success: true,
        data: [
          { id: 'dept-1', name: 'Computer Science', code: 'CS' }
        ]
      };
      await route.fulfill({ json });
    });

    // Go to applicant dashboard
    await page.goto('/dashboard/applicant');
    
    // Wait for the page to load
    await expect(page.locator('text=My Applications')).toBeVisible();
    await expect(page.locator('text=Apply for New Account')).toBeVisible();

    // Click on apply
    await page.click('text=Apply for New Account');

    // Check if form modal opens
    await expect(page.locator('text=Apply for Email Account')).toBeVisible();
  });
});
