import { test, expect } from '@playwright/test';

test.describe('Dashboard Shell & Core Workflows', () => {
  // Declaratively preset storage state for the origin to bypass login screen
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
    // Intercept only backend REST requests going to localhost:5000
    await page.route(/localhost:5000/, async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'mockHeader.eyJ0ZW5hbnRJZCI6InRlbmFudC0xIiwiYWN0b3JJZCI6ImFkbWluLXVzZXIiLCJyb2xlIjoiYWRtaW4ifQ==.mockSignature' })
        });
      } else if (url.includes('/inventory/products')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (url.includes('/barcodes/scan')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, actualQuantity: 1 })
        });
      } else if (url.includes('/barcodes')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'barcode-1',
                variantId: 'PLAYWRIGHT-SKU-1',
                barcodeValue: '1234567890',
                symbology: 'upc_a',
                source: 'supplier',
                isPrimary: true,
                assignedAt: new Date().toISOString()
              }
            ])
          });
        }
      } else if (url.includes('/inventory')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'inv-1', sku: 'PLAYWRIGHT-SKU-1', locationId: 'LOC-A1', quantity: 25, version: 1 }
          ])
        });
      } else if (url.includes('/onboarding')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'onb-1' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      } else if (url.includes('/accounting/ledger')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
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

  test('should render the dashboard layout and show main navigation links', async ({ page }) => {
    // Assert main header title is rendered
    await expect(page.locator('h1')).toHaveText('Unified Control Center');

    // Check visibility of sidebar links
    await expect(page.locator('text=Operations Dashboard')).toBeVisible();
    await expect(page.locator('text=Product Catalog')).toBeVisible();
    await expect(page.locator('text=Barcode Workflows')).toBeVisible();
  });

  test('should support creating a new product catalog entry', async ({ page }) => {
    // Click on Product Catalog link
    await page.click('text=Product Catalog');

    // Fill out the product creation form
    await page.fill('input[placeholder="e.g. prod-123"]', 'PROD-PLAYWRIGHT');
    await page.fill('input[placeholder="e.g. Wireless Charger"]', 'Playwright Automated Widget');

    // Submit form
    await page.click('button:has-text("Register Product")');

    // Verify success alert message
    await expect(page.locator('.alert-box')).toContainText('Product Playwright Automated Widget created.');
  });

  test('should simulate barcode scanning workflows', async ({ page }) => {
    // Navigate to barcode workflows tab
    await page.click('text=Barcode Workflows');

    // Fill barcode scanning inputs
    await page.fill('input[placeholder="Scan or type barcode value..."]', '1234567890');
    await page.fill('input[type="number"]', '1');

    // Execute scan
    await page.click('button:has-text("Trigger Scanning Event")');

    // Verify that the scanned items list adds the record to the timeline stream
    await expect(page.locator('.timeline')).toContainText('1234567890');
  });
});
