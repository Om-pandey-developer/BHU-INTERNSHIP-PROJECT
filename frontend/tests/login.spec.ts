import { test, expect } from '@playwright/test';

test('has title and login flow basic check', async ({ page }) => {
  // Go to the home page
  await page.goto('/');

  // Expect a title "to contain" a substring (assuming standard title or adjust later).
  await expect(page).toHaveTitle(/BHU|App/i);

  // Click the Login link/button (assuming there is a login link on the page)
  // Let's go to /login directly to test that page renders
  await page.goto('/login');
  
  // Expect the login page to have an email and password field
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
});
