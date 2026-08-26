import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addScanToQueue, getQueuedScans, deleteScan, syncOfflineQueue } from '../../src/api/offlineQueue';

describe('Offline Queue DB', () => {
  let mockStore: any;
  let mockDB: any;

  beforeEach(() => {
    mockStore = {
      add: vi.fn(),
      getAll: vi.fn(),
      delete: vi.fn(),
    };

    const mockTransaction = {
      objectStore: () => mockStore,
    };

    mockDB = {
      transaction: () => mockTransaction,
      objectStoreNames: {
        contains: () => true,
      },
    };

    const mockRequest = {
      result: mockDB,
      onsuccess: null as any,
      onerror: null as any,
    };

    global.indexedDB = {
      open: vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockRequest.onsuccess) mockRequest.onsuccess();
        }, 0);
        return mockRequest;
      })
    } as any;
  });

  it('should call add on IndexedDB store when queueing a scan', async () => {
    mockStore.add.mockImplementation((data: any) => {
      const req = { result: 1, onsuccess: null as any };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    });

    const id = await addScanToQueue({
      value: '123456',
      context: 'inventory',
      amount: 1,
      actualQuantity: 1,
      tenantId: 't-1',
      locationId: 'loc-1',
      actorId: 'act-1'
    });

    expect(id).toBe(1);
    expect(mockStore.add).toHaveBeenCalledWith(expect.objectContaining({ value: '123456' }));
  });

  it('should list and delete entries', async () => {
    mockStore.getAll.mockImplementation(() => {
      const req = { result: [{ id: 10, value: 'ABC' }], onsuccess: null as any };
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

    const scans = await getQueuedScans();
    expect(scans).toHaveLength(1);
    expect(scans[0].value).toBe('ABC');

    await deleteScan(10);
    expect(mockStore.delete).toHaveBeenCalledWith(10);
  });

  it('should sync offline queue to API client', async () => {
    mockStore.getAll.mockImplementation(() => {
      const req = { result: [{ id: 10, value: 'ABC', context: 'inv', amount: 1, actualQuantity: 1, tenantId: 't-1', locationId: 'loc-1', actorId: 'act-1' }], onsuccess: null as any };
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
      scanBarcode: vi.fn().mockResolvedValue({ success: true })
    } as any;

    const summary = await syncOfflineQueue(mockClient);
    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(mockClient.scanBarcode).toHaveBeenCalledWith('ABC', 'inv', 1, 1, 't-1', 'loc-1', 'act-1');
  });
});
