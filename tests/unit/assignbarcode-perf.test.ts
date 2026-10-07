import { describe, it, expect, vi } from "vitest";
import { LaravelRESTAdapter } from "../../src/api/laravel";

describe("Performance: assignBarcode in LaravelRESTAdapter", () => {
  it("should efficiently find variantId for SKU and execute assign barcode request", async () => {
    const adapter = new LaravelRESTAdapter();

    const numProducts = 1000;
    const numVariantsPerProduct = 10;
    const products = [];
    for (let i = 0; i < numProducts; i++) {
      const variants = [];
      for (let j = 0; j < numVariantsPerProduct; j++) {
        variants.push({
          id: `var_${i}_${j}`,
          sku: `SKU_${i}_${j}`,
        });
      }
      products.push({
        id: `prod_${i}`,
        name: `Product ${i}`,
        variants,
      });
    }

    const targetSku = `SKU_${numProducts - 1}_${numVariantsPerProduct - 1}`;
    const expectedVariantId = `var_${numProducts - 1}_${numVariantsPerProduct - 1}`;

    const mockRequest = vi
      .spyOn(adapter as any, "request")
      .mockImplementation(async (method: string, path: string, body?: any) => {
        if (method === "GET" && path === "/api/catalog/products") {
          return { products };
        }
        if (method === "POST" && path === "/api/barcodes/assign") {
          return { success: true };
        }
        throw new Error(`Unexpected request: ${method} ${path}`);
      });

    const startTime = performance.now();
    await adapter.assignBarcode(
      targetSku,
      "12345678",
      "code_128",
      "internal",
      true,
    );
    const duration = performance.now() - startTime;

    console.log(
      `[assignBarcode Performance] Duration for ${numProducts * numVariantsPerProduct} variants: ${duration.toFixed(2)}ms`,
    );

    expect(mockRequest).toHaveBeenCalledWith("POST", "/api/barcodes/assign", {
      variant_id: expectedVariantId,
      value: "12345678",
      symbology: "code_128",
      source: "internal",
      is_primary: true,
    });

    expect(duration).toBeLessThan(100);

    mockRequest.mockRestore();
  });

  it("should throw an error when SKU is not found", async () => {
    const adapter = new LaravelRESTAdapter();

    const mockRequest = vi.spyOn(adapter as any, "request").mockResolvedValue({
      products: [
        { id: "prod_1", variants: [{ id: "var_1", sku: "SKU_EXISTING" }] },
      ],
    });

    await expect(
      adapter.assignBarcode(
        "SKU_NON_EXISTENT",
        "123",
        "code_128",
        "internal",
        true,
      ),
    ).rejects.toThrow("Variant for SKU SKU_NON_EXISTENT not found.");

    mockRequest.mockRestore();
  });
});
