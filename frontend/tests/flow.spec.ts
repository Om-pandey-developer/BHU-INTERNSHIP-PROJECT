import { test, expect } from '@playwright/test';

test.describe('BHU Email Portal E2E Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Mock the initial profile endpoint
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'test-user', firstName: 'John', lastName: 'Doe', role: 'APPLICANT' }
      });
    });
  });

  test('Applicant can navigate to new application form', async ({ page }) => {
    // Mock the get applications endpoint
    await page.route('**/api/v1/applications/my', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    // Go to the dashboard
    await page.goto('/dashboard/applicant');

    // Should see New Application button
    const newAppBtn = page.getByRole('button', { name: 'New Application' });
    await expect(newAppBtn).toBeVisible();

    // Click it
    await newAppBtn.click();

    // Should see category selection
    await expect(page.getByText('Choose Application Category')).toBeVisible();
    await expect(page.getByText('Group A Officer')).toBeVisible();
    await expect(page.getByText('Under Graduate Student')).toBeVisible();
  });

  test('HOD can view pending applications', async ({ page }) => {
    // Override profile for HOD
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'hod-user', firstName: 'HOD', lastName: 'CS', role: 'HOD' }
      });
    });

    // Mock pending applications
    await page.route('**/api/v1/applications/hod-queue', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 'app-1',
          trackingId: 'TRK-123456',
          status: 'PENDING_HOD',
          createdAt: new Date().toISOString(),
          applicant: { firstName: 'Jane', lastName: 'Doe', alternateEmail: 'jane@gmail.com' }
        }]
      });
    });

    await page.goto('/dashboard/hod');
    
    // Verify HOD dashboard title and table content
    await expect(page.getByText('Pending Review')).toBeVisible();
    await expect(page.getByText('TRK-123456')).toBeVisible();
    await expect(page.getByText('Jane Doe')).toBeVisible();
  });

  test('CC Admin can view approved applications for provisioning', async ({ page }) => {
    // Override profile for CC Admin
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'admin-user', firstName: 'Admin', lastName: 'Super', role: 'CC_ADMIN' }
      });
    });

    // Mock stats
    await page.route('**/api/v1/applications/admin/quota-stats', async (route) => {
      await route.fulfill({ status: 200, json: { provisionedCount: 15, totalQuotaGB: 300 } });
    });

    // Mock pending provision queue
    await page.route('**/api/v1/applications/admin-queue', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{
          id: 'app-2',
          trackingId: 'TRK-987654',
          status: 'APPROVED_HOD',
          createdAt: new Date().toISOString(),
          applicant: { firstName: 'Alice', lastName: 'Smith' },
          department: { name: 'Mathematics' }
        }]
      });
    });

    await page.goto('/dashboard/admin');

    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Storage Allocation')).toBeVisible();
    await expect(page.getByText('TRK-987654')).toBeVisible();
  });

});
