import { describe, it, expect, vi, beforeEach } from "vitest";
import { PythonRESTAdapter } from "../../src/api/python";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("PythonRESTAdapter Comprehensive Test Suite", () => {
  let adapter: PythonRESTAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    adapter = new PythonRESTAdapter();
  });

  describe("Authentication and Login", () => {
    it("should throw error if password parameter is missing or empty", async () => {
      await expect(
        adapter.login("tenant-py", "admin@example.com", "admin", ""),
      ).rejects.toThrow(
        "Authentication failed: Missing required password parameter.",
      );
      await expect(
        adapter.login("tenant-py", "admin@example.com", "admin", undefined),
      ).rejects.toThrow(
        "Authentication failed: Missing required password parameter.",
      );
    });

    it("should login directly and return token when credentials are valid", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "jwt-token-python-123" }),
      });
      global.fetch = mockFetch;

      const token = await adapter.login(
        "tenant-py",
        "operator",
        "worker",
        "secret-pass",
      );

      expect(token).toBe("jwt-token-python-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            email: "operator@example.com",
            password: "secret-pass",
          }),
        }),
      );
    });

    it("should auto-recover by running /auth/setup when credentials error occurs", async () => {
      const mockFetch = vi
        .fn()
        // First login fails with 401 credentials error
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: "Invalid credentials" }),
        })
        // Setup succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        // Second login succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "auto-setup-token" }),
        });
      global.fetch = mockFetch;

      const token = await adapter.login(
        "tenant-recovery",
        "admin@test.com",
        "admin",
        "admin-pass",
      );

      expect(token).toBe("auto-setup-token");
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:8001/auth/setup",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            orgName: "Organization tenant-recovery",
            tenantId: "tenant-recovery",
            adminName: "admin@test.com",
            adminEmail: "admin@test.com",
            adminPassword: "admin-pass",
          }),
        }),
      );
    });

    it("should throw error if setup auto-recovery also fails", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: "Invalid credentials" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: "DB setup error" }),
        });
      global.fetch = mockFetch;

      await expect(
        adapter.login("tenant-fail", "admin@test.com", "admin", "admin-pass"),
      ).rejects.toThrow(
        "Login failed, and setup auto-recovery also failed: DB setup error",
      );
    });
  });

  describe("Product Catalog, Barcodes, and Serials", () => {
    it("should fetch inventory items and products", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ sku: "SKU-PY-1", quantity: 50 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "p-1", name: "Python Product", variants: [] },
          ],
        });
      global.fetch = mockFetch;

      const items = await adapter.getInventoryItems();
      expect(items).toEqual([{ sku: "SKU-PY-1", quantity: 50 }]);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        "http://localhost:8001/inventory",
        expect.objectContaining({ method: "GET" }),
      );

      const products = await adapter.getProducts();
      expect(products).toHaveLength(1);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://localhost:8001/inventory/products",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should create product and add variant", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.createProduct("prod-py-1", "Product Py");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/inventory/products",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "prod-py-1", name: "Product Py" }),
        }),
      );

      await adapter.addProductVariant("prod-py-1", "SKU-PY-1", "serialized", [
        { name: "Color", value: "Green" },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/inventory/products/prod-py-1/variants",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-PY-1",
            trackingMode: "serialized",
            attributes: [{ name: "Color", value: "Green" }],
          }),
        }),
      );
    });

    it("should assign barcode, generate internal barcode, and scan barcode", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ barcodeValue: "BARCODE-PY-123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: "MATCH", sku: "SKU-PY-1" }),
        });
      global.fetch = mockFetch;

      await adapter.assignBarcode(
        "SKU-PY-1",
        "123456789",
        "CODE128",
        "internal",
        true,
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/barcodes/assign",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-PY-1",
            barcodeValue: "123456789",
            symbology: "CODE128",
            source: "internal",
            makePrimary: true,
          }),
        }),
      );

      const generated = await adapter.generateInternalBarcode(
        "SKU-PY-1",
        "tenant-py",
      );
      expect(generated).toBe("BARCODE-PY-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/barcodes/generate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ sku: "SKU-PY-1", tenantId: "tenant-py" }),
        }),
      );

      const scanResult = await adapter.scanBarcode(
        "BARCODE-PY-123",
        "receiving",
        5,
        5,
        "tenant-py",
        "loc-dock",
        "actor-1",
      );
      expect(scanResult.status).toBe("MATCH");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/barcodes/scan",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            barcodeValue: "BARCODE-PY-123",
            context: "receiving",
            scannedAmount: 5,
            actualQuantity: 5,
            tenantId: "tenant-py",
            locationId: "loc-dock",
            actorId: "actor-1",
          }),
        }),
      );
    });

    it("should trace serial history, register serial, list serials, and perform state changes", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            serialNumber: "SN-PY-001",
            sku: "SKU-PY-1",
            status: "AVAILABLE",
            history: [],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            serialNumber: "SN-PY-002",
            sku: "SKU-PY-1",
            status: "AVAILABLE",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { serialNumber: "SN-PY-001", sku: "SKU-PY-1" },
            { serialNumber: "SN-PY-002", sku: "SKU-PY-1" },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            serialNumber: "SN-PY-001",
            status: "QUARANTINED",
          }),
        });
      global.fetch = mockFetch;

      const history = await adapter.traceSerialHistory("SN-PY-001");
      expect(history.serialNumber).toBe("SN-PY-001");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/serials/trace/SN-PY-001",
        expect.objectContaining({ method: "GET" }),
      );

      const registered = await adapter.registerSerial({
        sku: "SKU-PY-1",
        serialNumber: "SN-PY-002",
        locationId: "loc-1",
        mutationId: "mut-serial-1",
        reason: "Initial serial registration",
      });
      expect(registered.serialNumber).toBe("SN-PY-002");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/serials",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-PY-1",
            serialNumber: "SN-PY-002",
            locationId: "loc-1",
            mutationId: "mut-serial-1",
            reason: "Initial serial registration",
          }),
        }),
      );

      const serials = await adapter.getSerializedItems("SKU-PY-1");
      expect(serials).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/serials?limit=1000&sku=SKU-PY-1",
        expect.objectContaining({ method: "GET" }),
      );

      const updated = await adapter.changeSerial("SN-PY-001", "quarantine", {
        expectedVersion: 1,
        mutationId: "mut-quarantine-1",
        reason: "Defective serial",
        referenceId: "ref-qc-99",
      });
      expect(updated.status).toBe("QUARANTINED");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/serials/SN-PY-001/quarantine",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            expectedVersion: 1,
            mutationId: "mut-quarantine-1",
            reason: "Defective serial",
            referenceId: "ref-qc-99",
          }),
        }),
      );
    });
  });

  describe("Kitting and Assemblies", () => {
    it("should get kit definitions and define a new kit", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "KIT-PY", name: "Bundle A", components: [] },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sku: "KIT-PY-2", name: "Bundle B" }),
        });
      global.fetch = mockFetch;

      const kits = await adapter.getKitDefinitions();
      expect(kits).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/kits?limit=1000",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.defineKit({
        sku: "KIT-PY-2",
        name: "Bundle B",
        components: [{ sku: "COMP-1", quantity: 2 }],
        expectedVersion: 0,
        mutationId: "mut-kit-1",
        reason: "Create bundle B",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/kits",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "KIT-PY-2",
            name: "Bundle B",
            components: [{ sku: "COMP-1", quantity: 2 }],
            expectedVersion: 0,
            mutationId: "mut-kit-1",
            reason: "Create bundle B",
          }),
        }),
      );
    });

    it("should assemble and disassemble kits via legacyKitCommand", async () => {
      const mockFetch = vi
        .fn()
        // assembleKit GET /kits/KIT-PY
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sku: "KIT-PY",
            version: 1,
            components: [{ sku: "COMP-1", quantity: 2 }],
          }),
        })
        // assembleKit GET /inventory
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "COMP-1", locationId: "loc-assembly", version: 3 },
            { sku: "KIT-PY", locationId: "loc-assembly", version: 1 },
          ],
        })
        // assembleKit POST /kits/assemble
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        // disassembleKit GET /kits/KIT-PY
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            sku: "KIT-PY",
            version: 1,
            components: [{ sku: "COMP-1", quantity: 2 }],
          }),
        })
        // disassembleKit GET /inventory
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "KIT-PY", locationId: "loc-assembly", version: 2 },
          ],
        })
        // disassembleKit POST /kits/disassemble
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      await adapter.assembleKit(
        "tenant-py",
        "loc-assembly",
        "KIT-PY",
        10,
        "actor-1",
        "ref-asm-1",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/kits/assemble",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"kitSku":"KIT-PY"'),
        }),
      );

      await adapter.disassembleKit(
        "tenant-py",
        "loc-assembly",
        "KIT-PY",
        5,
        "actor-1",
        "ref-disasm-1",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/kits/disassemble",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"kitSku":"KIT-PY"'),
        }),
      );
    });

    it("should reject repeated legacy kit command with conflicting quantity", async () => {
      const cacheKey = `python-kit:${JSON.stringify(["assemble", "tenant-py", "loc-1", "KIT-X", "ref-repeat"])}`;
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ kitSku: "KIT-X", quantity: 5 }),
      );

      await expect(
        adapter.assembleKit(
          "tenant-py",
          "loc-1",
          "KIT-X",
          10,
          "actor-1",
          "ref-repeat",
        ),
      ).rejects.toThrow(
        "Kit reference was already used with another quantity.",
      );
    });
  });

  describe("Procurement and Suppliers", () => {
    it("should fetch purchase orders for tenant", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "po-1",
            poNumber: "PO-100",
            status: "DRAFT",
            supplier: "Acme Supplies",
            items: [],
          },
        ],
      });
      global.fetch = mockFetch;

      const pos = await adapter.getPurchaseOrders("tenant-py");
      expect(pos).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/purchase-orders?tenantId=tenant-py&limit=1000",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should throw when multiple suppliers match the same name in createPurchaseOrder", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "sup-1", name: "Global Steel" },
          { id: "sup-2", name: "Global Steel" },
        ],
      });
      global.fetch = mockFetch;

      await expect(
        adapter.createPurchaseOrder("tenant-py", "Global Steel", [
          { sku: "STEEL-1", quantity: 10, unitCostCents: 500 },
        ]),
      ).rejects.toThrow(
        "More than one supplier matches this name; choose the intended supplier.",
      );
    });

    it("should throw when matching supplier is inactive", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { id: "sup-1", name: "Inactive Corp", isActive: false },
        ],
      });
      global.fetch = mockFetch;

      await expect(
        adapter.createPurchaseOrder("tenant-py", "Inactive Corp", [
          { sku: "STEEL-1", quantity: 10, unitCostCents: 500 },
        ]),
      ).rejects.toThrow("Supplier is inactive.");
    });

    it("should throw when supplier ID UUID is not found", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      });
      global.fetch = mockFetch;

      const validUuid = "12345678-1234-1234-1234-123456789abc";
      await expect(
        adapter.createPurchaseOrder("tenant-py", validUuid, [
          { sku: "STEEL-1", quantity: 10, unitCostCents: 500 },
        ]),
      ).rejects.toThrow("Supplier not found.");
    });

    it("should approve, send, and receive purchase orders with stable receipt ID", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.approvePurchaseOrder("tenant-py", "po-100");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/purchase-orders/po-100/approve",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"tenantId":"tenant-py"'),
        }),
      );

      await adapter.sendPurchaseOrder("tenant-py", "po-100");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/purchase-orders/po-100/send",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"tenantId":"tenant-py"'),
        }),
      );

      await adapter.receivePurchaseOrder(
        "tenant-py",
        "po-100",
        [{ sku: "SKU-A", quantity: 10 }],
        "receipt-stable-1",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/purchase-orders/po-100/receive",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            items: [{ sku: "SKU-A", quantity: 10 }],
            receiptId: "receipt-stable-1",
          }),
        }),
      );
    });

    it("should manage suppliers and draft suggested purchase order", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "sup-1", name: "Supplier One", leadTimeDays: 5 },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "sup-2", name: "Supplier Two" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ policyId: "pol-1", suggestedQuantity: 100 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ poId: "po-draft-1" }),
        });
      global.fetch = mockFetch;

      const suppliers = await adapter.getSuppliers("tenant-py");
      expect(suppliers).toHaveLength(1);

      const newSup = await adapter.createSupplier(
        "tenant-py",
        "Supplier Two",
        "contact@sup2.com",
        7,
      );
      expect(newSup.id).toBe("sup-2");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/suppliers",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Supplier Two"'),
        }),
      );

      const suggestions =
        await adapter.getReplenishmentSuggestions("tenant-py");
      expect(suggestions).toHaveLength(1);

      const drafted = await adapter.draftSuggestedPurchaseOrder(
        "pol-1",
        2,
        "mut-draft-1",
      );
      expect(drafted.poId).toBe("po-draft-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/reorder-policies/pol-1/draft",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            expectedVersion: 2,
            mutationId: "mut-draft-1",
          }),
        }),
      );
    });

    it("should fetch FEFO pick suggestions and trace lot recall", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { lotNumber: "LOT-99", expirationDate: "2026-12-31" },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lotNumber: "LOT-99", affectedCustomers: 3 }),
        });
      global.fetch = mockFetch;

      const suggestions = await adapter.getFefoPickSuggestions(
        "tenant-py",
        "SKU-MILK",
        10,
      );
      expect(suggestions).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/inventory/fefo-pick?sku=SKU-MILK&quantity=10&tenantId=tenant-py",
        expect.objectContaining({ method: "GET" }),
      );

      const recall = await adapter.traceRecall("tenant-py", "LOT-99");
      expect(recall.affectedCustomers).toBe(3);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/inventory/reports/recall/LOT-99?tenantId=tenant-py",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("Warehouse Layout, Routing, and Putaway", () => {
    it("should fetch, save, and delete warehouse locations", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "loc-1", name: "Aisle 1" }],
      });
      global.fetch = mockFetch;

      const locations = await adapter.getWarehouseLocations("tenant-py");
      expect(locations).toHaveLength(1);

      await adapter.saveWarehouseLocation("tenant-py", {
        id: "loc-1",
        name: "Aisle 1",
        type: "bin",
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/warehouse-locations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            id: "loc-1",
            name: "Aisle 1",
            type: "bin",
          }),
        }),
      );

      await adapter.deleteWarehouseLocation("tenant-py", "loc-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/warehouse-locations/loc-1?tenantId=tenant-py",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should fetch putaway suggestions and optimized pick route", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ locationId: "bin-A", suggestedQuantity: 50 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              items: [
                {
                  sku: "SKU-A",
                  locationId: "bin-1",
                  aisle: "1",
                  rack: "B",
                  shelf: "3",
                },
              ],
            },
          ],
        });
      global.fetch = mockFetch;

      const suggestions = await adapter.getPutawaySuggestions(
        "tenant-py",
        "SKU-A",
        50,
      );
      expect(suggestions).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/warehouse-locations/putaway-suggestions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            sku: "SKU-A",
            quantity: 50,
          }),
        }),
      );

      const route = await adapter.getOptimizedPickRoute("tenant-py", ["SKU-A"]);
      expect(route).toEqual([
        "SKU-A from bin bin-1 (Aisle 1, Rack B, Shelf 3)",
      ]);
    });

    it("should handle routeOrder and reorder policies", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            planId: "route-plan-1",
            originLocationId: "wh-1",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "pol-1", sku: "SKU-1", version: 1 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const plan = await adapter.routeOrder(
        "SKU-1",
        10,
        "123 Main St",
        "cheapest",
      );
      expect(plan.planId).toBe("route-plan-1");

      const policies = await adapter.getReorderPolicies("tenant-py");
      expect(policies).toHaveLength(1);

      await adapter.saveReorderPolicy("tenant-py", {
        id: "pol-1",
        sku: "SKU-1",
        version: 1,
      } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/reorder-policies",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"expectedVersion":1'),
        }),
      );

      await adapter.evaluateReorderPolicies("tenant-py");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/reorder-policies/evaluate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-py" }),
        }),
      );
    });
  });

  describe("Webhooks and Outbox Events", () => {
    it("should handle webhook subscriptions and deliveries", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "wh-1", url: "https://hook.site/py" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "del-1", status: "SUCCESS" }],
        });
      global.fetch = mockFetch;

      const hooks = await adapter.getWebhooks("tenant-py");
      expect(hooks).toHaveLength(1);

      await adapter.createWebhook("tenant-py", "https://hook.site/py", [
        "stock.updated",
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/webhooks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            url: "https://hook.site/py",
            eventTypes: ["stock.updated"],
          }),
        }),
      );

      await adapter.deleteWebhook("tenant-py", "wh-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/webhooks/wh-1?tenantId=tenant-py",
        expect.objectContaining({ method: "DELETE" }),
      );

      const deliveries = await adapter.getWebhookDeliveries("tenant-py");
      expect(deliveries).toHaveLength(1);
    });

    it("should return empty array on webhook deliveries error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));
      const deliveries = await adapter.getWebhookDeliveries("tenant-py");
      expect(deliveries).toEqual([]);
    });

    it("should fetch outbox stats, dead letters, and retry outbox event", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pending: 3, failed: 1, published: 2 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "event-dead-1", eventType: "ORDER_CREATED", payload: {} },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: "event-dead-1",
            status: "DEAD_LETTER",
            version: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const stats = await adapter.getOutboxStats();
      expect(stats.pendingCount).toBe(3);

      const dead = await adapter.getDeadLetterEvents(10);
      expect(dead).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/outbox/dead-letter?limit=10",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.retryOutboxEvent("event-dead-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/outbox/event-dead-1/retry",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"expectedVersion":1'),
        }),
      );
    });
  });

  describe("RBAC and User Administration", () => {
    it("should get users, invite user, and update user role", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            users: [{ id: "u-1", email: "user@corp.com", role: "manager" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userId: "u-2",
            temporaryPassword: "temp-pass-123",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const users = await adapter.getUsers("tenant-py");
      expect(users).toHaveLength(1);

      const invited = await adapter.inviteUser(
        "tenant-py",
        "new@corp.com",
        "analyst",
      );
      expect(invited.userId).toBe("u-2");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            email: "new@corp.com",
            role: "analyst",
          }),
        }),
      );

      await adapter.updateUserRole("tenant-py", "u-1", "admin");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/users/u-1/role",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ tenantId: "tenant-py", role: "admin" }),
        }),
      );
    });

    it("should manage roles and role permissions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "r-1", name: "Auditor" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "perm-read", name: "Read Access" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "r-2", name: "Custom Role" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const roles = await adapter.getRoles("tenant-py");
      expect(roles).toHaveLength(1);

      const perms = await adapter.getPermissions();
      expect(perms).toHaveLength(1);

      const createdRole = await adapter.createRole(
        "tenant-py",
        "Custom Role",
        "Description",
        ["perm-read"],
      );
      expect(createdRole.id).toBe("r-2");

      await adapter.updateRolePermissions("r-1", ["perm-read", "perm-write"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/roles/r-1/permissions",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            permissionIds: ["perm-read", "perm-write"],
          }),
        }),
      );

      await adapter.deleteRole("r-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/roles/r-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("Compliance Ledger, State Reconstruction, and Cache", () => {
    it("should get and verify compliance ledger", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ sequenceNumber: 1, action: "DISPATCH" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isValid: true }),
        });
      global.fetch = mockFetch;

      const ledger = await adapter.getComplianceLedger("tenant-py");
      expect(ledger).toHaveLength(1);

      const verify = await adapter.verifyComplianceLedger("tenant-py");
      expect(verify.isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/compliance/verify?tenantId=tenant-py",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should reconstruct state and replay audit", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ stockLevels: { "SKU-1": 100 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ timestamp: "2026-01-01", event: "ADJUST" }],
        });
      global.fetch = mockFetch;

      const state = await adapter.reconstructState(
        "tenant-py",
        "2026-03-01T00:00:00Z",
      );
      expect(state.stockLevels["SKU-1"]).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/compliance/reconstruct?tenantId=tenant-py&timestamp=2026-03-01T00%3A00%3A00Z",
        expect.objectContaining({ method: "GET" }),
      );

      const audit = await adapter.replayAudit(
        "tenant-py",
        "2026-03-01T00:00:00Z",
      );
      expect(audit).toHaveLength(1);
    });

    it("should get cache stats and clear cache with and without tenantId", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hits: 100,
            misses: 10,
            hitRatio: 0.9,
            invalidations: 2,
            activeKeysCount: 50,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, clearedKeysCount: 20 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, clearedKeysCount: 50 }),
        });
      global.fetch = mockFetch;

      const stats = await adapter.getCacheStats();
      expect(stats.hitRatio).toBe(0.9);

      const clearTenant = await adapter.clearCache("tenant-py");
      expect(clearTenant.clearedKeysCount).toBe(20);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/admin/cache/clear?tenantId=tenant-py",
        expect.objectContaining({ method: "POST" }),
      );

      const clearAll = await adapter.clearCache();
      expect(clearAll.clearedKeysCount).toBe(50);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/admin/cache/clear",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("Approvals, Discrepancies, and Anomaly Detection", () => {
    it("should manage approval workflows and decisions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "wf-1", name: "High Value PO", enabled: true },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, enabled: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "req-1", entityType: "PO", requestedBy: "operator" },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            decisions: [{ stepId: "step-1", status: "APPROVED" }],
          }),
        });
      global.fetch = mockFetch;

      const workflows = await adapter.getApprovalWorkflows();
      expect(workflows).toHaveLength(1);

      await adapter.toggleApprovalWorkflow("wf-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/approvals/workflows/wf-1/toggle",
        expect.objectContaining({ method: "POST" }),
      );

      const pending = await adapter.getPendingApprovals();
      expect(pending).toHaveLength(1);

      await adapter.submitApprovalDecision(
        "req-1",
        "APPROVED",
        "Approved by manager",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/approvals/req-1/decide",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            decision: "APPROVED",
            notes: "Approved by manager",
          }),
        }),
      );

      const history = await adapter.getApprovalHistory("req-1");
      expect(history).toHaveLength(1);
    });

    it("should run audit, fetch discrepancies, and resolve discrepancy", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ auditRunId: "audit-123", status: "COMPLETED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "disc-1",
              sku: "SKU-DIFF",
              expectedQuantity: 10,
              actualQuantity: 8,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const run = await adapter.runAudit("tenant-py");
      expect(run.auditRunId).toBe("audit-123");

      const discrepancies = await adapter.getDiscrepancies("tenant-py");
      expect(discrepancies).toHaveLength(1);

      await adapter.resolveDiscrepancy(
        "tenant-py",
        "disc-1",
        "Lost in transit",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/audit/discrepancies/disc-1/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-py",
            notes: "Lost in transit",
          }),
        }),
      );
    });

    it("should analyze inventory anomalies and get rebalance matrix", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            anomalies: [{ sku: "SKU-SPIKE", deviation: 4.2 }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ matrix: [] }),
        });
      global.fetch = mockFetch;

      const anomalies = await adapter.analyzeInventoryAnomalies(
        "tenant-py",
        "2026-01-01",
        "2026-03-01",
      );
      expect(anomalies.anomalies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/anomaly-detection/analyze?tenantId=tenant-py&startDate=2026-01-01&endDate=2026-03-01",
        expect.objectContaining({ method: "GET" }),
      );

      const matrix = await adapter.getRebalanceMatrix("tenant-py");
      expect(matrix).toEqual({ matrix: [] });
    });
  });

  describe("Cycle Counts and Stock Adjustments", () => {
    it("should start, submit, review cycle counts and adjust stock", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ record_id: "cc-101", name: "Monthly Count" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ record_id: "cc-101", status: "PENDING_REVIEW" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const started = await adapter.startCycleCount(
        "tenant-py",
        "Monthly Count",
        true,
        "A",
        "zone-1",
      );
      expect(started.id).toBe("cc-101");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/cycle-counts/start",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"is_blind_count":true'),
        }),
      );

      await adapter.submitCycleCount("cc-101", {
        revision: 1,
        items: [{ sku: "SKU-A", countedQuantity: 12 }],
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/cycle-counts/submit",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"record_id":"cc-101"'),
        }),
      );

      const counts = await adapter.getCycleCounts("tenant-py");
      expect(counts[0].id).toBe("cc-101");

      await adapter.reviewCycleCount(
        "cc-101",
        "approve",
        1,
        "Approved variance",
        "mut-rev-1",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/cycle-counts/cc-101/approve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            revision: 1,
            reason: "Approved variance",
            mutation_id: "mut-rev-1",
          }),
        }),
      );

      await adapter.adjustStock({
        sku: "SKU-A",
        location_id: "loc-1",
        delta: 2,
        expected_version: 1,
        reason_code: "CORRECTION",
        reason: "Cycle count variance adjustment",
        mutation_id: "mut-adj-1",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/api/cycle-counts/adjust",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"delta":2'),
        }),
      );
    });
  });

  describe("ASNs, Notifications, and Intercompany", () => {
    it("should submit and retrieve ASNs", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ asnId: "asn-001" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "asn-001", poId: "po-100" }],
        });
      global.fetch = mockFetch;

      const created = await adapter.submitASN(
        "tenant-py",
        "po-100",
        "sup-1",
        "2026-04-01",
        [{ sku: "SKU-1", quantity: 50 }],
      );
      expect(created.asnId).toBe("asn-001");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/supplier/asn",
        expect.objectContaining({ method: "POST" }),
      );

      const asns = await adapter.getASNs("tenant-py", "sup-1");
      expect(asns).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/supplier/asn?tenantId=tenant-py&supplierId=sup-1",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should handle user notifications, read status, snooze, and escalation", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "notif-1", read: false }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "notif-1", read: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ unread_count: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, snoozed_until: "2026-03-02" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "mgr-1", name: "Operations Director" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const notifs = await adapter.getNotifications("tenant-py", "user-1");
      expect(notifs).toHaveLength(1);

      await adapter.markNotificationRead("notif-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/notifications/notif-1/read",
        expect.objectContaining({ method: "POST" }),
      );

      const own = await adapter.getOwnNotifications("tenant-py");
      expect(own).toHaveLength(1);

      const unread = await adapter.getOwnUnreadCount();
      expect(unread.unread_count).toBe(0);

      const snoozed = await adapter.snoozeOwnNotification("notif-1", 4);
      expect(snoozed.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/notifications/notif-1/snooze",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ hours: 4 }),
        }),
      );

      const managers = await adapter.getNotificationManagers();
      expect(managers).toHaveLength(1);

      await adapter.escalateOwnNotification("notif-1", "mgr-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/notifications/notif-1/escalate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ target_manager_id: "mgr-1" }),
        }),
      );
    });

    it("should handle legal entities and intercompany transfers", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "entity-1", name: "US Entity" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "entity-1", name: "US Entity" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transferId: "ic-transfer-10" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "ic-transfer-10", status: "COMPLETED" }],
        });
      global.fetch = mockFetch;

      const entity = await adapter.createLegalEntity(
        "tenant-py",
        "US Entity",
        "USD",
        "US-TAX-123",
      );
      expect(entity.id).toBe("entity-1");

      const entities = await adapter.getLegalEntities("tenant-py");
      expect(entities).toHaveLength(1);

      const transfer = await adapter.executeIntercompanyTransfer({
        tenantId: "tenant-py",
        fromEntityId: "entity-1",
        toEntityId: "entity-2",
        sku: "SKU-IC-1",
        quantity: 20,
        unitCostCents: 1000,
        markupPercentage: 15,
      });
      expect(transfer.transferId).toBe("ic-transfer-10");

      const transfers = await adapter.getIntercompanyTransfers("tenant-py");
      expect(transfers).toHaveLength(1);
    });
  });

  describe("Storefront Integrations and Financial Accounting", () => {
    it("should connect storefront channels and retrieve Shopify connections", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "conn-1",
              provider: "SHOPIFY",
              origin: "mystore.myshopify.com",
              active: true,
            },
            {
              id: "conn-2",
              provider: "AMAZON",
              origin: "amazon.com",
              active: true,
            },
          ],
        });
      global.fetch = mockFetch;

      await adapter.connectShopify(
        "tenant-py",
        "mystore.myshopify.com",
        "shpat_test",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/shopify/connect",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.connectAmazon(
        "tenant-py",
        "seller-1",
        "mws-token",
        "ATVPDKIKX0DER",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/integrations/amazon/connect",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.connectWooCommerce(
        "tenant-py",
        "https://woo.store",
        "ck_1",
        "cs_1",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/integrations/woocommerce/connect",
        expect.objectContaining({ method: "POST" }),
      );

      const shopifyConns = await adapter.getShopifyConnections("tenant-py");
      expect(shopifyConns).toHaveLength(1);
      expect(shopifyConns[0].storeDomain).toBe("mystore.myshopify.com");
    });

    it("should activate accounting, post journal, reverse journal, and close period", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ activated: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "j-1", lines: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "j-rev-1", lines: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ closedThrough: "2026-02-28" }),
        });
      global.fetch = mockFetch;

      await adapter.activateFinancialAccounting({
        tenantId: "tenant-py",
        expectedVersion: 0,
        mutationId: "mut-act-1",
        reason: "Initialize accounting",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/financial/activate",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.postFinancialJournal({
        tenantId: "tenant-py",
        date: "2026-03-01",
        description: "Test entry",
        method: "MANUAL",
        lines: [],
        mutationId: "mut-j-1",
        reason: "Manual adjustment",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/journals",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.reverseFinancialJournal("j-1", {
        tenantId: "tenant-py",
        date: "2026-03-02",
        mutationId: "mut-rev-1",
        reason: "Correction",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/journals/j-1/reverse",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.closeFinancialPeriod({
        tenantId: "tenant-py",
        closedThrough: "2026-02-28",
        expectedVersion: 1,
        mutationId: "mut-close-1",
        reason: "Month end close",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/financial/close-period",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should create, settle, credit, and refund financial documents", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ documentId: "doc-100" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, remainingCents: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const doc = await adapter.createFinancialDocument({
        tenantId: "tenant-py",
        kind: "SALE",
        date: "2026-03-01",
        reference: "INV-100",
        counterparty: "Customer A",
        amountCents: 5000,
        sourceIds: ["order-1"],
        mutationId: "mut-doc-1",
        reason: "Sale invoice",
      });
      expect(doc.documentId).toBe("doc-100");

      await adapter.settleFinancialDocument("doc-100", {
        expectedVersion: 1,
        amountCents: 5000,
        date: "2026-03-01",
        reference: "PAY-1",
        mutationId: "mut-settle-1",
        reason: "Invoice payment",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/documents/doc-100/settle",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.applyFinancialCredit("doc-100", {
        expectedVersion: 2,
        sourceId: "credit-note-1",
        amountCents: 1000,
        date: "2026-03-02",
        reference: "CR-1",
        mutationId: "mut-cr-1",
        reason: "Return credit applied",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/documents/doc-100/credit",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.refundFinancialDocument("doc-100", {
        expectedVersion: 3,
        amountCents: 500,
        date: "2026-03-03",
        reference: "REF-1",
        mutationId: "mut-ref-1",
        reason: "Customer partial refund",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8001/accounting/documents/doc-100/refund",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
