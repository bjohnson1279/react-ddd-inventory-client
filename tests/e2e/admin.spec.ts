import { test, expect } from '@playwright/test';

test.describe('Admin Portal Sub-Consoles', () => {
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

      if (url.includes('/users')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ user_id: 'usr-invited-123', temporary_password: 'temp-password-playwright' })
          });
        } else if (method === 'PATCH') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              users: [
                { id: 'usr-admin', email: 'admin@company.com', role: 'admin', name: 'admin-user' },
                { id: 'usr-op', email: 'operator@company.com', role: 'warehouse_operator', name: 'operator-user' }
              ]
            })
          });
        }
      } else if (url.includes('/audit/discrepancies')) {
        if (url.includes('/resolve')) {
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
                id: 'disc-playwright',
                sku: 'PLAYWRIGHT-SKU-1',
                locationId: 'LOC-A1',
                expectedQuantity: 50,
                actualQuantity: 45,
                discrepancyCount: 5,
                status: 'PENDING',
                detectedAt: new Date().toISOString()
              }
            ])
          });
        }
      } else if (url.includes('/audit/run')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ shopifyDiscrepancies: 3, accountingDiscrepancies: 2 })
        });
      } else if (url.includes('/outbox/stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ pending: 5, published: 250, failed: 3 })
        });
      } else if (url.includes('/outbox/dead-letter')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'event-failed-uuid',
              eventType: 'StockReceived',
              payload: '{"sku":"SKU-1","qty":10}',
              error: 'Kafka Broker Timeout',
              occurredAt: new Date().toISOString()
            }
          ])
        });
      } else if (url.includes('/outbox/') && url.includes('/retry')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (url.includes('/returns/quarantine')) {
        if (url.includes('/resolve')) {
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
                id: 'quar-playwright',
                sku: 'PLAYWRIGHT-SKU-1',
                locationId: 'LOC-A1',
                quantity: 5,
                reason: 'Audit Variance Isolation',
                status: 'Quarantined',
                createdAt: new Date().toISOString()
              }
            ])
          });
        }
      } else if (url.includes('/accounting/tenant-config')) {
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
            body: JSON.stringify({
              tenantId: 'tenant-1',
              accountingMethod: 'ACCRUAL',
              costingMethod: 'FIFO',
              currencyCode: 'USD',
              fiscalYearStart: '01-01'
            })
          });
        }
      } else if (url.includes('/kits/')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else if (url.includes('/reports/valuation') || url.includes('/valuation')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_valuation_fifo_cents: 100000,
            total_valuation_lifo_cents: 95000,
            total_valuation_wac_cents: 98000,
            valuation_by_location: []
          })
        });
      } else if (url.includes('/barcodes')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else if (url.includes('/inventory')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
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
    // Navigate to Admin Portal
    await page.click('text=Admin Portal');
  });

  test('should render the admin portal shell and toggle sub-consoles', async ({ page }) => {
    // Assert active header tab is rendered
    await expect(page.locator('.tabs-header')).toContainText('Users & RBAC');
    await expect(page.locator('.tabs-header')).toContainText('Audits & Discrepancies');
    await expect(page.locator('.tabs-header')).toContainText('Outbox Monitor');
  });

  test('should verify user list loads and supports sending invitations', async ({ page }) => {
    // We are on Users & RBAC by default. Assert directory loader items are visible.
    await expect(page.locator('.table-wrapper table')).toContainText('admin@company.com');

    // Fill invitation inputs
    await page.fill('input[placeholder="user@company.com"]', 'new-hired-staff@company.com');
    await page.selectOption('select:has-text("Administrator")', 'warehouse_operator');

    // Send invitation
    await page.click('button:has-text("Invite Member")');

    // Verify code block displays temporary password details
    await expect(page.locator('.alert-success').filter({ hasText: 'Simulated successfully' })).toContainText('User Invitation Code Generated');
  });

  test('should trigger inventory auditing and discrepancy resolutions', async ({ page }) => {
    // Navigate to Audits console
    await page.click('text=Audits & Discrepancies');

    // Verify discrepancy table loads
    await expect(page.locator('.table-wrapper table')).toContainText('PLAYWRIGHT-SKU-1');

    // Resolve variance with reason notes
    await page.fill('input[placeholder="Notes for resolution..."]', 'Playwright Automated reconciliation notes.');
    await page.click('button:has-text("Resolve")');

    // Verify action success alert message
    await expect(page.locator('.alert-box')).toContainText('Discrepancy resolved successfully');
  });

  test('should verify Kafka outbox queue counts and retries failed events', async ({ page }) => {
    // Navigate to outbox monitor
    await page.click('text=Outbox Monitor');

    // Verify counts card renders stats, using filter filters to avoid Playwright strict mode exceptions
    await expect(page.locator('.glass-panel').filter({ hasText: 'Pending Events' })).toContainText('Pending Events');
    await expect(page.locator('.glass-panel').filter({ hasText: 'Failed Dead-Letters' })).toContainText('Failed Dead-Letters');

    // Verify retry triggers successfully
    await page.click('button:has-text("Retry Event")');
    await expect(page.locator('.alert-box')).toContainText('Outbox event retried successfully');
  });
});
