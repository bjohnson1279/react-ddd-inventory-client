import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLAdapter } from "../../src/api/graphql";

describe("Performance: getValuationReport GraphQL", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch valuation report efficiently with cached variant names and targeted GraphQL queries", async () => {
    const adapter = new GraphQLAdapter();

    const mockFetch = vi.fn().mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body);
      await new Promise((resolve) => setTimeout(resolve, 20)); // simulate 20ms network latency

      if (body.query.includes("query GetValuation")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              stockValuationReport: {
                method: "FIFO",
                lineItems: Array(20)
                  .fill(null)
                  .map((_, i) => ({
                    variantId: `v-${i}`,
                    sku: `sku-${i}`,
                    quantityOnHand: 10 + i,
                    unitCostCents: 1000,
                    totalValueCents: (10 + i) * 1000,
                  })),
              },
            },
          }),
        };
      }

      if (
        body.query.includes("query GetProductVariantNames") ||
        body.query.includes("products {")
      ) {
        return {
          ok: true,
          json: async () => ({
            data: {
              products: Array(10)
                .fill(null)
                .map((_, i) => ({
                  id: `prod-${i}`,
                  name: `Product ${i}`,
                  variants: [
                    {
                      id: `v-${i * 2}`,
                      sku: `sku-${i * 2}`,
                      trackingMode: "quantity",
                      attributes: [{ name: "Color", value: "Red" }],
                    },
                    {
                      id: `v-${i * 2 + 1}`,
                      sku: `sku-${i * 2 + 1}`,
                      trackingMode: "quantity",
                      attributes: [{ name: "Color", value: "Blue" }],
                    },
                  ],
                })),
            },
          }),
        };
      }

      if (
        body.query.includes("query GetBatchedBarcodes") ||
        body.query.includes("barcodeSet")
      ) {
        const responseData = {};
        const matches = body.query.match(/bc_\d+:/g);
        if (matches) {
          matches.forEach((match) => {
            const key = match.replace(":", "");
            responseData[key] = { assignments: [] };
          });
        }
        return {
          ok: true,
          json: async () => ({ data: responseData }),
        };
      }

      return { ok: true, json: async () => ({ data: {} }) };
    });

    global.fetch = mockFetch;

    // First call - baseline / initial fetch
    const start1 = performance.now();
    const result1 = await adapter.getValuationReport("tenant-1");
    const dur1 = performance.now() - start1;
    const calls1 = mockFetch.mock.calls.length;

    // Second call - cached fetch
    const start2 = performance.now();
    const result2 = await adapter.getValuationReport("tenant-1");
    const dur2 = performance.now() - start2;
    const calls2 = mockFetch.mock.calls.length - calls1;

    console.log(
      `[Valuation Report First Call] Duration: ${dur1.toFixed(2)}ms, HTTP Requests: ${calls1}`,
    );
    console.log(
      `[Valuation Report Second Call] Duration: ${dur2.toFixed(2)}ms, HTTP Requests: ${calls2}`,
    );

    expect(result1.length).toBe(20);
    expect(result2.length).toBe(20);
    expect(calls2).toBe(1); // Second call should only make 1 query for valuation report, reusing cached variant names
    expect(calls1).toBeLessThanOrEqual(2); // First call should make at most 2 queries (1 valuation, 1 targeted variant names), avoiding barcode N+1 batch queries
  });
});
