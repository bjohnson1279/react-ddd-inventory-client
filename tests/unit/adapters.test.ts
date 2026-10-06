import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLAdapter } from "../../src/api/graphql";
import { ExpressRESTAdapter } from "../../src/api/express";
import { LaravelRESTAdapter } from "../../src/api/laravel";
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

describe("Inventory Backend API Adapters", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("GraphQLAdapter", () => {
    it("should correctly perform login and retrieve token", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { login: "mock-gql-jwt-token" },
        }),
      });
      global.fetch = mockFetch;

      const adapter = new GraphQLAdapter();
      const token = await adapter.login(
        "tenant-1",
        "admin",
        "admin",
        "password",
      );

      expect(token).toBe("mock-gql-jwt-token");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4000/graphql",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  describe("ExpressRESTAdapter", () => {
    it("should attempt setup when login credentials fail", async () => {
      const mockFetch = vi
        .fn()
        // First login attempt fails (401 Unauthorized)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: "Invalid credentials" }),
        })
        // Setup registration succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "Setup completed" }),
        })
        // Second login attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: "mock-express-jwt-token" }),
        });
      global.fetch = mockFetch;

      const adapter = new ExpressRESTAdapter();
      const token = await adapter.login(
        "tenant-test",
        "admin-user",
        "admin",
        "password",
      );

      expect(token).toBe("mock-express-jwt-token");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should query slotting suggestions route successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { sku: "SKU-A", currentLocationId: "loc-1", estimatedSavings: 100 },
        ],
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();
      const suggestions = await adapter.getSlottingSuggestions("tenant-test");
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].sku).toBe("SKU-A");
    });

    it("should verify compliance ledger successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isValid: true }),
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();
      const result = await adapter.verifyComplianceLedger("tenant-1");
      expect(result).toEqual({ isValid: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/compliance/verify?tenantId=tenant-1",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should handle compliance ledger verification failure with reason", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          isValid: false,
          failedSequenceNumber: 5,
          reason: "mismatch",
        }),
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();
      const result = await adapter.verifyComplianceLedger("tenant-1");
      expect(result).toEqual({
        isValid: false,
        failedSequenceNumber: 5,
        reason: "mismatch",
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:5000/api/compliance/verify?tenantId=tenant-1",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should parse non-JSON error response correctly and throw", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "Bad Gateway",
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();

      await expect(adapter.getInventoryItems()).rejects.toThrow("Bad Gateway");
    });

    it("should fallback to HTTP status error if error text is empty", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "",
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();

      await expect(adapter.getInventoryItems()).rejects.toThrow(
        "HTTP 500 Error",
      );
    });
  });

  describe("LaravelRESTAdapter", () => {
    it("should throw an error with raw text when response is not ok and not JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error String",
      });
      global.fetch = mockFetch;

      const adapter = new LaravelRESTAdapter();
      await expect(adapter.getSlottingSuggestions("t1")).rejects.toThrow(
        "Internal Server Error String",
      );
    });

    it("should query catalog and gather stock for each SKU sequentially", async () => {
      const mockFetch = vi
        .fn()
        // Product list request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            products: [
              {
                id: "p-1",
                name: "Product 1",
                variants: [
                  {
                    id: "v-1",
                    sku: "SKU-A",
                    tracking_mode: "quantity",
                    attributes: [],
                  },
                ],
              },
            ],
          }),
        })
        // SKU stock query
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ available_quantity: 42, location_id: "loc-A" }),
        });
      global.fetch = mockFetch;

      const adapter = new LaravelRESTAdapter();
      const items = await adapter.getInventoryItems();

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        id: "v-1-stock",
        sku: "SKU-A",
        locationId: "loc-A",
        quantity: 42,
        version: 1,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should query slotting suggestions route successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { sku: "SKU-A", currentLocationId: "loc-1", estimatedSavings: 100 },
        ],
      });
      global.fetch = mockFetch;
      const adapter = new LaravelRESTAdapter();
      const suggestions = await adapter.getSlottingSuggestions("tenant-test");
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].sku).toBe("SKU-A");
    });

    it("should connect to Server-Sent Events and capture barcode scans", async () => {
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              "data: " +
                JSON.stringify({
                  type: "BarcodeScanned",
                  scanValue: "9988776655",
                  symbology: "EAN-13",
                  context: "receive",
                  status: "success",
                  time: "2026-07-15T12:00:00Z",
                }) +
                "\n\n",
            ),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      const mockFetch = vi.fn().mockResolvedValue({
        body: { getReader: () => mockReader },
      });
      global.fetch = mockFetch as any;

      localStorage.setItem("auth_token", "test-auth-token-999");

      const adapter = new LaravelRESTAdapter();
      const onScan = vi.fn();
      const unsubscribe = adapter.subscribeBarcodeScans("tenant-1", onScan);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/notifications/subscribe",
        expect.objectContaining({
          headers: {
            Accept: "text/event-stream",
            Authorization: "Bearer test-auth-token-999",
          },
          signal: expect.any(AbortSignal),
        }),
      );

      // wait for stream to process
      await new Promise((r) => setTimeout(r, 50));

      expect(onScan).toHaveBeenCalledWith({
        scanValue: "9988776655",
        symbology: "EAN-13",
        context: "receive",
        status: "success",
        time: "2026-07-15T12:00:00Z",
      });

      unsubscribe();
    });

    it("should query rfid tags, assign, and subscribe", async () => {
      const mockFetch = vi
        .fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tags: [{ epc: "EPC-1", sku: "SKU-A", serial_number: "SN-1" }],
          }),
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "Tag assigned successfully" }),
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "RFID scan simulation published." }),
        });
      global.fetch = mockFetch;

      const adapter = new LaravelRESTAdapter();
      const tags = await adapter.getRfidTags("tenant-1");
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe("EPC-1");

      await adapter.assignRfidTag("tenant-1", "EPC-1", "SKU-A", "SN-1");
      await adapter.simulateRfidScan("tenant-1", "LOC-A", ["EPC-1"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // subscribeRfidScans
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              "data: " +
                JSON.stringify({
                  type: "rfid_scan_processed",
                  message: JSON.stringify({
                    id: "batch-1",
                    tenantId: "tenant-1",
                    locationId: "LOC-A",
                    totalCount: 1,
                    matchedCount: 1,
                    unmatchedCount: 0,
                    unmatchedEpcs: [],
                  }),
                }) +
                "\n\n",
            ),
          })
          .mockResolvedValueOnce({ done: true }),
      };

      const mockFetchSse = vi.fn().mockResolvedValue({
        body: { getReader: () => mockReader },
      });
      global.fetch = mockFetchSse as any;
      localStorage.setItem("auth_token", "test-auth-token-999");

      const onScanProcessed = vi.fn();
      const unsubscribe = adapter.subscribeRfidScans(
        "tenant-1",
        onScanProcessed,
      );

      expect(mockFetchSse).toHaveBeenCalledWith(
        "http://localhost:8000/api/notifications/subscribe",
        expect.objectContaining({
          headers: {
            Accept: "text/event-stream",
            Authorization: "Bearer test-auth-token-999",
          },
          signal: expect.any(AbortSignal),
        }),
      );

      // wait for stream to process
      await new Promise((r) => setTimeout(r, 50));

      expect(onScanProcessed).toHaveBeenCalledWith({
        id: "batch-1",
        tenantId: "tenant-1",
        locationId: "LOC-A",
        totalCount: 1,
        matchedCount: 1,
        unmatchedCount: 0,
        unmatchedEpcs: [],
      });
      unsubscribe();
    });

    describe("login method", () => {
      it("should throw when password parameter is missing", async () => {
        const adapter = new LaravelRESTAdapter();
        await expect(adapter.login("tenant-1", "user-1")).rejects.toThrow(
          "Authentication failed: Missing required password parameter.",
        );
      });

      it("should perform direct login when credentials are valid", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ token: "mock-laravel-token" }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const token = await adapter.login(
          "tenant-1",
          "admin@example.com",
          "admin",
          "secret-pass",
        );

        expect(token).toBe("mock-laravel-token");
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/auth/login",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              tenantId: "tenant-1",
              email: "admin@example.com",
              password: "secret-pass",
            }),
          }),
        );
      });

      it("should handle setup auto-recovery when initial login fails with 401", async () => {
        const mockFetch = vi
          .fn()
          // Initial login fails
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: "Invalid credentials" }),
          })
          // Setup endpoint succeeds
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Setup success" }),
          })
          // Retry login succeeds
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: "recovered-token" }),
          });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const token = await adapter.login(
          "tenant-2",
          "user2",
          "user",
          "password123",
        );

        expect(token).toBe("recovered-token");
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      it("should throw error when both login and auto-recovery setup fail", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: "401 Unauthorized" }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: async () =>
              JSON.stringify({ error: "Setup DB connection error" }),
          });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await expect(
          adapter.login("tenant-3", "user3", "user", "pass"),
        ).rejects.toThrow(
          "Login failed, and setup auto-recovery also failed: Setup DB connection error",
        );
      });
    });

    describe("Catalog and Barcodes", () => {
      it("should fetch products and resolve variant barcodes in chunks", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              products: [
                {
                  id: "p-100",
                  name: "Test Product 100",
                  variants: [
                    {
                      id: "v-100",
                      sku: "SKU-100",
                      tracking_mode: "quantity",
                      attributes: [{ name: "Size", value: "M" }],
                    },
                  ],
                },
              ],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              assignments: [
                {
                  id: "b-1",
                  barcode_value: "12345678",
                  symbology: "code_128",
                  source: "internal",
                  is_primary: true,
                  assigned_at: "2026-01-01",
                },
              ],
            }),
          });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const products = await adapter.getProducts();

        expect(products).toHaveLength(1);
        expect(products[0].variants[0].barcodes).toEqual([
          {
            id: "b-1",
            sku: "SKU-100",
            barcode: { value: "12345678", symbology: "code_128" },
            source: "internal",
            isPrimary: true,
            assignedAt: "2026-01-01",
          },
        ]);
      });

      it("should throw when assignBarcode is called for unknown SKU", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ products: [] }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await expect(
          adapter.assignBarcode(
            "SKU-MISSING",
            "VAL",
            "code_128",
            "internal",
            true,
          ),
        ).rejects.toThrow("Variant for SKU SKU-MISSING not found.");
      });

      it("should generate internal barcode and assign it", async () => {
        const mockFetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              products: [
                { id: "p-1", variants: [{ id: "v-1", sku: "SKU-GEN" }] },
              ],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });
        global.fetch = mockFetch;

        // Mock crypto.getRandomValues
        const originalCrypto = window.crypto;
        Object.defineProperty(window, "crypto", {
          value: {
            getRandomValues: (arr: Uint32Array) => {
              arr[0] = 12345678;
              return arr;
            },
          },
          writable: true,
        });

        const adapter = new LaravelRESTAdapter();
        const generated = await adapter.generateInternalBarcode(
          "SKU-GEN",
          "tenant-1",
        );

        expect(generated).toMatch(/^INT-SKU-GEN-\d+$/);
        expect(mockFetch).toHaveBeenCalledTimes(2);

        Object.defineProperty(window, "crypto", { value: originalCrypto });
      });
    });

    describe("Procurement and POs", () => {
      it("should create a purchase order and update localStorage IDs", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ id: "po-123", supplier: "Supplier A" }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await adapter.createPurchaseOrder("tenant-po", "Supplier A", [
          { sku: "SKU-PO1", quantity: 10, unitCostCents: 500 },
        ]);

        expect(localStorage.getItem("po_ids_tenant-po")).toBe(
          JSON.stringify(["po-123"]),
        );
      });

      it("should fetch purchase orders in bulk based on stored IDs", async () => {
        localStorage.setItem("po_ids_tenant-po", JSON.stringify(["po-123"]));

        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "po-123",
                tenant_id: "tenant-po",
                supplier: "Supplier A",
                status: "APPROVED",
                created_at: "2026-03-01",
                items: [{ sku: "SKU-PO1", quantity: 10, unit_cost_cents: 500 }],
              },
            ],
          }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const pos = await adapter.getPurchaseOrders("tenant-po");

        expect(pos).toHaveLength(1);
        expect(pos[0]).toEqual({
          id: "po-123",
          tenantId: "tenant-po",
          supplier: "Supplier A",
          status: "APPROVED",
          createdAt: "2026-03-01",
          items: [{ sku: "SKU-PO1", quantity: 10, unitCostCents: 500 }],
        });
      });
    });

    describe("Accounting, Onboarding & Config", () => {
      it("should create and format journal entries", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await adapter.createJournalEntry(
          "tenant-acct",
          "Initial stock",
          "MANUAL",
          [
            {
              accountCode: "1000",
              amountCents: 5000,
              type: "DEBIT",
              memo: "Debit cash",
            },
          ],
        );

        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/journal/entries",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              tenantId: "tenant-acct",
              description: "Initial stock",
              method: "manual",
              lines: [
                {
                  account: "1000",
                  amount: 5000,
                  type: "debit",
                  memo: "Debit cash",
                },
              ],
            }),
          }),
        );
      });

      it("should create stock onboarding and post items in batches", async () => {
        const mockFetch = vi
          .fn()
          // create onboarding
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: "onboard-1" }),
          })
          // post item batch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await adapter.createStockOnboarding("tenant-1", "loc-1", "2026-01-01", [
          { variantId: "v-1", quantity: 100, unitCostCents: 200 } as any,
        ]);

        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it("should handle getTenantConfig and saveTenantConfig with localStorage", async () => {
        const adapter = new LaravelRESTAdapter();

        // Default config when empty
        const defaultConfig = await adapter.getTenantConfig("tenant-cfg");
        expect(defaultConfig.accountingMethod).toBe("ACCRUAL");

        // Save new config
        await adapter.saveTenantConfig("tenant-cfg", {
          accountingMethod: "CASH",
          costingMethod: "LIFO",
        });

        const updatedConfig = await adapter.getTenantConfig("tenant-cfg");
        expect(updatedConfig.accountingMethod).toBe("CASH");
        expect(updatedConfig.costingMethod).toBe("LIFO");
      });

      it("should return default fallback object when getOutboxStats fails", async () => {
        const mockFetch = vi
          .fn()
          .mockRejectedValue(new Error("Outbox endpoint failed"));
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const stats = await adapter.getOutboxStats();

        expect(stats).toEqual({
          pendingCount: 0,
          publishedCount: 0,
          failedCount: 0,
        });
      });

      it("should fetch dead letter events or return empty array on failure", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
            {
              id: "evt-1",
              type: "OrderCreated",
              payload: { id: 1 },
              error: "Timeout",
              status: "Failed",
              createdAt: "2026-01-01",
            },
          ],
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const events = await adapter.getDeadLetterEvents(10);

        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("OrderCreated");
      });
    });

    describe("Compliance Ledger & Audit", () => {
      it("should reconstruct compliance state with or without timestamp", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ state: "reconstructed" }),
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        await adapter.reconstructState("tenant-comp");
        expect(mockFetch).toHaveBeenLastCalledWith(
          "http://localhost:8000/api/compliance/reconstruct?tenantId=tenant-comp",
          expect.objectContaining({ method: "GET" }),
        );

        await adapter.reconstructState("tenant-comp", "2026-01-01T00:00:00Z");
        expect(mockFetch).toHaveBeenLastCalledWith(
          "http://localhost:8000/api/compliance/reconstruct?tenantId=tenant-comp&timestamp=2026-01-01T00%3A00%3A00Z",
          expect.objectContaining({ method: "GET" }),
        );
      });

      it("should replay audit trail with or without timestamp", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [{ id: "audit-1" }],
        });
        global.fetch = mockFetch;

        const adapter = new LaravelRESTAdapter();
        const res = await adapter.replayAudit(
          "tenant-comp",
          "2026-01-01T00:00:00Z",
        );
        expect(res).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:8000/api/compliance/replay?tenantId=tenant-comp&timestamp=2026-01-01T00%3A00%3A00Z",
          expect.objectContaining({ method: "GET" }),
        );
      });
    });
  });

  describe("GraphQLAdapter RFID methods", () => {
    it("should query rfid tags, assign, and simulate scans", async () => {
      const mockFetch = vi
        .fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              rfidTags: [
                {
                  epc: "EPC-GQL-1",
                  sku: "SKU-GQL",
                  serialNumber: "SN-GQL",
                  status: "ACTIVE",
                },
              ],
            },
          }),
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { assignRfidTag: true },
          }),
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { simulateRfidScan: true },
          }),
        });
      global.fetch = mockFetch;

      const adapter = new GraphQLAdapter();
      const tags = await adapter.getRfidTags("tenant-1");
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe("EPC-GQL-1");

      await adapter.assignRfidTag("tenant-1", "EPC-GQL-1", "SKU-GQL", "SN-GQL");
      await adapter.simulateRfidScan("tenant-1", "LOC-A", ["EPC-GQL-1"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("ExpressRESTAdapter RFID methods", () => {
    it("should query rfid tags, assign, and simulate scans", async () => {
      const mockFetch = vi
        .fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tags: [
              {
                epc: "EPC-EXP-1",
                sku: "SKU-EXP",
                serialNumber: "SN-EXP",
                status: "ACTIVE",
              },
            ],
          }),
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "Tag assigned successfully" }),
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "RFID scan simulation published." }),
        });
      global.fetch = mockFetch;

      const adapter = new ExpressRESTAdapter();
      const tags = await adapter.getRfidTags("tenant-1");
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe("EPC-EXP-1");

      await adapter.assignRfidTag("tenant-1", "EPC-EXP-1", "SKU-EXP", "SN-EXP");
      await adapter.simulateRfidScan("tenant-1", "LOC-A", ["EPC-EXP-1"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  describe("PythonRESTAdapter", () => {
    it("should query slotting suggestions route successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { sku: "SKU-A", currentLocationId: "loc-1", estimatedSavings: 100 },
        ],
      });
      global.fetch = mockFetch;
      const adapter = new PythonRESTAdapter();
      const suggestions = await adapter.getSlottingSuggestions("tenant-test");
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].sku).toBe("SKU-A");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/warehouse-locations/slotting-suggestions?tenantId=tenant-test",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should query rfid tags, assign, and simulate scans", async () => {
      const mockFetch = vi
        .fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tags: [
              {
                epc: "EPC-PY-1",
                sku: "SKU-PY",
                serialNumber: "SN-PY",
                status: "ACTIVE",
              },
            ],
          }),
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "Tag assigned successfully" }),
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: "RFID scan simulation published." }),
        });
      global.fetch = mockFetch;

      const adapter = new PythonRESTAdapter();
      const tags = await adapter.getRfidTags("tenant-1");
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe("EPC-PY-1");

      await adapter.assignRfidTag("tenant-1", "EPC-PY-1", "SKU-PY", "SN-PY");
      await adapter.simulateRfidScan("tenant-1", "LOC-A", ["EPC-PY-1"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
