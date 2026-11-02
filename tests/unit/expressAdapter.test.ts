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
});
