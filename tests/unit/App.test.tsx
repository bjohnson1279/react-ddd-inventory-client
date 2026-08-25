import { render, waitFor, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../../src/App';
import * as client from '../../src/api/client';

// Suppress known expected errors from React and websockets in testing env to keep output clean
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[WebSocket]')) return;
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalConsoleError(...args);
  };
});
afterEach(() => {
  console.error = originalConsoleError;
});

// Mock IndexedDB properly so it resolves immediately
const dummyIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: {
    transaction: () => ({
      objectStore: () => ({
        getAll: () => ({
          onsuccess: null,
          onerror: null,
          result: []
        })
      })
    })
  }
};

global.indexedDB = {
  open: vi.fn().mockImplementation(() => {
    setTimeout(() => {
      if (dummyIDBRequest.onsuccess) {
        (dummyIDBRequest.onsuccess as any)({ target: { result: dummyIDBRequest.result } });
      }
    }, 0);
    return dummyIDBRequest;
  })
} as any;

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useInventory: () => ({
      client: {
        getInventory: vi.fn().mockResolvedValue([]),
        getJournal: vi.fn().mockResolvedValue([]),
        getProducts: vi.fn().mockResolvedValue([]),
        getUsers: vi.fn().mockResolvedValue([]),
        getValuation: vi.fn().mockResolvedValue([]),
        subscribeBarcodeScans: vi.fn().mockReturnValue(() => {}),
        subscribeOutboxStats: vi.fn().mockReturnValue(() => {}),
        subscribeInventoryEvents: vi.fn().mockReturnValue(() => {}),
        getInventoryItems: vi.fn().mockResolvedValue([]),
        getShopifyConnections: vi.fn().mockResolvedValue([]),
        getLowStockSkus: vi.fn().mockResolvedValue([]),
        getJournalEntries: vi.fn().mockResolvedValue([]),
        getUsersList: vi.fn().mockResolvedValue([]),
        getConformance: vi.fn().mockResolvedValue([]),
        getSupplierPerformance: vi.fn().mockResolvedValue([]),
        getWarehouses: vi.fn().mockResolvedValue([]),
        getAuditDiscrepancies: vi.fn().mockResolvedValue([]),
        getOutboxStats: vi.fn().mockResolvedValue({}),
        getTenantAccountingConfig: vi.fn().mockResolvedValue({}),
        getQuarantinedItems: vi.fn().mockResolvedValue([]),
        getForecastingReports: vi.fn().mockResolvedValue([]),
      },
      backendType: 'express',
      setBackendType: vi.fn(),
    })
  };
});

// Need to bypass login screen or mock localStorage
beforeEach(() => {
  global.localStorage = {
    getItem: vi.fn().mockImplementation((key) => {
      if (key === 'auth_token') return 'mock-token';
      if (key === 'auth_role') return 'admin';
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  } as any;
});

describe('App Health Checks', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('handles health check fetch failures by setting status to offline', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      } as any);
    });
    global.fetch = fetchMock as any;

    let component;
    act(() => {
      component = render(<App />);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/health', expect.any(Object));
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/health', expect.any(Object));
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/health', expect.any(Object));
    });

    // Check that all 3 backends correctly show 'offline' title dots
    await waitFor(() => {
      const offlineDots = component.queryAllByTitle('offline');
      expect(offlineDots).toHaveLength(3);
    });
  });
});
