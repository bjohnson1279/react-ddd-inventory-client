import { test, expect } from '@playwright/test';

test.describe('RFID Ingestion Dashboard Workflows', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://127.0.0.1:5173',
          localStorage: [
            {
              name: 'auth_token',
              value: 'mockHeader.eyJ0ZW5hbnRJZCI6InRlbmFudC0xIiwiYWN0b3JJZCI6ImFkbWluLXVzZXIiLCJyb2xlIjoiYWRtaW4ifQ==.mockSignature'
            },
            {
              name: 'backend_type',
              value: 'express'
            }
          ]
        }
      ]
    }
  });

  test.beforeEach(async ({ page }) => {
    // Intercept backend REST requests going to localhost:5000
    await page.route(/localhost:5000/, async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/rfid/tags')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Tag assigned successfully' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              tags: [
                {
                  epc: 'E28011302000762A17849C10',
                  sku: 'PLAYWRIGHT-SKU-1',
                  serialNumber: 'SN-1001',
                  status: 'ACTIVE',
                  lastSeenAt: new Date().toISOString(),
                  lastLocation: 'LOC-A1'
                }
              ]
            })
          });
        }
      } else if (url.includes('/rfid/simulate-scan')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'RFID scan simulation published.' })
        });
      } else if (url.includes('/warehouse-locations')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'LOC-A1', warehouseId: 'W-1', zone: 'Zone A', maxWeightGrams: 50000, maxVolumeCubicMeters: 10 }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/');
  });

  test('should navigate to RFID Ingestion tab and display registered tag catalog', async ({ page }) => {
    // Click on RFID Ingestion link in sidebar
    await page.click('text=RFID Ingestion');

    // Verify tag mapping form sections load
    await expect(page.locator('h3:has-text("Register RFID Tag Mappings")')).toBeVisible();
    await expect(page.locator('h3:has-text("Simulate RFID Portal Scan")')).toBeVisible();

    // Verify registered tag catalog table loads item
    await expect(page.locator('.table-wrapper table')).toContainText('E28011302000762A17849C10');
    await expect(page.locator('.table-wrapper table')).toContainText('PLAYWRIGHT-SKU-1');
  });

  test('should allow registering a new RFID tag mapping', async ({ page }) => {
    await page.click('text=RFID Ingestion');

    // Fill form fields
    await page.fill('input[placeholder="E28011302000762A17849C10"]', 'E28011302000999999999999');
    await page.fill('input[placeholder="SKU-GEN-SHIRT"]', 'SKU-NEW-TAG');
    await page.fill('input[placeholder="SN-10002931"]', 'SN-9999');

    // Submit
    await page.click('button:has-text("Register Mapping")');

    // Verify alert message
    await expect(page.locator('.alert-success')).toContainText('RFID tag assigned successfully.');
  });

  test('should simulate RFID scan ingestion', async ({ page }) => {
    await page.click('text=RFID Ingestion');

    // Enter manual EPC in textarea
    await page.fill('textarea[placeholder*="E28011302000000000000001"]', 'E28011302000762A17849C10');

    // Click Simulate Scan
    await page.click('button:has-text("Simulate Scan Ingest")');

    // Verify success alert message
    await expect(page.locator('.alert-success')).toContainText('Simulated scan of 1 tags at location LOC-A1');
  });
});
