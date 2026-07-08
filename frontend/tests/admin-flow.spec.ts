import { test, expect } from '@playwright/test';

test.describe('Admin Flow', () => {
  test('should allow Admin to view dashboard', async ({ page, context }) => {
    // Set a dummy cookie to bypass middleware if it exists
    await context.addCookies([
      { name: 'token', value: 'dummy-token', url: 'http://localhost:3000' }
    ]);

    // Mock Admin session
    await page.route('**/api/v1/auth/me', async (route) => {
      const json = {
        success: true,
        data: {
          id: 'mock-admin-id',
          firstName: 'Admin',
          lastName: 'User',
          alternateEmail: 'admin@bhu.ac.in',
          role: 'ADMIN'
        }
      };
      await route.fulfill({ json });
    });

    await page.goto('/dashboard/admin');
    
    // We expect something related to the Admin dashboard to show
    // For example, "System Analytics" or "Admin Dashboard"
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
