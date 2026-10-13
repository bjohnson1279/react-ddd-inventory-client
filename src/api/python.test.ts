import { afterEach, describe, expect, it, vi } from "vitest";
import { PythonRESTAdapter } from "./python";

afterEach(() => vi.unstubAllGlobals());

describe("Python procurement transport", () => {
  it("reuses a PO creation mutation ID after an uncertain response", async () => {
    const supplier = {
      ok: true,
      json: async () => [
        { id: "vendor-retry", name: "Retry vendor", isActive: true },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(supplier)
      .mockRejectedValueOnce(new Error("Network lost"))
      .mockResolvedValueOnce(supplier)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "po" }) });
    vi.stubGlobal("fetch", fetchMock);
    const lines = [{ sku: "A", quantity: 10, unitCostCents: 100 }];
    await expect(
      new PythonRESTAdapter().createPurchaseOrder(
        "store-a",
        "Retry vendor",
        lines,
      ),
    ).rejects.toThrow("Network lost");
    await new PythonRESTAdapter().createPurchaseOrder(
      "store-a",
      "Retry vendor",
      lines,
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).mutationId).toBe(
      JSON.parse(fetchMock.mock.calls[3][1].body).mutationId,
    );
  });
  it("resolves the shared form supplier name to an owned supplier ID", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "supplier-a", name: "Wholesale", isActive: true },
        ],
      })
      .mockResolvedValue({ ok: true, json: async () => ({ id: "new-order" }) });
    vi.stubGlobal("fetch", fetchMock);
    await new PythonRESTAdapter().createPurchaseOrder("store-a", "Wholesale", [
      { sku: "A", quantity: 10, unitCostCents: 100 },
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).supplierId).toBe(
      "supplier-a",
    );
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/purchase-orders$/);
  });
  it("loads server orders without a browser ID list", async () => {
    const orders = [{ id: "server-po", status: "partially_received" }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => orders });
    vi.stubGlobal("fetch", fetchMock);
    expect(await new PythonRESTAdapter().getPurchaseOrders("store-a")).toEqual(
      orders,
    );
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/purchase-orders?tenantId=store-a",
    );
    expect(fetchMock.mock.calls[0][0]).not.toContain("ids=");
  });

  it("surfaces procurement and policy failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 403,
          text: async () => JSON.stringify({ detail: "Access denied" }),
        }),
    );
    const adapter = new PythonRESTAdapter();
    await expect(adapter.getPurchaseOrders("store-a")).rejects.toThrow(
      "Access denied",
    );
    await expect(adapter.getReorderPolicies("store-a")).rejects.toThrow(
      "Access denied",
    );
  });

  it("retains a receipt ID after an uncertain failure, including a new adapter instance", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network lost"))
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: "partially_received" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const lines = [{ sku: "A", quantity: 4 }];
    await expect(
      new PythonRESTAdapter().receivePurchaseOrder("store-a", "po", lines),
    ).rejects.toThrow("Network lost");
    await new PythonRESTAdapter().receivePurchaseOrder("store-a", "po", lines);
    await new PythonRESTAdapter().receivePurchaseOrder("store-a", "po", lines);
    const ids = fetchMock.mock.calls.map(
      (call) => JSON.parse(call[1].body).receiptId,
    );
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });
});

describe("Python physical counts transport", () => {
  it("uses persisted count routes, snapshots and explicit review", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ record_id: "count", revision: 2 }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new PythonRESTAdapter();
    expect(
      (
        await adapter.startCycleCount(
          "store-a",
          "Stocktake",
          true,
          "A",
          "back room",
        )
      ).id,
    ).toBe("count");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/cycle-counts\/start$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      location_id: "back room",
      is_blind_count: true,
    });
    await adapter.submitCycleCount("count", {
      revision: 2,
      mutationId: "offline",
      items: [{ sku: "A", countedQuantity: 8 }],
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      record_id: "count",
      revision: 2,
      mutation_id: "offline",
      items: [{ sku: "A", counted_quantity: 8 }],
    });
    await adapter.reviewCycleCount(
      "count",
      "approve",
      2,
      "Checked",
      "approval",
    );
    expect(fetchMock.mock.calls[2][0]).toMatch(
      /\/api\/cycle-counts\/count\/approve$/,
    );
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).mutation_id).toBe(
      "approval",
    );
  });

  it("surfaces stale-count conflicts instead of acknowledging reconciliation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 409,
          text: async () =>
            JSON.stringify({ detail: "Stock changed since count snapshot" }),
        }),
    );
    await expect(
      new PythonRESTAdapter().reviewCycleCount(
        "count",
        "approve",
        0,
        "Checked",
        "approval",
      ),
    ).rejects.toThrow("Stock changed since count snapshot");
  });
});

describe("Python catalog transport", () => {
  it("loads persisted products including products without stock or variants", async () => {
    const products = [{ id: "shirt", name: "T Shirt", variants: [] }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => products });
    vi.stubGlobal("fetch", fetchMock);
    expect(await new PythonRESTAdapter().getProducts()).toEqual(products);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/inventory\/products$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces API failures instead of returning an empty product list", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          text: async () =>
            JSON.stringify({ detail: "Invalid or expired token" }),
        }),
    );
    await expect(new PythonRESTAdapter().getProducts()).rejects.toThrow(
      "Invalid or expired token",
    );
  });
});

