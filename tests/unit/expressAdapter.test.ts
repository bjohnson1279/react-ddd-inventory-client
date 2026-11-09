import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpressRESTAdapter } from "../../src/api/express";

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

describe("ExpressRESTAdapter Comprehensive Suite", () => {
  let adapter: ExpressRESTAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    adapter = new ExpressRESTAdapter();
  });

  describe("Product catalog & barcodes handling", () => {
    it("should assemble products from barcode assignments and inventory items", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "b-1",
              variantId: "SKU-A",
              barcodeValue: "111222",
              symbology: "CODE128",
              source: "internal",
              isPrimary: true,
              assignedAt: "2026-01-01",
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "SKU-A", quantity: 10 },
            { sku: "SKU-B", quantity: 5 },
          ],
        });
      global.fetch = mockFetch;

      const products = await adapter.getProducts();
      expect(products).toHaveLength(2);

      const prodA = products.find((p) => p.id === "prod-SKU-A");
      expect(prodA).toBeDefined();
      expect(prodA?.variants[0].barcodes).toHaveLength(1);
      expect(prodA?.variants[0].barcodes[0].barcode.value).toBe("111222");

      const prodB = products.find((p) => p.id === "prod-SKU-B");
      expect(prodB).toBeDefined();
      expect(prodB?.variants[0].barcodes).toEqual([]);
    });

    it("should return empty list and log warning when getProducts fails", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network failure"));
      global.fetch = mockFetch;

      const products = await adapter.getProducts();
      expect(products).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("should create product and variant", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.createProduct("p-1", "Product 1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/inventory/products",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "p-1", name: "Product 1" }),
        }),
      );

      await adapter.addProductVariant("p-1", "SKU-1", "quantity", [
        { name: "Size", value: "L" },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/inventory/products/p-1/variants",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-1",
            trackingMode: "quantity",
            attributes: [{ name: "Size", value: "L" }],
          }),
        }),
      );
    });

    it("should assign and generate internal barcode", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ barcodeValue: "INT-SKU-1-999" }),
        });
      global.fetch = mockFetch;

      await adapter.assignBarcode("SKU-1", "999888", "EAN-13", "internal", true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/barcodes/assign",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-1",
            barcodeValue: "999888",
            symbology: "EAN-13",
            source: "internal",
            makePrimary: true,
          }),
        }),
      );

      const generated = await adapter.generateInternalBarcode("SKU-1", "tenant-1");
      expect(generated).toBe("INT-SKU-1-999");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/barcodes/generate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ sku: "SKU-1", tenantId: "tenant-1" }),
        }),
      );
    });

    it("should execute barcode scan", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "success", matched: true }),
      });
      global.fetch = mockFetch;

      const result = await adapter.scanBarcode(
        "123456",
        "inventory",
        1,
        10,
        "tenant-1",
        "loc-1",
        "user-1",
      );
      expect(result).toEqual({ status: "success", matched: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/barcodes/scan",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            barcodeValue: "123456",
            context: "inventory",
            scannedAmount: 1,
            actualQuantity: 10,
            tenantId: "tenant-1",
            locationId: "loc-1",
            actorId: "user-1",
          }),
        }),
      );
    });
  });

  describe("Procurement and Purchase Orders", () => {
    it("should return empty array if no purchase order IDs exist in localStorage", async () => {
      const pos = await adapter.getPurchaseOrders("tenant-empty");
      expect(pos).toEqual([]);
    });

    it("should fetch purchase orders in bulk and filter by tenant PO IDs", async () => {
      localStorage.setItem("po_ids_tenant-1", JSON.stringify(["po-1", "po-2"]));
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: "po-1", supplier: "Supplier A", status: "APPROVED" },
            { id: "po-2", supplier: "Supplier B", status: "PENDING" },
            { id: "po-unrelated", supplier: "Supplier C", status: "PENDING" },
          ],
        }),
      });
      global.fetch = mockFetch;

      const pos = await adapter.getPurchaseOrders("tenant-1");
      expect(pos).toHaveLength(2);
      expect(pos.map((p) => p.id)).toEqual(["po-1", "po-2"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/purchase-orders?tenantId=tenant-1&ids=po-1%2Cpo-2",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should handle error gracefully and return empty array when bulk fetch fails", async () => {
      localStorage.setItem("po_ids_tenant-1", JSON.stringify(["po-1"]));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Database disconnected"));
      global.fetch = mockFetch;

      const pos = await adapter.getPurchaseOrders("tenant-1");
      expect(pos).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("should create purchase order and append its ID to localStorage", async () => {
      localStorage.setItem("po_ids_tenant-1", JSON.stringify(["po-existing"]));
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "po-new" }),
      });
      global.fetch = mockFetch;

      await adapter.createPurchaseOrder("tenant-1", "Acme Corp", [
        { sku: "SKU-1", quantity: 5, unitCostCents: 500 },
      ]);

      const stored = JSON.parse(localStorage.getItem("po_ids_tenant-1") || "[]");
      expect(stored).toEqual(["po-existing", "po-new"]);
    });

    it("should approve, send, and receive purchase order", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.approvePurchaseOrder("tenant-1", "po-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/purchase-orders/po-1/approve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-1" }),
        }),
      );

      await adapter.sendPurchaseOrder("tenant-1", "po-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/purchase-orders/po-1/send",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-1" }),
        }),
      );

      await adapter.receivePurchaseOrder("tenant-1", "po-1", [
        { sku: "SKU-1", quantity: 5 },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/purchase-orders/po-1/receive",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            items: [{ sku: "SKU-1", quantity: 5 }],
          }),
        }),
      );
    });
  });

  describe("Forecasting & FEFO", () => {
    it("should map forecasting report items with defaults", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            sku: "SKU-F1",
            currentStock: 50,
            salesVelocity7d: 5,
            salesVelocity30d: 20,
            salesVelocity90d: 60,
            forecastedDemand: 25,
            suggestedROP: 30,
            safetyStock: 10,
          },
          {
            sku: "SKU-F2",
            // missing optional fields
          },
        ],
      });
      global.fetch = mockFetch;

      const report = await adapter.getForecastingReport("loc-east");
      expect(report).toHaveLength(2);
      expect(report[0].name).toBe("SKU: SKU-F1");
      expect(report[0].suggestedROP).toBe(30);

      expect(report[1].name).toBe("SKU: SKU-F2");
      expect(report[1].currentStock).toBe(0);
      expect(report[1].salesVelocity7d).toBe(0);
      expect(report[1].suggestedROP).toBe(0);
    });

    it("should get FEFO pick suggestions and trace recall", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ lot: "LOT-A", quantity: 5 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lotNumber: "LOT-A", status: "RECALLED" }),
        });
      global.fetch = mockFetch;

      const fefo = await adapter.getFefoPickSuggestions("tenant-1", "SKU-1", 10);
      expect(fefo).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/inventory/fefo-pick?sku=SKU-1&quantity=10&tenantId=tenant-1",
        expect.objectContaining({ method: "GET" }),
      );

      const recall = await adapter.traceRecall("tenant-1", "LOT-A");
      expect(recall.status).toBe("RECALLED");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/inventory/reports/recall/LOT-A?tenantId=tenant-1",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("Valuation report computation", () => {
    it("should calculate valuation report in chunks with inventory quantities", async () => {
      const mockFetch = vi
        .fn()
        // barcodes for getProducts
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        // inventory items for getProducts
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "SKU-1", quantity: 10 },
            { sku: "SKU-ZERO", quantity: 0 },
          ],
        })
        // getInventoryItems call inside getValuationReport
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { sku: "SKU-1", quantity: 10 },
            { sku: "SKU-ZERO", quantity: 0 },
          ],
        })
        // valuation request for SKU-1
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            methodUsed: "FIFO",
            totalCostCents: 15000,
            unitCostCents: 1500,
          }),
        });
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport("tenant-1", "loc-1", "FIFO");
      expect(report).toHaveLength(2);

      const item1 = report.find((r) => r.sku === "SKU-1");
      expect(item1).toBeDefined();
      expect(item1?.totalQuantity).toBe(10);
      expect(item1?.totalValueCents).toBe(15000);
      expect(item1?.unitCostCents).toBe(1500);

      const itemZero = report.find((r) => r.sku === "SKU-ZERO");
      expect(itemZero).toBeDefined();
      expect(itemZero?.totalQuantity).toBe(0);
      expect(itemZero?.totalValueCents).toBe(0);
    });

    it("should return empty array if getValuationReport encounters top-level rejection", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Global failure"));
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport("tenant-1");
      expect(report).toEqual([]);
      errorSpy.mockRestore();
    });
  });

  describe("Outbox & Event delivery", () => {
    it("should retrieve outbox stats with default fallback values", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pending: 4, published: 12, failed: 1 }),
        })
        .mockRejectedValueOnce(new Error("Stats API down"));
      global.fetch = mockFetch;

      const stats1 = await adapter.getOutboxStats();
      expect(stats1).toEqual({ pendingCount: 4, publishedCount: 12, failedCount: 1 });

      const stats2 = await adapter.getOutboxStats();
      expect(stats2).toEqual({ pendingCount: 0, publishedCount: 0, failedCount: 0 });
    });

    it("should fetch dead letter events and map payloads correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "dl-1",
            eventType: "OrderCancelled",
            payload: { orderId: "ord-100" },
            error: "Webhook unreachable",
            status: "Failed",
            occurredAt: "2026-03-01T12:00:00Z",
          },
          {
            id: "dl-2",
            type: "StockUpdated",
            payload: "raw-string-payload",
            errorMessage: "Broker offline",
          },
        ],
      });
      global.fetch = mockFetch;

      const events = await adapter.getDeadLetterEvents(10);
      expect(events).toHaveLength(2);
      expect(events[0].payload).toBe('{"orderId":"ord-100"}');
      expect(events[0].error).toBe("Webhook unreachable");

      expect(events[1].eventType).toBe("StockUpdated");
      expect(events[1].payload).toBe("raw-string-payload");
      expect(events[1].error).toBe("Broker offline");
      expect(events[1].status).toBe("Failed");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/outbox/dead-letter?limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should return empty array when getDeadLetterEvents fails", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Dead letter failed"));
      global.fetch = mockFetch;

      const events = await adapter.getDeadLetterEvents();
      expect(events).toEqual([]);
      errorSpy.mockRestore();
    });

    it("should retry outbox event", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "RETRY_QUEUED" }),
      });
      global.fetch = mockFetch;

      await adapter.retryOutboxEvent("evt/dl-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/outbox/evt%2Fdl-1/retry",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("Kitting operations", () => {
    it("should assemble and disassemble kits", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.assembleKit("tenant-1", "loc-1", "KIT-A", 3, "user-1", "ref-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/kits/assemble",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            locationId: "loc-1",
            kitSku: "KIT-A",
            quantity: 3,
            actorId: "user-1",
            referenceId: "ref-1",
          }),
        }),
      );

      await adapter.disassembleKit("tenant-1", "loc-1", "KIT-A", 1, "user-1", "ref-2");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/kits/disassemble",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            locationId: "loc-1",
            kitSku: "KIT-A",
            quantity: 1,
            actorId: "user-1",
            referenceId: "ref-2",
          }),
        }),
      );
    });
  });

  describe("Returns and Quarantine", () => {
    it("should fetch quarantined items and normalize fields", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "q-1",
            sku: "SKU-DEFECT",
            locationId: "loc-q",
            quantity: 2,
            reason: "Damaged packaging",
            status: "Quarantined",
            createdAt: "2026-02-15T00:00:00Z",
          },
          {
            id: "q-2",
            variantId: "SKU-EXPIRED",
            // missing reason/quantity
          },
        ],
      });
      global.fetch = mockFetch;

      const items = await adapter.getQuarantinedItems("tenant-1");
      expect(items).toHaveLength(2);
      expect(items[0].sku).toBe("SKU-DEFECT");
      expect(items[0].quantity).toBe(2);

      expect(items[1].sku).toBe("SKU-EXPIRED");
      expect(items[1].quantity).toBe(0);
      expect(items[1].status).toBe("Quarantined");
    });

    it("should return empty array when getQuarantinedItems rejects", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFetch = vi.fn().mockRejectedValue(new Error("Quarantine DB timeout"));
      global.fetch = mockFetch;

      const items = await adapter.getQuarantinedItems("tenant-1");
      expect(items).toEqual([]);
      errorSpy.mockRestore();
    });

    it("should resolve quarantine item", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "RESOLVED" }),
      });
      global.fetch = mockFetch;

      await adapter.resolveQuarantine("tenant-1", "q-10", "RESTOCKED");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/returns/quarantine/q-10/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            resolution: "RESTOCKED",
          }),
        }),
      );
    });
  });

  describe("Compliance ledger, reconstruction, and cache", () => {
    it("should reconstruct compliance state with or without timestamp", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: "valid" }),
      });
      global.fetch = mockFetch;

      await adapter.reconstructState("tenant-comp");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:5000/api/compliance/reconstruct?tenantId=tenant-comp",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.reconstructState("tenant-comp", "2026-01-01T12:00:00Z");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:5000/api/compliance/reconstruct?tenantId=tenant-comp&timestamp=2026-01-01T12%3A00%3A00Z",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should replay compliance audit trail with or without timestamp", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ sequence: 1 }],
      });
      global.fetch = mockFetch;

      await adapter.replayAudit("tenant-comp");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:5000/api/compliance/replay?tenantId=tenant-comp",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.replayAudit("tenant-comp", "2026-01-01T12:00:00Z");
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://localhost:5000/api/compliance/replay?tenantId=tenant-comp&timestamp=2026-01-01T12%3A00%3A00Z",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should fetch cache stats and clear cache with or without tenantId", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            hits: 100,
            misses: 10,
            hitRatio: 0.9,
            invalidations: 2,
            activeKeysCount: 45,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, clearedKeysCount: 15 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, clearedKeysCount: 45 }),
        });
      global.fetch = mockFetch;

      const stats = await adapter.getCacheStats();
      expect(stats.hitRatio).toBe(0.9);

      await adapter.clearCache("tenant-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/admin/cache/clear?tenantId=tenant-1",
        expect.objectContaining({ method: "POST" }),
      );

      await adapter.clearCache();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/admin/cache/clear",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("Intercompany transfers and entities", () => {
    it("should create legal entity and list legal entities", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "entity-1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "entity-1", name: "EU Corp" }],
        });
      global.fetch = mockFetch;

      const entity = await adapter.createLegalEntity(
        "tenant-1",
        "EU Corp",
        "EUR",
        "VAT-999",
      );
      expect(entity).toEqual({ id: "entity-1" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/intercompany/entities",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-1",
            name: "EU Corp",
            baseCurrency: "EUR",
            taxIdentifier: "VAT-999",
          }),
        }),
      );

      const list = await adapter.getLegalEntities("tenant-1");
      expect(list).toEqual([{ id: "entity-1", name: "EU Corp" }]);
    });

    it("should execute intercompany transfer and fetch transfer records", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "transfer-1", status: "COMPLETED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "transfer-1", status: "COMPLETED" }],
        });
      global.fetch = mockFetch;

      const dto = {
        tenantId: "tenant-1",
        fromEntityId: "ent-1",
        toEntityId: "ent-2",
        sku: "SKU-TRANS",
        quantity: 50,
        unitCostCents: 1200,
        markupPercentage: 5,
        dutyCents: 200,
      };

      const result = await adapter.executeIntercompanyTransfer(dto);
      expect(result.id).toBe("transfer-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/intercompany/transfers",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(dto),
        }),
      );

      const records = await adapter.getIntercompanyTransfers("tenant-1");
      expect(records).toHaveLength(1);
    });
  });

  describe("Administrative RBAC and Approvals", () => {
    it("should list users, invite user, and update user role", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ id: "u-1", email: "user@example.com" }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ userId: "u-2", temporaryPassword: "temp123Password" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const users = await adapter.getUsers("tenant-1");
      expect(users).toHaveLength(1);

      const invited = await adapter.inviteUser("tenant-1", "new@example.com", "OPERATOR");
      expect(invited.userId).toBe("u-2");
      expect(invited.temporaryPassword).toBe("temp123Password");

      await adapter.updateUserRole("tenant-1", "u-1", "ADMIN");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/users/u-1/role",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ tenantId: "tenant-1", role: "ADMIN" }),
        }),
      );
    });

    it("should manage approval workflows and decisions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "wf-1", enabled: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "wf-1", enabled: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "pending-1" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "decision-1", status: "APPROVED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ decisions: [{ id: "dec-1", decision: "APPROVED" }] }),
        });
      global.fetch = mockFetch;

      const workflows = await adapter.getApprovalWorkflows();
      expect(workflows).toHaveLength(1);

      await adapter.toggleApprovalWorkflow("wf-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/approvals/workflows/wf-1/toggle",
        expect.objectContaining({ method: "POST" }),
      );

      const pending = await adapter.getPendingApprovals();
      expect(pending).toHaveLength(1);

      await adapter.submitApprovalDecision("pending-1", "APPROVED", "All clear");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/approvals/pending-1/decide",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ decision: "APPROVED", notes: "All clear" }),
        }),
      );

      const history = await adapter.getApprovalHistory("req-1");
      expect(history).toEqual([{ id: "dec-1", decision: "APPROVED" }]);
    });
  });

  describe("Storefront and Channel Integrations", () => {
    it("should fetch connections and shopify connections", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "conn-1", platform: "SHOPIFY" }]),
          json: async () => [{ id: "conn-1", platform: "SHOPIFY" }],
        });
      global.fetch = mockFetch;

      const conns = await adapter.getConnections("tenant-conn");
      expect(conns).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/integrations/connections?tenantId=tenant-conn",
        expect.objectContaining({ method: "GET" }),
      );

      const shopifyConns = await adapter.getShopifyConnections("tenant-conn");
      expect(shopifyConns).toHaveLength(1);
      expect(shopifyConns[0].storeDomain).toBe("mock-store.myshopify.com");
    });

    it("should connect shopify, amazon, and woocommerce", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      await adapter.connectShopify("tenant-conn", "test.myshopify.com", "shpat_123");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/shopify/connect",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-conn", storeDomain: "test.myshopify.com", accessToken: "shpat_123" }),
        }),
      );

      await adapter.connectAmazon("tenant-conn", "seller_123", "mws_auth_456", "ATVPDKIKX0DER");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/integrations/amazon/connect",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-conn",
            sellerId: "seller_123",
            mwsAuthToken: "mws_auth_456",
            marketplaceId: "ATVPDKIKX0DER",
          }),
        }),
      );

      await adapter.connectWooCommerce("tenant-conn", "https://woo.store", "ck_abc", "cs_xyz");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/integrations/woocommerce/connect",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-conn",
            storeUrl: "https://woo.store",
            consumerKey: "ck_abc",
            consumerSecret: "cs_xyz",
          }),
        }),
      );
    });
  });

  describe("General Ledger & Stock Onboarding", () => {
    it("should fetch journal entries and stock onboardings", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "je-1", description: "Initial stock" }]),
          json: async () => [{ id: "je-1", description: "Initial stock" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "onb-1", status: "PENDING" }]),
          json: async () => [{ id: "onb-1", status: "PENDING" }],
        });
      global.fetch = mockFetch;

      const entries = await adapter.getJournalEntries("tenant-gl");
      expect(entries).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/accounting/ledger?tenantId=tenant-gl",
        expect.objectContaining({ method: "GET" }),
      );

      const onboardings = await adapter.getStockOnboardings("tenant-gl");
      expect(onboardings).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/onboarding?tenantId=tenant-gl",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should submit stock onboarding", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;

      await adapter.submitStockOnboarding("onb-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/onboarding/onb-1/submit",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("Reorder Policies and Order Routing", () => {
    it("should route order to fulfillment nodes", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ routeId: "route-1", assignedNode: "node-east" }),
        json: async () => ({ routeId: "route-1", assignedNode: "node-east" }),
      });
      global.fetch = mockFetch;

      const res = await adapter.routeOrder("SKU-1", 2, "123 Main St", "LEAST_COST");
      expect(res.assignedNode).toBe("node-east");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/shipping/route",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sku: "SKU-1",
            quantity: 2,
            destinationAddress: "123 Main St",
            strategyName: "LEAST_COST",
          }),
        }),
      );
    });

    it("should get, save, and evaluate reorder policies", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ sku: "SKU-A", minStock: 10, maxStock: 50 }]),
          json: async () => [{ sku: "SKU-A", minStock: 10, maxStock: 50 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const policies = await adapter.getReorderPolicies("tenant-pol");
      expect(policies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reorder-policies?tenantId=tenant-pol",
        expect.objectContaining({ method: "GET" }),
      );

      const policyPayload = { sku: "SKU-A", minQuantity: 15, reorderQuantity: 60 } as any;
      await adapter.saveReorderPolicy("tenant-pol", policyPayload);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reorder-policies",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-pol", ...policyPayload }),
        }),
      );

      await adapter.evaluateReorderPolicies("tenant-pol");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reorder-policies/evaluate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-pol" }),
        }),
      );
    });
  });

  describe("Webhooks and Warehouse Locations", () => {
    it("should manage webhooks and webhook deliveries", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "wh-1", url: "https://hook.site" }]),
          json: async () => [{ id: "wh-1", url: "https://hook.site" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ deliveryId: "del-1", status: "SUCCESS" }]),
          json: async () => [{ deliveryId: "del-1", status: "SUCCESS" }],
        });
      global.fetch = mockFetch;

      const webhooks = await adapter.getWebhooks("tenant-wh");
      expect(webhooks).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/webhooks?tenantId=tenant-wh",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.deleteWebhook("tenant-wh", "wh-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/webhooks/wh-1?tenantId=tenant-wh",
        expect.objectContaining({ method: "DELETE" }),
      );

      const deliveries = await adapter.getWebhookDeliveries("tenant-wh");
      expect(deliveries).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/webhooks/deliveries?tenantId=tenant-wh",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should manage warehouse locations and putaway suggestions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "loc-1", name: "Aisle 1" }]),
          json: async () => [{ id: "loc-1", name: "Aisle 1" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ sku: "SKU-1", suggestedBin: "A-01-01" }]),
          json: async () => [{ sku: "SKU-1", suggestedBin: "A-01-01" }],
        });
      global.fetch = mockFetch;

      const locations = await adapter.getWarehouseLocations("tenant-wh");
      expect(locations).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/warehouse-locations?tenantId=tenant-wh",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.saveWarehouseLocation("tenant-wh", { id: "loc-2", zone: "A", aisle: "1", rack: "1", shelf: "1", bin: "1" } as any);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/warehouse-locations",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-wh", id: "loc-2", zone: "A", aisle: "1", rack: "1", shelf: "1", bin: "1" }),
        }),
      );

      await adapter.deleteWarehouseLocation("tenant-wh", "loc-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/warehouse-locations/loc-1?tenantId=tenant-wh",
        expect.objectContaining({ method: "DELETE" }),
      );

      const putaway = await adapter.getPutawaySuggestions("tenant-wh", "SKU-1", 5);
      expect(putaway).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/warehouse-locations/putaway-suggestions",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-wh", sku: "SKU-1", quantity: 5 }),
        }),
      );
    });
  });

  describe("RBAC, Auditing and Discrepancies", () => {
    it("should manage roles and permissions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "role-1", name: "Editor" }]),
          json: async () => [{ id: "role-1", name: "Editor" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(["read:products", "write:products"]),
          json: async () => ["read:products", "write:products"],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: "role-2", name: "Manager" }),
          json: async () => ({ id: "role-2", name: "Manager" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const roles = await adapter.getRoles("tenant-rbac");
      expect(roles).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/roles?tenantId=tenant-rbac",
        expect.objectContaining({ method: "GET" }),
      );

      const permissions = await adapter.getPermissions();
      expect(permissions).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/roles/permissions",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.createRole("tenant-rbac", "Manager", "Manager role", ["read:products"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/roles",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-rbac", name: "Manager", description: "Manager role", permissionIds: ["read:products"] }),
        }),
      );

      await adapter.updateRolePermissions("role-2", ["admin:all"]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/roles/role-2/permissions",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ permissionIds: ["admin:all"] }),
        }),
      );

      await adapter.deleteRole("role-2");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/roles/role-2",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("should run audit, fetch discrepancies and resolve discrepancy", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ auditId: "aud-1", status: "COMPLETED" }),
          json: async () => ({ auditId: "aud-1", status: "COMPLETED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ id: "disc-1", sku: "SKU-X", difference: -2 }]),
          json: async () => [{ id: "disc-1", sku: "SKU-X", difference: -2 }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true }),
          json: async () => ({ success: true }),
        });
      global.fetch = mockFetch;

      const audit = await adapter.runAudit("tenant-audit");
      expect(audit.auditId).toBe("aud-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/audit/run",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-audit" }),
        }),
      );

      const discrepancies = await adapter.getDiscrepancies("tenant-audit");
      expect(discrepancies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/audit/discrepancies?tenantId=tenant-audit",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.resolveDiscrepancy("tenant-audit", "disc-1", "Adjusted count via cycle count");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/audit/discrepancies/disc-1/resolve",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-audit", notes: "Adjusted count via cycle count" }),
        }),
      );
    });

    it("should retrieve compliance ledger entries", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{ id: "comp-1", action: "TRANSFER", timestamp: "2026-01-01" }]),
        json: async () => [{ id: "comp-1", action: "TRANSFER", timestamp: "2026-01-01" }],
      });
      global.fetch = mockFetch;

      const ledger = await adapter.getComplianceLedger("tenant-ledger");
      expect(ledger).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/compliance/ledger?tenantId=tenant-ledger",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("Analytics, Anomaly Detection & Reporting", () => {
    it("should analyze inventory anomalies with and without date boundaries", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ anomalyId: "anom-1", severity: "HIGH" }]),
          json: async () => [{ anomalyId: "anom-1", severity: "HIGH" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify([{ anomalyId: "anom-2", severity: "LOW" }]),
          json: async () => [{ anomalyId: "anom-2", severity: "LOW" }],
        });
      global.fetch = mockFetch;

      const allAnomalies = await adapter.analyzeInventoryAnomalies("tenant-anom");
      expect(allAnomalies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/anomaly-detection/analyze?tenantId=tenant-anom",
        expect.objectContaining({ method: "GET" }),
      );

      const filteredAnomalies = await adapter.analyzeInventoryAnomalies(
        "tenant-anom",
        "2026-01-01T00:00:00Z",
        "2026-01-31T23:59:59Z",
      );
      expect(filteredAnomalies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/anomaly-detection/analyze?tenantId=tenant-anom&startDate=2026-01-01T00%3A00%3A00Z&endDate=2026-01-31T23%3A59%3A59Z",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should fetch inventory rebalance matrix", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nodes: ["node-A", "node-B"], rebalanceSuggestions: [] }),
      });
      global.fetch = mockFetch;

      const matrix = await adapter.getRebalanceMatrix("tenant-reb");
      expect(matrix.nodes).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/rebalance/matrix?tenantId=tenant-reb",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should handle report definitions, scheduling, and execution", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "rep-1", name: "Daily Valuation" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "rep-2", name: "Weekly Shrinkage" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ scheduled: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ reportUrl: "https://reports/1.pdf" }),
        });
      global.fetch = mockFetch;

      const definitions = await adapter.getReportDefinitions("tenant-rep");
      expect(definitions).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reports?tenantId=tenant-rep",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.createReportDefinition("tenant-rep", { name: "Weekly Shrinkage", query: {} });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reports",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Weekly Shrinkage", query: {}, tenantId: "tenant-rep" }),
        }),
      );

      await adapter.scheduleReport("tenant-rep", "rep-1", "0 0 * * *", "EMAIL");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reports/rep-1/schedule",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-rep", cronExpression: "0 0 * * *", deliveryMethod: "EMAIL" }),
        }),
      );

      const executed = await adapter.executeReport("tenant-rep", "rep-1", "PDF");
      expect(executed.reportUrl).toBe("https://reports/1.pdf");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/reports/rep-1/execute",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tenantId: "tenant-rep", format: "PDF" }),
        }),
      );
    });

    it("should get and save dashboard widgets", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "wid-1", type: "CHART" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "wid-2", type: "GAUGE" }),
        });
      global.fetch = mockFetch;

      const widgets = await adapter.getDashboardWidgets("tenant-wid");
      expect(widgets).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/widgets?tenantId=tenant-wid",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.saveDashboardWidget("tenant-wid", { id: "wid-2", type: "GAUGE" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/widgets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ id: "wid-2", type: "GAUGE", tenantId: "tenant-wid" }),
        }),
      );
    });
  });

  describe("Operational Depth: Cycle Counts, ASNs, Notifications & Aging", () => {
    it("should start cycle count with required and optional parameters", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "cc-1", status: "STARTED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "cc-2", status: "STARTED" }),
        });
      global.fetch = mockFetch;

      await adapter.startCycleCount("tenant-cc", "Count A", false);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/cycle-count/start",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-cc",
            name: "Count A",
            isBlindCount: false,
            abcClass: undefined,
            zone: undefined,
          }),
        }),
      );

      await adapter.startCycleCount("tenant-cc", "Count B", true, "CLASS_A", "ZONE_1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/cycle-count/start",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-cc",
            name: "Count B",
            isBlindCount: true,
            abcClass: "CLASS_A",
            zone: "ZONE_1",
          }),
        }),
      );
    });

    it("should submit cycle count lines and fetch cycle counts", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "cc-1", status: "SUBMITTED" }],
        });
      global.fetch = mockFetch;

      await adapter.submitCycleCount("cc-1", [{ sku: "SKU-1", countedQuantity: 42 }]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/cycle-count/cc-1/submit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ countedLines: [{ sku: "SKU-1", countedQuantity: 42 }] }),
        }),
      );

      const counts = await adapter.getCycleCounts("tenant-cc");
      expect(counts).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/cycle-count?tenantId=tenant-cc",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should submit ASN and get ASNs for supplier", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "asn-1", status: "EXPECTED" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "asn-1", status: "EXPECTED" }],
        });
      global.fetch = mockFetch;

      const lines = [{ sku: "SKU-1", quantity: 100 }];
      await adapter.submitASN("tenant-asn", "po-1", "sup-1", "2026-06-01", lines);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/supplier/asn",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            tenantId: "tenant-asn",
            poId: "po-1",
            supplierId: "sup-1",
            expectedArrivalDate: "2026-06-01",
            lines,
          }),
        }),
      );

      const asns = await adapter.getASNs("tenant-asn", "sup-1");
      expect(asns).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/supplier/asn?tenantId=tenant-asn&supplierId=sup-1",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should get notifications, mark read, and generate aging report", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: "notif-1", message: "Low stock alert", read: false }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ buckets: [{ range: "0-30", valueCents: 10000 }] }),
        });
      global.fetch = mockFetch;

      const notifs = await adapter.getNotifications("tenant-notif", "user-1");
      expect(notifs).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/notifications?tenantId=tenant-notif&userId=user-1",
        expect.objectContaining({ method: "GET" }),
      );

      await adapter.markNotificationRead("notif-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/notifications/notif-1/read",
        expect.objectContaining({ method: "POST" }),
      );

      const agingReport = await adapter.generateAgingReport("tenant-aging");
      expect(agingReport.buckets).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/aging/report?tenantId=tenant-aging",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should get API usage metrics", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [{ endpoint: "/api/products", count: 120, errorCount: 0 }],
      });
      global.fetch = mockFetch;

      const metrics = await adapter.getApiUsageMetrics("tenant-usage");
      expect(metrics).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/usage?tenantId=tenant-usage",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  describe("Serial Tracking & Error Handling", () => {
    it("should trace serial history", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ serialNumber: "SN-9999", history: [{ event: "MANUFACTURED", timestamp: "2026-01-01" }] }),
        json: async () => ({ serialNumber: "SN-9999", history: [{ event: "MANUFACTURED", timestamp: "2026-01-01" }] }),
      });
      global.fetch = mockFetch;

      const serialData = await adapter.traceSerialHistory("SN-9999");
      expect(serialData.serialNumber).toBe("SN-9999");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/serials/trace/SN-9999",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should throw formatted error when request fails with JSON payload", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => JSON.stringify({ error: "Validation failed for SKU" }),
      });
      global.fetch = mockFetch;

      await expect(adapter.getApiUsageMetrics("tenant-err")).rejects.toThrow("Validation failed for SKU");
    });

    it("should throw raw text error when request fails with non-JSON payload", async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 502,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "Bad Gateway: upstream down",
      });
      global.fetch = mockFetch;

      await expect(adapter.getApiUsageMetrics("tenant-err")).rejects.toThrow("Bad Gateway: upstream down");
    });
  });
});
