import { describe, it, expect, vi } from "vitest";
import { ExpressRESTAdapter } from "../../src/api/express";

describe("Performance: ExpressRESTAdapter getValuationReport", () => {
  it("should calculate valuation report efficiently and correctly with dense chunking (< 150ms)", async () => {
    const adapter = new ExpressRESTAdapter();

    const numProducts = 100;
    const variantsPerProduct = 10;
    const productsList = [];

    for (let p = 0; p < numProducts; p++) {
      const variants = [];
      for (let v = 0; v < variantsPerProduct; v++) {
        variants.push({
          id: `v-${p}-${v}`,
          sku: `SKU-${p}-${v}`,
          trackingMode: "quantity",
          attributes: [{ name: "Color", value: "Blue" }],
          barcodes: [],
        });
      }
      productsList.push({
        id: `prod-SKU-${p}-0`,
        name: `Product ${p}`,
        variants,
      });
    }

    // 50 variants have stock, 950 have zero stock
    const mockInventoryItems: any[] = [];
    for (let i = 0; i < 50; i++) {
      mockInventoryItems.push({
        id: `inv-${i}`,
        sku: `SKU-${i}-0`,
        quantity: 10,
        locationId: "loc-1",
        version: 1,
      });
    }

    vi.spyOn(adapter, "getProducts").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10)); // 10ms simulated latency
      return productsList;
    });

    vi.spyOn(adapter, "getInventoryItems").mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10)); // 10ms simulated latency
      return mockInventoryItems;
    });

    vi.spyOn(adapter as any, "request").mockImplementation(
      async (method: string, path: string) => {
        await new Promise((r) => setTimeout(r, 5)); // 5ms simulated latency per valuation request
        return {
          methodUsed: "FIFO",
          totalCostCents: 15000,
          unitCostCents: 1500,
        };
      },
    );

    const start = performance.now();
    const report = await adapter.getValuationReport(
      "tenant-1",
      "loc-1",
      "FIFO",
    );
    const duration = performance.now() - start;

    console.log(
      `[Express Valuation Report Benchmark] Duration: ${duration.toFixed(2)}ms, items: ${report.length}`,
    );

    expect(report).toHaveLength(1000);

    // Verify stock variant formatting and values
    const stockItem = report.find((item) => item.sku === "SKU-0-0");
    expect(stockItem).toBeDefined();
    expect(stockItem?.name).toBe("Product 0 (Blue)");
    expect(stockItem?.totalQuantity).toBe(10);
    expect(stockItem?.unitCostCents).toBe(1500);
    expect(stockItem?.totalValueCents).toBe(15000);
    expect(stockItem?.costingMethod).toBe("FIFO");

    // Verify zero-stock variant formatting and values
    const zeroStockItem = report.find((item) => item.sku === "SKU-99-9");
    expect(zeroStockItem).toBeDefined();
    expect(zeroStockItem?.name).toBe("Product 99");
    expect(zeroStockItem?.totalQuantity).toBe(0);
    expect(zeroStockItem?.unitCostCents).toBe(0);
    expect(zeroStockItem?.totalValueCents).toBe(0);
    expect(zeroStockItem?.costingMethod).toBe("FIFO");

    // Optimized execution with dense chunking and concurrent fetch should complete under 150ms (baseline was ~289ms)
    expect(duration).toBeLessThan(150);
  });
});
