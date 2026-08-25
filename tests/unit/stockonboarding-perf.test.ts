import { describe, it, expect, vi } from 'vitest';
import { ExpressRESTAdapter } from '../../src/api/express';
import { Item } from '../../src/api/client';

describe('Performance: createStockOnboarding', () => {
  it('ExpressRESTAdapter should create onboarding items concurrently (< 300ms for 5 items)', async () => {
    const adapter = new ExpressRESTAdapter();
    const mockRequest = vi.spyOn(adapter as any, 'request').mockImplementation(async (method, url) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // simulate 100ms delay per request
      if (url === '/onboarding') {
        return { id: 'onboarding-123' };
      }
      return { success: true };
    });

    const items: Item[] = [
      { variantId: 'v1', quantity: 10, unitCostCents: 100 },
      { variantId: 'v2', quantity: 20, unitCostCents: 200 },
      { variantId: 'v3', quantity: 30, unitCostCents: 300 },
      { variantId: 'v4', quantity: 40, unitCostCents: 400 },
      { variantId: 'v5', quantity: 50, unitCostCents: 500 },
    ];

    const startTime = Date.now();
    await adapter.createStockOnboarding('tenant1', 'loc1', '2023-10-27', items);
    const duration = Date.now() - startTime;

    console.log(`[Baseline Express Stock Onboarding] Duration: ${duration}ms`);
    expect(duration).toBeLessThan(300); // 100ms for onboarding + 100ms for items concurrently = ~200ms

    mockRequest.mockRestore();
  });
});
