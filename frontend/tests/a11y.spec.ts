import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (A11y) Checks', () => {

  test('Login Page should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/login'); // Assuming there's a login route
    
    // Using AxeBuilder to analyze the page
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    // Expect violations array to be empty
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Applicant Dashboard should be accessible', async ({ page }) => {
    // Mock authentication
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
    
    // Wait for main content to load
    await page.waitForSelector('text=New Application');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

});
