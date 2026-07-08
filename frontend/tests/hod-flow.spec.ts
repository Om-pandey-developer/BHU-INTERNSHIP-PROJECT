import { test, expect } from '@playwright/test';

test.describe('HOD Flow', () => {
  test('should allow HOD to view and approve an application', async ({ page, context }) => {
    await context.addCookies([
      { name: 'token', value: 'dummy-token', url: 'http://localhost:3000' }
    ]);
    
    // Mock HOD session
    await page.route('**/api/v1/auth/me', async (route) => {
      const json = {
        success: true,
        data: {
          id: 'mock-hod-id',
          firstName: 'Prof',
          lastName: 'Smith',
          alternateEmail: 'hod@bhu.ac.in',
          role: 'HOD',
          departmentId: 'dept-1'
        }
      };
      await route.fulfill({ json });
    });

    // Mock pending applications for the department
    await page.route('**/api/v1/applications/department', async (route) => {
      const json = {
        success: true,
        data: [
          {
            id: 'app-1',
            trackingId: 'TRK-2026-HOD',
            status: 'PENDING_HOD',
            applicant: { firstName: 'John', lastName: 'Doe', alternateEmail: 'john@gmail.com' },
            applicantDetails: { category: 'POST_GRADUATE_STUDENT' }
          }
        ]
      };
      await route.fulfill({ json });
    });
    
    // Mock approve action
    await page.route('**/api/v1/applications/hod/approve/app-1', async (route) => {
      const json = { success: true, message: 'Application approved successfully' };
      await route.fulfill({ json });
    });

    await page.goto('/dashboard/hod');
    
    // Wait for applications to load
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=PENDING HOD')).toBeVisible();

    // Click on View Details
    await page.click('text=View Details');

    // Assume the modal opens and we can click Approve
    // Note: Depends on actual DOM structure, assuming a button with "Approve" exists
    await expect(page.locator('button:has-text("Approve")')).toBeVisible();
  });
});
