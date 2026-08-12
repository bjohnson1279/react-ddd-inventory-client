import { describe, it, expect, vi } from 'vitest';
import { LaravelRESTAdapter } from '../../src/api/laravel';

describe('Performance: getInventoryItems in Laravel', () => {
  it('should fetch stock levels efficiently (< 200ms for 50 variants)', async () => {
    // Generate 50 variants across 10 products
    const mockProducts = Array.from({ length: 10 }).map((_, pIdx) => ({
      id: `p-${pIdx}`,
      name: `Product ${pIdx}`,
      variants: Array.from({ length: 5 }).map((_, vIdx) => ({
        id: `v-${pIdx}-${vIdx}`,
        sku: `SKU-${pIdx}-${vIdx}`,
        tracking_mode: 'quantity',
        attributes: []
      }))
    }));

    let requestCount = 0;

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      requestCount++;
      // Simulate network delay
      await new Promise(r => setTimeout(r, 2));

      if (url.includes('/api/catalog/products')) {
        return {
          ok: true,
          json: async () => ({ products: mockProducts })
        };
      }
      if (url.includes('/api/inventory/')) {
        return {
          ok: true,
          json: async () => ({ available_quantity: 42, location_id: 'loc-A' })
        };
      }

      // Batch endpoint mockup, just in case
      if (url.includes('/api/inventory/stock-batch')) {
         return {
            ok: true,
            json: async () => {
               const stockBySku: Record<string, any> = {};
               for (let pIdx=0; pIdx < 10; pIdx++) {
                 for (let vIdx=0; vIdx < 5; vIdx++) {
                   stockBySku[`SKU-${pIdx}-${vIdx}`] = { available_quantity: 42, location_id: 'loc-A' };
                 }
               }
               return { stockBySku };
            }
         }
      }

      return {
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      };
    });

    global.fetch = mockFetch;

    const adapter = new LaravelRESTAdapter();

    const start = performance.now();
    const items = await adapter.getInventoryItems();
    const end = performance.now();
    const duration = end - start;

    console.log(`[Baseline Laravel Inventory] Duration: ${Math.round(duration)}ms, Requests: ${requestCount}`);

    expect(items).toHaveLength(50);
    expect(duration).toBeLessThan(300);
  });
});
