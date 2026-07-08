import { test, expect } from '@playwright/test';

test.describe('Visual Regression Testing', () => {

  test('Login Page Snapshot', async ({ page }) => {
    await page.goto('/login');
    // Wait for any animations to settle
    await page.waitForTimeout(1000);
    // Compare pixel-perfect screenshot
    await expect(page).toHaveScreenshot('login-page-snapshot.png', {
      maxDiffPixels: 100, // Allow tiny anti-aliasing differences
    });
  });

  test('Applicant Dashboard Snapshot', async ({ page }) => {
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'test', role: 'APPLICANT' }
      });
    });

    await page.route('**/api/v1/applications/my', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.goto('/dashboard/applicant');
    await page.waitForSelector('text=New Application');
    await page.waitForTimeout(1000);

    // Hide any dynamic elements like timestamps if necessary
    // Example: await page.evaluate(() => document.querySelector('.time')?.remove());

    await expect(page).toHaveScreenshot('applicant-dashboard-snapshot.png');
  });

});