describe("Python valuation transport", () => {
  it("uses one server report with the requested tenant, location and method", async () => {
    const rows = [{ sku: "SKU-A", totalQuantity: 8, totalValueCents: 1600 }];
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => rows });
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await new PythonRESTAdapter().getValuationReport(
        "store-a",
        "back room",
        "WAC",
      ),
    ).toEqual(rows);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/accounting/valuation-report");
    expect(url.searchParams.get("tenantId")).toBe("store-a");
    expect(url.searchParams.get("locationId")).toBe("back room");
    expect(url.searchParams.get("method")).toBe("WAC");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows unpriced-stock errors instead of reporting a zero valuation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 409,
          text: async () => JSON.stringify({ detail: "Unpriced stock" }),
        }),
    );
    await expect(
      new PythonRESTAdapter().getValuationReport("store-a"),
    ).rejects.toThrow("Unpriced stock");
  });
});

describe("Python WebSocket transport", () => {
  let createdWs: MockWebSocket | null = null;

  class MockWebSocket {
    static OPEN = 1;
    readyState = MockWebSocket.OPEN;
    url: string;
    listeners: Record<string, Function[]> = {};
    onmessage: ((event: any) => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    send = vi.fn();
    close = vi.fn();

    constructor(url: string) {
      this.url = url;
      createdWs = this;
    }

    addEventListener(event: string, cb: Function) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    }

    triggerOpen() {
      if (this.listeners["open"]) {
        this.listeners["open"].forEach((cb) => cb());
      }
    }

    triggerMessage(data: string) {
      if (this.onmessage) {
        this.onmessage({ data });
      }
    }

    triggerError(err: any) {
      if (this.onerror) {
        this.onerror(err);
      }
    }
  }

  it("handles invalid JSON on message in subscribeRfidScans gracefully", () => {
    createdWs = null;
    vi.stubGlobal("WebSocket", MockWebSocket);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const adapter = new PythonRESTAdapter();
    const onScanProcessed = vi.fn();

    const unsubscribe = adapter.subscribeRfidScans("tenant-1", onScanProcessed);

    expect(createdWs).not.toBeNull();
    expect(createdWs!.url).toContain("tenantId=tenant-1");

    // Trigger open and check authentication
    createdWs!.triggerOpen();
    expect(createdWs!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "authenticate", token: "" }),
    );

    // Emit invalid JSON message
    createdWs!.triggerMessage("INVALID_JSON{");

    // Verify JSON parse error was caught and logged, onScanProcessed was not called
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Python WS Rfid Parse Error:",
      expect.any(SyntaxError),
    );
    expect(onScanProcessed).not.toHaveBeenCalled();

    // Emit valid RFID scan message
    createdWs!.triggerMessage(
      JSON.stringify({
        type: "rfid_scan_processed",
        id: "batch-101",
        tenantId: "tenant-1",
        locationId: "loc-1",
        totalCount: 5,
        matchedCount: 4,
        unmatchedCount: 1,
        unmatchedEpcs: ["EPC-99"],
      }),
    );

    expect(onScanProcessed).toHaveBeenCalledWith({
      id: "batch-101",
      tenantId: "tenant-1",
      locationId: "loc-1",
      totalCount: 5,
      matchedCount: 4,
      unmatchedCount: 1,
      unmatchedEpcs: ["EPC-99"],
    });

    // Teardown
    unsubscribe();
    expect(createdWs!.close).toHaveBeenCalled();
  });

  it("handles invalid JSON on message in subscribeBarcodeScans gracefully", () => {
    createdWs = null;
    vi.stubGlobal("WebSocket", MockWebSocket);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const adapter = new PythonRESTAdapter();
    const onScan = vi.fn();

    const unsubscribe = adapter.subscribeBarcodeScans("tenant-1", onScan);

    expect(createdWs).not.toBeNull();
    expect(createdWs!.url).toContain("tenantId=tenant-1");

    // Emit invalid JSON message
    createdWs!.triggerMessage("{bad-json-payload");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Python WS Parse Error:",
      expect.any(SyntaxError),
    );
    expect(onScan).not.toHaveBeenCalled();

    // Emit valid barcode scan message
    createdWs!.triggerMessage(
      JSON.stringify({
        type: "barcode_scanned",
        scanValue: "123456789",
        symbology: "code_128",
        context: "receiving",
        status: "success",
      }),
    );

    expect(onScan).toHaveBeenCalledWith({
      scanValue: "123456789",
      symbology: "code_128",
      context: "receiving",
      status: "Scanned successfully",
      time: expect.any(String),
    });

    unsubscribe();
    expect(createdWs!.close).toHaveBeenCalled();
  });

  it("handles ws.onerror events in subscribeRfidScans and subscribeBarcodeScans", () => {
    createdWs = null;
    vi.stubGlobal("WebSocket", MockWebSocket);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const adapter = new PythonRESTAdapter();

    adapter.subscribeRfidScans("tenant-1", vi.fn());
    createdWs!.triggerError(new Error("Connection failed"));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Python WS Rfid Error:",
      expect.any(Error),
    );

    adapter.subscribeBarcodeScans("tenant-1", vi.fn());
    createdWs!.triggerError(new Error("Connection failed"));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Python WS Error:",
      expect.any(Error),
    );
  });
});
