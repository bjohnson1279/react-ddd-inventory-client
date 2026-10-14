import { describe, it, expect, vi } from "vitest";
import { LaravelRESTAdapter } from "../../src/api/laravel";

describe("Performance: getProducts Laravel", () => {
  it("should fetch barcodes efficiently in bulk", async () => {
    const adapter = new LaravelRESTAdapter();
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10)); // simulate 10ms network delay per HTTP request

      if (url.includes("/api/catalog/products")) {
        return {
          ok: true,
          json: async () => ({
            products: Array(10)
              .fill(null)
              .map((_, i) => ({
                id: `prod-${i}`,
                name: `Product ${i}`,
                variants: [
                  {
                    id: `v1-${i}`,
                    sku: `sku-1-${i}`,
                    tracking_mode: "quantity",
                    attributes: [],
                  },
                  {
                    id: `v2-${i}`,
                    sku: `sku-2-${i}`,
                    tracking_mode: "quantity",
                    attributes: [],
                  },
                ],
              })),
          }),
        };
      }

      if (url.includes("/api/barcodes")) {
        return {
          ok: true,
          json: async () => ({
            data: [],
          }),
        };
      }

      return { ok: true, json: async () => ({ data: [] }) };
    });

    global.fetch = mockFetch;

    const startTime = Date.now();
    await adapter.getProducts();
    const duration = Date.now() - startTime;

    console.log(
      `[Laravel getProducts] Duration: ${duration}ms, Requests: ${mockFetch.mock.calls.length}`,
    );
    expect(mockFetch.mock.calls.length).toBeLessThan(10);
  });
});
