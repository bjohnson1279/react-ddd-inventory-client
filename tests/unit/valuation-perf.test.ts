import { describe, it, expect, vi } from "vitest";
import { LaravelRESTAdapter } from "../../src/api/laravel";

describe("Performance & Correctness: getValuationReport", () => {
  it("LaravelRESTAdapter should correctly and efficiently compile valuation report for 10,000 variants", async () => {
    const adapter = new LaravelRESTAdapter();

    const numProducts = 1000;
    const variantsPerProduct = 10;
    const productsList = [];

    for (let p = 0; p < numProducts; p++) {
      const variants = [];
      for (let v = 0; v < variantsPerProduct; v++) {
        variants.push({
          id: `v-${p}-${v}`,
          sku: `SKU-${p}-${v}`,
          attributes: [{ name: "Color", value: "Blue" }],
        });
      }
      productsList.push({
        id: `p-${p}`,
        name: `Product ${p}`,
        variants,
      });
    }

    vi.spyOn(adapter as any, "request").mockImplementation(
      async (method: string, path: string) => {
        if (path.includes("/api/reports/valuation")) {
          return { summary: "ok" };
        }
        if (path.includes("/api/catalog/products")) {
          return { products: productsList };
        }
        return {};
      },
    );

    // Mock getInventoryItems to return stock for half the SKUs
    const mockInventoryItems: any[] = [];
    for (let p = 0; p < numProducts / 2; p++) {
      for (let v = 0; v < variantsPerProduct; v++) {
        mockInventoryItems.push({
          id: `v-${p}-${v}-stock`,
          sku: `SKU-${p}-${v}`,
          locationId: "loc-1",
          quantity: 5,
          version: 1,
        });
      }
    }
    vi.spyOn(adapter, "getInventoryItems").mockResolvedValue(
      mockInventoryItems,
    );

    const startTime = performance.now();
    const report = await adapter.getValuationReport(
      "tenant-1",
      "loc-1",
      "FIFO",
    );
    const duration = performance.now() - startTime;

    console.log(
      `[Valuation Report Benchmark] Processed 10,000 variants in ${duration.toFixed(2)}ms`,
    );

    expect(report).toHaveLength(10000);

    // Verify stock item (with attributes formatting)
    const stockItem = report.find((item) => item.sku === "SKU-0-0");
    expect(stockItem).toBeDefined();
    expect(stockItem?.name).toBe("Product 0 (Blue)");
    expect(stockItem?.totalQuantity).toBe(5);
    expect(stockItem?.unitCostCents).toBe(1000);
    expect(stockItem?.totalValueCents).toBe(5000);

    // Verify non-stock item (without attributes in name)
    const nonStockItem = report.find((item) => item.sku === "SKU-800-0");
    expect(nonStockItem).toBeDefined();
    expect(nonStockItem?.name).toBe("Product 800");
    expect(nonStockItem?.totalQuantity).toBe(0);
    expect(nonStockItem?.unitCostCents).toBe(0);
    expect(nonStockItem?.totalValueCents).toBe(0);

    expect(duration).toBeLessThan(500);
  });
});
