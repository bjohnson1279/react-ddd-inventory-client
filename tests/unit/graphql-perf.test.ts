import { describe, it, expect, vi } from 'vitest';
import { GraphQLAdapter } from '../../src/api/graphql';

describe('Performance: getProducts GraphQL', () => {
  it('should fetch barcodes efficiently', async () => {
    const adapter = new GraphQLAdapter();
    const mockFetch = vi.fn().mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body);
      await new Promise(resolve => setTimeout(resolve, 50)); // simulate 50ms network delay

      if (body.query.includes('products {')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              products: Array(10).fill(null).map((_, i) => ({
                id: `prod-${i}`,
                name: `Product ${i}`,
                variants: [
                  { id: `v1-${i}`, sku: `sku-1-${i}`, trackingMode: 'quantity', attributes: [] },
                  { id: `v2-${i}`, sku: `sku-2-${i}`, trackingMode: 'quantity', attributes: [] }
                ]
              }))
            }
          })
        };
      }

      if (body.query.includes('query GetBarcodes') || body.query.includes('query GetBatchedBarcodes')) {
        const responseData = {};
        if (body.query.includes('query GetBatchedBarcodes')) {
            const matches = body.query.match(/bc_\d+:/g);
            if (matches) {
                matches.forEach(match => {
                    const key = match.replace(':', '');
                    responseData[key] = { assignments: [] };
                });
            }
        } else {
            responseData.barcodeSet = { assignments: [] };
        }

        return {
          ok: true,
          json: async () => ({
            data: responseData
          })
        };
      }

      return { ok: true, json: async () => ({ data: {} }) };
    });

    global.fetch = mockFetch;

    const startTime = Date.now();
    await adapter.getProducts();
    const duration = Date.now() - startTime;

    console.log(`[GraphQL getProducts] Duration: ${duration}ms, Requests: ${mockFetch.mock.calls.length}`);
    expect(mockFetch.mock.calls.length).toBeLessThan(10); // Ideally just 2: one for products, one for all barcodes

  });
});
