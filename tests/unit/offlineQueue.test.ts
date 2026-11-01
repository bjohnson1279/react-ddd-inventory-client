import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addScanToQueue,
  getQueuedScans,
  deleteScan,
  deleteScans,
  syncOfflineQueue,
  QueuedScan,
} from "../../src/api/offlineQueue";

describe("Offline Queue DB", () => {
  let mockStore: any;
  let mockTransaction: any;
  let mockDB: any;
  let mockOpenRequest: any;

  beforeEach(() => {
    mockStore = {
      add: vi.fn(),
      getAll: vi.fn(),
      delete: vi.fn(),
    };

    mockTransaction = {
      objectStore: vi.fn().mockReturnValue(mockStore),
      oncomplete: null as any,
      onerror: null as any,
    };

    mockDB = {
      transaction: vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockTransaction.oncomplete) mockTransaction.oncomplete();
        }, 0);
        return mockTransaction;
      }),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true),
      },
      createObjectStore: vi.fn(),
    };

    mockOpenRequest = {
      result: mockDB,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      error: new Error("IndexedDB open error"),
    };

    global.indexedDB = {
      open: vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockOpenRequest.onsuccess) mockOpenRequest.onsuccess();
        }, 0);
        return mockOpenRequest;
      }),
    } as any;
  });

  it("should call add on IndexedDB store when queueing a scan and add ISO timestamp", async () => {
    mockStore.add.mockImplementation((data: any) => {
      const req = { result: 1, onsuccess: null as any, onerror: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const id = await addScanToQueue({
      value: "123456",
      context: "inventory",
      amount: 1,
      actualQuantity: 1,
      tenantId: "t-1",
      locationId: "loc-1",
      actorId: "act-1",
    });

    expect(id).toBe(1);
    expect(mockStore.add).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "123456",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
      }),
    );
  });

  it("should list entries with getQueuedScans", async () => {
    mockStore.getAll.mockImplementation(() => {
      const req = {
        result: [{ id: 10, value: "ABC" }],
        onsuccess: null as any,
        onerror: null as any,
      };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const scans = await getQueuedScans();
    expect(scans).toHaveLength(1);
    expect(scans[0].value).toBe("ABC");
  });

  it("should delete multiple entries with deleteScans", async () => {
    mockStore.delete.mockImplementation(() => {
      const req = { onsuccess: null as any, onerror: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    await deleteScans([10, 20]);
    expect(mockStore.delete).toHaveBeenCalledWith(10);
    expect(mockStore.delete).toHaveBeenCalledWith(20);
  });

  it("should return immediately when deleteScans is called with empty array", async () => {
    await deleteScans([]);
    expect(global.indexedDB.open).not.toHaveBeenCalled();
  });

  it("should delete a single scan with deleteScan", async () => {
    mockStore.delete.mockImplementation(() => {
      const req = { onsuccess: null as any, onerror: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    await deleteScan(55);
    expect(mockStore.delete).toHaveBeenCalledWith(55);
  });

  it("should create object store on upgrade if it does not exist", async () => {
    mockDB.objectStoreNames.contains.mockReturnValue(false);
    global.indexedDB.open = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockOpenRequest.onupgradeneeded) {
          mockOpenRequest.onupgradeneeded({} as any);
        }
        if (mockOpenRequest.onsuccess) {
          mockOpenRequest.onsuccess();
        }
      }, 0);
      return mockOpenRequest;
    });

    mockStore.getAll.mockImplementation(() => {
      const req = { result: [], onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    await getQueuedScans();
    expect(mockDB.createObjectStore).toHaveBeenCalledWith("scans", {
      keyPath: "id",
      autoIncrement: true,
    });
  });

  it("should reject when openDatabase fails", async () => {
    global.indexedDB.open = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockOpenRequest.onerror) mockOpenRequest.onerror();
      }, 0);
      return mockOpenRequest;
    });

    await expect(getQueuedScans()).rejects.toThrow("IndexedDB open error");
  });

  it("should reject when addScanToQueue store request fails", async () => {
    mockStore.add.mockImplementation(() => {
      const req = {
        error: new Error("Add failed"),
        onsuccess: null as any,
        onerror: null as any,
      };
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    });

    await expect(
      addScanToQueue({
        value: "123",
        context: "inv",
        amount: 1,
        actualQuantity: 1,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
      }),
    ).rejects.toThrow("Add failed");
  });

  it("should reject when getQueuedScans store request fails", async () => {
    mockStore.getAll.mockImplementation(() => {
      const req = {
        error: new Error("Get failed"),
        onsuccess: null as any,
        onerror: null as any,
      };
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    });

    await expect(getQueuedScans()).rejects.toThrow("Get failed");
  });

  it("should reject when deleteScan store request fails", async () => {
    mockStore.delete.mockImplementation(() => {
      const req = {
        error: new Error("Delete failed"),
        onsuccess: null as any,
        onerror: null as any,
      };
      setTimeout(() => {
        if (req.onerror) req.onerror();
      }, 0);
      return req;
    });

    await expect(deleteScan(123)).rejects.toThrow("Delete failed");
  });

  it("should reject when transaction onerror fires during deleteScans", async () => {
    mockDB.transaction = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockTransaction.onerror) {
          mockTransaction.error = new Error("Transaction failed");
          mockTransaction.onerror();
        }
      }, 0);
      return mockTransaction;
    });

    await expect(deleteScans([10])).rejects.toThrow("Transaction failed");
  });

  it("should sync offline queue with all successful items", async () => {
    const mockScans: QueuedScan[] = [
      {
        id: 10,
        value: "ABC",
        context: "inv",
        amount: 1,
        actualQuantity: 1,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
        timestamp: "2025-01-01",
      },
      {
        id: 20,
        value: "DEF",
        context: "inv",
        amount: 2,
        actualQuantity: 2,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
        timestamp: "2025-01-01",
      },
    ];

    mockStore.getAll.mockImplementation(() => {
      const req = { result: mockScans, onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    mockStore.delete.mockImplementation(() => {
      const req = { onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const mockClient = {
      scanBarcode: vi.fn().mockResolvedValue({ success: true }),
    } as any;

    const summary = await syncOfflineQueue(mockClient);
    expect(summary.successCount).toBe(2);
    expect(summary.failedCount).toBe(0);
    expect(summary.errors).toHaveLength(0);
    expect(mockClient.scanBarcode).toHaveBeenCalledTimes(2);
    expect(mockStore.delete).toHaveBeenCalledWith(10);
    expect(mockStore.delete).toHaveBeenCalledWith(20);
  });

  it("should handle partial sync failures and ignore scans missing id", async () => {
    const mockScans: (QueuedScan | Omit<QueuedScan, "id">)[] = [
      {
        id: 10,
        value: "SUCCESS_1",
        context: "inv",
        amount: 1,
        actualQuantity: 1,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
        timestamp: "2025-01-01",
      },
      {
        id: 20,
        value: "FAIL_1",
        context: "inv",
        amount: 1,
        actualQuantity: 1,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
        timestamp: "2025-01-01",
      },
      {
        value: "NO_ID",
        context: "inv",
        amount: 1,
        actualQuantity: 1,
        tenantId: "t-1",
        locationId: "loc-1",
        actorId: "act-1",
        timestamp: "2025-01-01",
      } as any,
    ];

    mockStore.getAll.mockImplementation(() => {
      const req = { result: mockScans, onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    mockStore.delete.mockImplementation(() => {
      const req = { onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const mockClient = {
      scanBarcode: vi.fn().mockImplementation((val: string) => {
        if (val === "FAIL_1") {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({ success: true });
      }),
    } as any;

    const summary = await syncOfflineQueue(mockClient);
    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.errors).toContain("Scan FAIL_1 failed: Network error");
    expect(mockStore.delete).toHaveBeenCalledWith(10);
    expect(mockStore.delete).not.toHaveBeenCalledWith(20);
  });

  it("should batch sync in groups of 10 items", async () => {
    const mockScans: QueuedScan[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      value: `SCAN_${i + 1}`,
      context: "inv",
      amount: 1,
      actualQuantity: 1,
      tenantId: "t-1",
      locationId: "loc-1",
      actorId: "act-1",
      timestamp: "2025-01-01",
    }));

    mockStore.getAll.mockImplementation(() => {
      const req = { result: mockScans, onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    mockStore.delete.mockImplementation(() => {
      const req = { onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const mockClient = {
      scanBarcode: vi.fn().mockResolvedValue({ success: true }),
    } as any;

    const summary = await syncOfflineQueue(mockClient);
    expect(summary.successCount).toBe(15);
    expect(summary.failedCount).toBe(0);
    expect(mockClient.scanBarcode).toHaveBeenCalledTimes(15);
    expect(mockStore.delete).toHaveBeenCalledTimes(15);
  });
});
