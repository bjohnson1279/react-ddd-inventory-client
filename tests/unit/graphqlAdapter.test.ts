import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLAdapter } from "../../src/api/graphql";

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

describe("GraphQLAdapter Comprehensive Test Suite", () => {
  let adapter: GraphQLAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    adapter = new GraphQLAdapter();
  });

  describe("Authentication and Token Management", () => {
    it("should throw error when password is empty or undefined in login", async () => {
      await expect(
        adapter.login("tenant-1", "user-1", "admin", ""),
      ).rejects.toThrow(
        "Authentication failed: Missing required password parameter.",
      );
      await expect(
        adapter.login("tenant-1", "user-1", "admin", undefined),
      ).rejects.toThrow(
        "Authentication failed: Missing required password parameter.",
      );
    });

    it("should send Authorization header when auth_token is present in localStorage", async () => {
      localStorage.setItem("auth_token", "secret-bearer-token");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { inventoryItems: [] },
        }),
      });
      global.fetch = mockFetch;

      await adapter.getInventoryItems();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer secret-bearer-token",
          }),
        }),
      );
    });

    it("should omit Authorization header when auth_token is 'NONE' or empty", async () => {
      localStorage.setItem("auth_token", "NONE");
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { inventoryItems: [] },
        }),
      });
      global.fetch = mockFetch;

      await adapter.getInventoryItems();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("Inventory & Catalog Management", () => {
    it("should handle null or undefined inventoryItems in query response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { inventoryItems: null },
        }),
      });
      global.fetch = mockFetch;

      const items = await adapter.getInventoryItems();
      expect(items).toEqual([]);
    });

    it("should fetch products and chunk variant barcode queries properly", async () => {
      const mockVariants = Array.from({ length: 30 }, (_, i) => ({
        id: `v-${i}`,
        sku: `SKU-${i}`,
        trackingMode: "quantity",
        attributes: [{ name: "Color", value: "Blue" }],
      }));

      const mockFetch = vi
        .fn()
        // 1. First call: get products
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              products: [
                {
                  id: "prod-big",
                  name: "Big Product",
                  variants: mockVariants,
                },
              ],
            },
          }),
        })
        // 2. Second call: first chunk (first 25 variants)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              bc_0: {
                assignments: [
                  {
                    id: "b-0",
                    sku: "SKU-0",
                    barcode: { value: "BAR-0", symbology: "EAN-13" },
                    source: "internal",
                    isPrimary: true,
                    assignedAt: "2026-01-01",
                  },
                ],
              },
            },
          }),
        })
        // 3. Third call: second chunk (remaining 5 variants)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              bc_0: {
                assignments: [
                  {
                    id: "b-25",
                    sku: "SKU-25",
                    barcode: { value: "BAR-25", symbology: "CODE128" },
                    source: "internal",
                    isPrimary: true,
                    assignedAt: "2026-01-01",
                  },
                ],
              },
            },
          }),
        });
      global.fetch = mockFetch;

      const prods = await adapter.getProducts();
      expect(prods).toHaveLength(1);
      expect(prods[0].variants).toHaveLength(30);
      expect(prods[0].variants[0].barcodes).toHaveLength(1);
      expect(prods[0].variants[0].barcodes[0].id).toBe("b-0");
      expect(prods[0].variants[25].barcodes).toHaveLength(1);
      expect(prods[0].variants[25].barcodes[0].id).toBe("b-25");
      expect(prods[0].variants[1].barcodes).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle empty products list in getProducts", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { products: null },
        }),
      });
      global.fetch = mockFetch;

      const prods = await adapter.getProducts();
      expect(prods).toEqual([]);
    });

    it("should create product and add product variant while clearing cached variant names", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { createProduct: { id: "p-new" } } }),
      });
      global.fetch = mockFetch;

      await adapter.createProduct("p-new", "New Product");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: JSON.stringify({
            query:
              "mutation CreateProd($id: ID!, $name: String!) {\n      createProduct(id: $id, name: $name)\n    }",
            variables: { id: "p-new", name: "New Product" },
          }),
        }),
      );

      await adapter.addProductVariant("p-new", "SKU-NEW", "quantity", [
        { name: "Size", value: "XL" },
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: JSON.stringify({
            query:
              "mutation AddVar($productId: ID!, $sku: String!, $attributes: [AttributeInput!]!, $trackingMode: TrackingMode!) {\n      addProductVariant(productId: $productId, sku: $sku, attributes: $attributes, trackingMode: $trackingMode)\n    }",
            variables: {
              productId: "p-new",
              sku: "SKU-NEW",
              attributes: [{ name: "Size", value: "XL" }],
              trackingMode: "quantity",
            },
          }),
        }),
      );
    });
  });

  describe("Third-Party Integrations & Channel Connections", () => {
    it("should fetch Shopify connections and handle empty list", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { shopifyConnections: null },
        }),
      });
      global.fetch = mockFetch;

      const res = await adapter.getShopifyConnections("tenant-1");
      expect(res).toEqual([]);
    });

    it("should fetch Amazon and WooCommerce connections via getConnections", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            amazonConnections: [{ id: "amz-1", sellerId: "seller-1" }],
            wooCommerceConnections: [
              { id: "woo-1", storeUrl: "https://woo.local" },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const res = await adapter.getConnections("tenant-1");
      expect(res.amazonConnections).toHaveLength(1);
      expect(res.wooCommerceConnections).toHaveLength(1);
    });

    it("should connect Shopify store with proper mutation arguments", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { connectShopifyStore: { id: "shop-1" } },
        }),
      });
      global.fetch = mockFetch;

      await adapter.connectShopify(
        "tenant-1",
        "test.myshopify.com",
        "shpat_123",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: expect.stringContaining("test.myshopify.com"),
        }),
      );
    });

    it("should connect Amazon store with seller credentials", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { connectAmazonStore: { id: "amz-1" } },
        }),
      });
      global.fetch = mockFetch;

      await adapter.connectAmazon("tenant-1", "seller-99", "mws-token", "mk-1");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: expect.stringContaining("seller-99"),
        }),
      );
    });

    it("should connect WooCommerce store with consumer keys", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { connectWooCommerceStore: { id: "woo-1" } },
        }),
      });
      global.fetch = mockFetch;

      await adapter.connectWooCommerce(
        "tenant-1",
        "https://woo.test",
        "ck_123",
        "cs_456",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: expect.stringContaining("https://woo.test"),
        }),
      );
    });
  });

  describe("General Ledger & Stock Onboarding", () => {
    it("should retrieve journal entries and fallback when null", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { journalEntries: null },
        }),
      });
      global.fetch = mockFetch;

      const entries = await adapter.getJournalEntries("tenant-1");
      expect(entries).toEqual([]);
    });

    it("should create journal entry with formatted uppercase type lines", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { createJournalEntry: true },
        }),
      });
      global.fetch = mockFetch;

      await adapter.createJournalEntry(
        "tenant-1",
        "Opening inventory",
        "accrual",
        [
          {
            accountCode: "1000",
            amountCents: 5000,
            type: "debit",
            memo: "Debit cash",
          },
          {
            accountCode: "2000",
            amountCents: 5000,
            type: "credit",
            memo: "Credit equity",
          },
        ],
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          body: expect.stringContaining('"type":"DEBIT"'),
        }),
      );
    });

    it("should retrieve stock onboardings and fallback to empty array", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { stockOnboardings: null },
        }),
      });
      global.fetch = mockFetch;

      const onboardings = await adapter.getStockOnboardings("tenant-1");
      expect(onboardings).toEqual([]);
    });

    it("should create and submit stock onboarding", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { createStockOnboarding: { id: "onb-123" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { submitStockOnboarding: true },
          }),
        });
      global.fetch = mockFetch;

      await adapter.createStockOnboarding("tenant-1", "loc-1", "2026-01-01", [
        { variantId: "var-1", quantity: 10, unitCostCents: 500 },
      ]);
      await adapter.submitStockOnboarding("onb-123");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Barcodes & Serial Tracking", () => {
    it("should assign and generate internal barcodes", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { assignBarcode: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { generateInternalBarcode: "INT-BARCODE-99" },
          }),
        });
      global.fetch = mockFetch;

      await adapter.assignBarcode(
        "SKU-1",
        "12345678",
        "EAN-13",
        "internal",
        true,
      );
      const barcode = await adapter.generateInternalBarcode(
        "SKU-1",
        "tenant-1",
      );

      expect(barcode).toBe("INT-BARCODE-99");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should scan barcode and trace serial number history", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              scanBarcode: {
                status: "success",
                matchedSku: "SKU-MATCH",
                quantityChange: 1,
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              traceSerialHistory: {
                id: "s-1",
                serialNumber: "SN-100",
                status: "active",
                history: [],
              },
            },
          }),
        });
      global.fetch = mockFetch;

      const scanResult = await adapter.scanBarcode(
        "12345678",
        "inventory",
        1,
        10,
        "tenant-1",
        "loc-1",
        "actor-1",
      );
      expect(scanResult.scanBarcode.matchedSku).toBe("SKU-MATCH");

      const serialData = await adapter.traceSerialHistory("SN-100");
      expect(serialData.serialNumber).toBe("SN-100");
    });
  });

  describe("Demand Planning & Order Routing", () => {
    it("should map demand planning report data correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            demandPlanningReport: [
              {
                sku: "SKU-DEMAND",
                currentStock: 50,
                averageDailySales7d: 2,
                averageDailySales30d: 2.5,
                averageDailySales90d: 3,
                forecastedDemand30d: 75,
                reorderPoint: 40,
                safetyStock: 15,
              },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const report = await adapter.getForecastingReport("loc-central");
      expect(report).toHaveLength(1);
      expect(report[0].sku).toBe("SKU-DEMAND");
      expect(report[0].name).toBe("SKU: SKU-DEMAND");
      expect(report[0].currentStock).toBe(50);
      expect(report[0].forecastedDemand).toBe(75);
    });

    it("should handle null report from demandPlanningReport", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { demandPlanningReport: null },
        }),
      });
      global.fetch = mockFetch;

      const report = await adapter.getForecastingReport("loc-central");
      expect(report).toEqual([]);
    });

    it("should execute order routing query", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            routeOrder: {
              allocations: [{ locationId: "WH-1", quantity: 5 }],
              totalCost: 1500,
              totalDistance: 120,
              splitCount: 1,
            },
          },
        }),
      });
      global.fetch = mockFetch;

      const plan = await adapter.routeOrder(
        "SKU-ROUTE",
        5,
        "123 Main St",
        "least-cost",
      );
      expect(plan.totalCost).toBe(1500);
      expect(plan.allocations).toHaveLength(1);
    });
  });

  describe("Reorder Policies and LocalStorage fallbacks", () => {
    it("should read, save, and update reorder policies in localStorage", async () => {
      const empty = await adapter.getReorderPolicies("tenant-1");
      expect(empty).toEqual([]);

      await adapter.saveReorderPolicy("tenant-1", {
        sku: "SKU-A",
        locationId: "LOC-1",
        reorderPoint: 10,
        reorderQuantity: 20,
      });

      let policies = await adapter.getReorderPolicies("tenant-1");
      expect(policies).toHaveLength(1);
      expect(policies[0].reorderPoint).toBe(10);

      // Update existing
      await adapter.saveReorderPolicy("tenant-1", {
        sku: "SKU-A",
        locationId: "LOC-1",
        reorderPoint: 15,
        reorderQuantity: 30,
      });

      policies = await adapter.getReorderPolicies("tenant-1");
      expect(policies).toHaveLength(1);
      expect(policies[0].reorderPoint).toBe(15);

      await expect(
        adapter.evaluateReorderPolicies("tenant-1"),
      ).resolves.toBeUndefined();
    });
  });

  describe("Webhooks & Warehouse Locations", () => {
    it("should get webhooks, delete webhook, and read webhook delivery logs", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              webhookSubscriptions: [
                {
                  id: "sub-1",
                  targetUrl: "https://hook.local",
                  eventTypes: ["stock.updated"],
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { deleteWebhookSubscription: true },
          }),
        });
      global.fetch = mockFetch;

      const hooks = await adapter.getWebhooks("tenant-1");
      expect(hooks).toHaveLength(1);
      expect(hooks[0].url).toBe("https://hook.local");

      await adapter.deleteWebhook("tenant-1", "sub-1");

      localStorage.setItem(
        "gql_webhook_deliveries_tenant-1",
        JSON.stringify([{ id: "del-1", eventName: "stock.updated" }]),
      );
      const deliveries = await adapter.getWebhookDeliveries("tenant-1");
      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].id).toBe("del-1");
    });

    it("should manage warehouse locations in localStorage", async () => {
      const defaultLocations =
        await adapter.getWarehouseLocations("tenant-new");
      expect(defaultLocations).toHaveLength(2);

      await adapter.saveWarehouseLocation("tenant-new", {
        id: "LOC-CUSTOM",
        warehouseId: "WH-CUSTOM",
        zone: "C",
        maxWeightGrams: 20000,
        maxVolumeCubicMeters: 5,
      });

      let locs = await adapter.getWarehouseLocations("tenant-new");
      expect(locs).toHaveLength(3);

      // Update existing
      await adapter.saveWarehouseLocation("tenant-new", {
        id: "LOC-CUSTOM",
        warehouseId: "WH-CUSTOM",
        zone: "C-UPDATED",
        maxWeightGrams: 25000,
        maxVolumeCubicMeters: 6,
      });
      locs = await adapter.getWarehouseLocations("tenant-new");
      expect(locs.find((l) => l.id === "LOC-CUSTOM")?.zone).toBe("C-UPDATED");

      // Delete location
      await adapter.deleteWarehouseLocation("tenant-new", "LOC-CUSTOM");
      locs = await adapter.getWarehouseLocations("tenant-new");
      expect(locs.find((l) => l.id === "LOC-CUSTOM")).toBeUndefined();
    });

    it("should return putaway suggestions and optimized pick route", async () => {
      const putaway = await adapter.getPutawaySuggestions(
        "tenant-1",
        "SKU-PUT",
        12,
      );
      expect(putaway).toEqual([
        { locationId: "LOC-CENTRAL", sku: "SKU-PUT", suggestedQuantity: 12 },
      ]);

      const route = await adapter.getOptimizedPickRoute("tenant-1", [
        "SKU-Z",
        "SKU-A",
        "SKU-M",
      ]);
      expect(route).toEqual(["SKU-A", "SKU-M", "SKU-Z"]);
    });
  });

  describe("Procurement (Purchase Orders)", () => {
    it("should return empty purchase orders list when query fails or throws", async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("PO Service Error"));
      global.fetch = mockFetch;

      const pos = await adapter.getPurchaseOrders("tenant-1");
      expect(pos).toEqual([]);
    });

    it("should create, approve, send, and receive purchase order", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              purchaseOrders: [
                {
                  id: "po-1",
                  status: "APPROVED",
                  createdAt: "2026-01-01",
                  items: [{ sku: "SKU-PO", quantity: 10, unitCostCents: 100 }],
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { createPurchaseOrder: { id: "po-2" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { placePurchaseOrder: { id: "po-2" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { receivePurchaseOrder: { id: "po-2" } },
          }),
        });
      global.fetch = mockFetch;

      const pos = await adapter.getPurchaseOrders("tenant-1");
      expect(pos).toHaveLength(1);
      expect(pos[0].status).toBe("approved");

      await adapter.createPurchaseOrder("tenant-1", "Acme Supplies", [
        { sku: "SKU-PO", quantity: 5, unitCostCents: 200 },
      ]);
      await adapter.approvePurchaseOrder("tenant-1", "po-2");
      await adapter.sendPurchaseOrder("tenant-1", "po-2");
      await adapter.receivePurchaseOrder("tenant-1", "po-2", [
        { sku: "SKU-PO", quantity: 5 },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("should get FEFO pick suggestions and trace recall", async () => {
      const fefo = await adapter.getFefoPickSuggestions(
        "tenant-1",
        "SKU-FEFO",
        8,
      );
      expect(fefo).toHaveLength(1);
      expect(fefo[0].sku).toBe("SKU-FEFO");
      expect(fefo[0].quantity).toBe(8);

      const recall = await adapter.traceRecall("tenant-1", "LOT-999");
      expect(recall.lotNumber).toBe("LOT-999");
      expect(recall.affectedItems).toBe(5);
    });
  });

  describe("Admin RBAC, Users, and Audits", () => {
    it("should get users, invite user, and update user role", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              users: [{ id: "u-1", email: "admin@test.com", role: "ADMIN" }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { inviteUser: { userId: "u-2", temporaryPassword: "pwd" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { updateUserRole: true },
          }),
        });
      global.fetch = mockFetch;

      const users = await adapter.getUsers("tenant-1");
      expect(users).toHaveLength(1);

      const invited = await adapter.inviteUser(
        "tenant-1",
        "user@test.com",
        "MEMBER",
      );
      expect(invited.userId).toBe("u-2");

      await adapter.updateUserRole("tenant-1", "u-2", "LEAD");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should manage roles and permissions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { roles: [{ id: "r-1", name: "Auditor", permissions: [] }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              permissions: [{ id: "p-1", resource: "stock", action: "read" }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { createRole: { id: "r-2", name: "Manager" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { updateRolePermissions: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { deleteRole: true },
          }),
        });
      global.fetch = mockFetch;

      const roles = await adapter.getRoles("tenant-1");
      expect(roles).toHaveLength(1);

      const perms = await adapter.getPermissions();
      expect(perms).toHaveLength(1);

      const newRole = await adapter.createRole("tenant-1", "Manager", "Desc", [
        "p-1",
      ]);
      expect(newRole.id).toBe("r-2");

      await adapter.updateRolePermissions("r-2", ["p-1"]);
      await adapter.deleteRole("r-2");
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it("should run audit, get discrepancies, and resolve discrepancy", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              runAudit: { shopifyDiscrepancies: 0, accountingDiscrepancies: 0 },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              auditDiscrepancies: [
                {
                  id: "disc-1",
                  sku: "SKU-D",
                  locationId: "LOC-1",
                  expectedQuantity: 10,
                  actualQuantity: 8,
                  discrepancyCount: -2,
                  status: "PENDING",
                  detectedAt: "2026-01-01",
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { resolveAuditDiscrepancy: true },
          }),
        });
      global.fetch = mockFetch;

      const audit = await adapter.runAudit("tenant-1");
      expect(audit.shopifyDiscrepancies).toBe(0);

      const discrepancies = await adapter.getDiscrepancies("tenant-1");
      expect(discrepancies).toHaveLength(1);

      await adapter.resolveDiscrepancy("tenant-1", "disc-1", "Adjusted count");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should retrieve outbox stats, dead letter events, and retry event", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              outboxStats: {
                pending: 5,
                processing: 0,
                processed: 100,
                failed: 2,
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              deadLetterEvents: [
                {
                  id: "dlq-1",
                  eventType: "OrderCreated",
                  payload: "{}",
                  error: "Timeout",
                  occurredAt: "2026-01-01",
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { retryOutboxEvent: true },
          }),
        });
      global.fetch = mockFetch;

      const stats = await adapter.getOutboxStats();
      expect(stats.pendingCount).toBe(5);
      expect(stats.publishedCount).toBe(100);
      expect(stats.failedCount).toBe(2);

      const dlq = await adapter.getDeadLetterEvents(50);
      expect(dlq).toHaveLength(1);
      expect(dlq[0].id).toBe("dlq-1");

      await adapter.retryOutboxEvent("dlq-1");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Operations, Kits, Quarantine, and Valuation", () => {
    it("should manage tenant accounting config and mark notification read", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              tenantAccountingConfig: {
                tenantId: "tenant-1",
                accountingMethod: "ACCRUAL",
                costingMethod: "FIFO",
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { saveTenantAccountingConfig: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { markNotificationRead: true },
          }),
        });
      global.fetch = mockFetch;

      const cfg = await adapter.getTenantConfig("tenant-1");
      expect(cfg.accountingMethod).toBe("ACCRUAL");

      await adapter.saveTenantConfig("tenant-1", {
        accountingMethod: "cash",
        costingMethod: "lifo",
      });
      await adapter.markNotificationRead("notif-1");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should assemble and disassemble kits", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { assembleKit: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { disassembleKit: true },
          }),
        });
      global.fetch = mockFetch;

      await adapter.assembleKit(
        "tenant-1",
        "loc-1",
        "KIT-1",
        5,
        "actor-1",
        "ref-1",
      );
      await adapter.disassembleKit(
        "tenant-1",
        "loc-1",
        "KIT-1",
        5,
        "actor-1",
        "ref-1",
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should manage quarantined items and resolve quarantine", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              quarantineItems: [
                {
                  id: "q-1",
                  sku: "SKU-Q",
                  locationId: "LOC-1",
                  quantity: 3,
                  reason: "Broken seal",
                  status: "QUARANTINED",
                  createdAt: "2026-01-01",
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { resolveQuarantineItem: true },
          }),
        });
      global.fetch = mockFetch;

      const items = await adapter.getQuarantinedItems("tenant-1");
      expect(items).toHaveLength(1);
      expect(items[0].reason).toBe("Broken seal");

      await adapter.resolveQuarantine("tenant-1", "q-1", "SCRAPPED");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should get valuation report with mapped variant names", async () => {
      const mockFetch = vi
        .fn()
        // 1. Valuation report query
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              stockValuationReport: {
                method: "FIFO",
                lineItems: [
                  {
                    variantId: "v-1",
                    sku: "SKU-VAL",
                    quantityOnHand: 20,
                    unitCostCents: 1500,
                    totalValueCents: 30000,
                  },
                ],
              },
            },
          }),
        })
        // 2. Product variant names for name lookup
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              products: [
                {
                  name: "Valued Product",
                  variants: [
                    {
                      id: "v-1",
                      sku: "SKU-VAL",
                      attributes: [{ name: "Size", value: "Medium" }],
                    },
                  ],
                },
              ],
            },
          }),
        });
      global.fetch = mockFetch;

      const report = await adapter.getValuationReport(
        "tenant-1",
        "LOC-1",
        "fifo",
      );
      expect(report).toHaveLength(1);
      expect(report[0].name).toBe("Valued Product (Medium)");
      expect(report[0].totalValueCents).toBe(30000);
      expect(report[0].costingMethod).toBe("FIFO");
    });
  });

  describe("Compliance, Audit Replay, and Cache", () => {
    it("should verify compliance ledger and return default compliance empty ledger", async () => {
      const ledger = await adapter.getComplianceLedger("tenant-1");
      expect(ledger).toEqual([]);

      const verification = await adapter.verifyComplianceLedger("tenant-1");
      expect(verification.isValid).toBe(true);
    });

    it("should reconstruct state and replay audit", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              reconstructState: {
                timestamp: "2026-01-01",
                tenantId: "tenant-1",
                eventsReplayedCount: 15,
                lastSequenceNumber: 15,
                stockLevels: [],
                binConfigurations: [],
                accountBalances: [],
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              replayAudit: [
                {
                  sequenceNumber: 1,
                  eventType: "StockAdded",
                  timestamp: "2026-01-01",
                  hash: "abc",
                  previousHash: "root",
                  payload: "{}",
                },
              ],
            },
          }),
        });
      global.fetch = mockFetch;

      const state = await adapter.reconstructState("tenant-1", "2026-01-01");
      expect(state.eventsReplayedCount).toBe(15);

      const audit = await adapter.replayAudit("tenant-1", "2026-01-01");
      expect(audit).toHaveLength(1);
    });

    it("should get cache stats and clear cache", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              cacheStats: {
                hits: 80,
                misses: 20,
                hitRatio: 0.8,
                invalidations: 5,
                activeKeysCount: 100,
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { clearCache: true },
          }),
        });
      global.fetch = mockFetch;

      const stats = await adapter.getCacheStats();
      expect(stats.hitRatio).toBe(0.8);

      const res = await adapter.clearCache("tenant-1");
      expect(res.success).toBe(true);
      expect(res.clearedKeysCount).toBe(42);
    });
  });

  describe("Operational Dashboards, Cycle Counts, and ASNs", () => {
    it("should analyze inventory anomalies and get rebalance matrix", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              analyzeInventoryAnomalies: {
                alerts: [],
                totalCritical: 0,
                totalHigh: 1,
                totalMedium: 2,
                totalLow: 0,
                overallRiskScore: 35,
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              rebalanceMatrix: {
                recommendations: [],
                matrix: {},
                summary: "All warehouses balanced",
              },
            },
          }),
        });
      global.fetch = mockFetch;

      const anomalies = await adapter.analyzeInventoryAnomalies("tenant-1");
      expect(anomalies.totalHigh).toBe(1);

      const matrix = await adapter.getRebalanceMatrix("tenant-1");
      expect(matrix.summary).toBe("All warehouses balanced");
    });

    it("should manage approval workflows, pending requests, and decisions", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              approvalWorkflows: [
                {
                  id: "wf-1",
                  tenantId: "tenant-1",
                  name: "PO Over $10k",
                  isActive: true,
                },
              ],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { toggleApprovalWorkflow: { id: "wf-1", isActive: false } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              pendingApprovalRequests: [{ id: "req-1", referenceType: "PO" }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              submitApprovalDecision: {
                status: "APPROVED",
                referenceType: "PO",
                referenceId: "po-1",
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              approvalRequest: {
                decisions: [
                  {
                    decision: "APPROVED",
                    actorId: "actor-1",
                    notes: "Approved",
                    decidedAt: "2026-01-01",
                  },
                ],
              },
            },
          }),
        });
      global.fetch = mockFetch;

      const workflows = await adapter.getApprovalWorkflows();
      expect(workflows).toHaveLength(1);

      const toggled = await adapter.toggleApprovalWorkflow("wf-1");
      expect(toggled.isActive).toBe(false);

      const pending = await adapter.getPendingApprovals();
      expect(pending).toHaveLength(1);

      const decision = await adapter.submitApprovalDecision(
        "req-1",
        "APPROVED",
        "Approved",
      );
      expect(decision.status).toBe("APPROVED");

      const history = await adapter.getApprovalHistory("req-1");
      expect(history).toHaveLength(1);
    });

    it("should handle custom report definitions and dashboard widgets", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              reportDefinitions: [{ id: "rep-1", name: "Monthly Stock" }],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { createReportDefinition: { id: "rep-2" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { scheduleReport: { id: "sched-1" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { executeReport: { id: "exec-1" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { dashboardWidgets: [{ id: "w-1", type: "CHART" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { saveDashboardWidget: { id: "w-2" } },
          }),
        });
      global.fetch = mockFetch;

      const reports = await adapter.getReportDefinitions("tenant-1");
      expect(reports).toHaveLength(1);

      const createdRep = await adapter.createReportDefinition("tenant-1", {
        name: "Weekly",
        type: "INVENTORY",
        filters: {},
        grouping: {},
      });
      expect(createdRep.id).toBe("rep-2");

      const sched = await adapter.scheduleReport(
        "tenant-1",
        "rep-2",
        "0 0 * * *",
        "EMAIL",
      );
      expect(sched.id).toBe("sched-1");

      const exec = await adapter.executeReport("tenant-1", "rep-2", "CSV");
      expect(exec.id).toBe("exec-1");

      const widgets = await adapter.getDashboardWidgets("tenant-1");
      expect(widgets).toHaveLength(1);

      const savedWidget = await adapter.saveDashboardWidget("tenant-1", {
        type: "KPI",
        config: {},
        layoutX: 0,
        layoutY: 0,
        width: 2,
        height: 2,
      });
      expect(savedWidget.id).toBe("w-2");
    });

    it("should start cycle count, submit counts, and list cycle counts", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { startCycleCount: { id: "cc-1", status: "IN_PROGRESS" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { submitCycleCount: true },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { getCycleCounts: [{ id: "cc-1", name: "Zone A Count" }] },
          }),
        });
      global.fetch = mockFetch;

      const count = await adapter.startCycleCount(
        "tenant-1",
        "Zone A Count",
        true,
        "A",
        "Zone-1",
      );
      expect(count.id).toBe("cc-1");

      await adapter.submitCycleCount("cc-1", [{ sku: "SKU-A", counted: 10 }]);
      const allCounts = await adapter.getCycleCounts("tenant-1");
      expect(allCounts).toHaveLength(1);
    });

    it("should submit ASN, get ASNs, and get user notifications", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { submitASN: { id: "asn-1", status: "SUBMITTED" } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { getSupplierASNs: [{ id: "asn-1", poId: "po-10" }] },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              getNotifications: [{ id: "notif-1", message: "Low stock alert" }],
            },
          }),
        });
      global.fetch = mockFetch;

      const asn = await adapter.submitASN(
        "tenant-1",
        "po-10",
        "sup-1",
        "2026-02-01",
        [],
      );
      expect(asn.id).toBe("asn-1");

      const asns = await adapter.getASNs("tenant-1", "sup-1");
      expect(asns).toHaveLength(1);

      const notifs = await adapter.getNotifications("tenant-1", "user-1");
      expect(notifs).toHaveLength(1);
      expect(notifs[0].message).toBe("Low stock alert");
    });
  });
});
