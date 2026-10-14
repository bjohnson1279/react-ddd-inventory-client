import { describe, it, expect, vi } from "vitest";
import { LaravelRESTAdapter } from "../../src/api/laravel";

describe("Performance: getInventoryItems", () => {
  it("LaravelRESTAdapter should fetch inventory stock levels efficiently", async () => {
    const adapter = new LaravelRESTAdapter();

    // Generate 100 variants across products
    const variants = Array.from({ length: 100 }, (_, i) => ({
      id: `v-${i}`,
      sku: `SKU-${i}`,
      tracking_mode: "quantity",
      attributes: [],
    }));

    const mockProducts = [
      {
        id: "p-1",
        name: "Product 1",
        variants,
      },
    ];

    let requestCount = 0;
    const mockRequest = vi
      .spyOn(adapter as any, "request")
      .mockImplementation(async (method: string, path: string) => {
        requestCount++;
        await new Promise((resolve) => setTimeout(resolve, 50)); // simulate 50ms network delay per request

        if (path === "/api/catalog/products") {
          return { products: mockProducts };
        }

        if (path.startsWith("/api/inventory/stock?skus=")) {
          const querySkus = path.split("skus=")[1].split(",");
          return {
            stocks: querySkus.map((sku) => ({
              sku,
              location_id: "loc-1",
              available_quantity: 10,
            })),
          };
        }

        if (path.match(/\/api\/inventory\/[^/]+\/stock$/)) {
          const sku = path.split("/")[3];
          return {
            sku,
            location_id: "loc-1",
            available_quantity: 10,
          };
        }

        return {};
      });

    const startTime = Date.now();
    const items = await adapter.getInventoryItems();
    const duration = Date.now() - startTime;

    console.log(
      `[Inventory Stock Benchmark] Duration: ${duration}ms, Total Requests: ${requestCount}`,
    );
    expect(items).toHaveLength(100);

    mockRequest.mockRestore();
  });
});
