import { test, expect } from '@playwright/test';

test.describe('Dashboard Shell & Authorization Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local Vite dev server
    await page.goto('/');
  });

  test('should load the authentication screen with the correct title and controls', async ({ page }) => {
    // Check brand headers and layout
    await expect(page.locator('.brand-name')).toHaveText('INVENTORY CLIENT');
    await expect(page.locator('h2')).toHaveText('System Authentication');

    // Confirm that backend selection options are present
    const selector = page.locator('select').first();
    await expect(selector).toBeVisible();
    
    const options = await selector.locator('option').allTextContents();
    expect(options).toContain('GraphQL API (Port 4000)');
    expect(options).toContain('Express REST API (Port 5000)');
    expect(options).toContain('Laravel REST API (Port 8000)');
  });

  test('should switch the API node and handle token clear recovery', async ({ page }) => {
    // Set mock local storage auth token
    await page.evaluate(() => localStorage.setItem('auth_token', 'mock-jwt-key'));
    await page.goto('/');

    // Swapping backends will trigger hard reload and purge the token
    const selector = page.locator('select').first();
    await selector.selectOption('express');

    // Wait for reload and assert the login panel is shown again due to cleared token context
    await expect(page.locator('h2')).toHaveText('System Authentication');
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });
});
