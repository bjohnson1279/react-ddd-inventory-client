import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLAdapter } from '../../src/api/graphql';
import { ExpressRESTAdapter } from '../../src/api/express';
import { LaravelRESTAdapter } from '../../src/api/laravel';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Inventory Backend API Adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('GraphQLAdapter', () => {
    it('should correctly perform login and retrieve token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { login: 'mock-gql-jwt-token' }
        })
      });
      global.fetch = mockFetch;

      const adapter = new GraphQLAdapter();
      const token = await adapter.login('tenant-1', 'admin', 'admin', 'password');

      expect(token).toBe('mock-gql-jwt-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      );
    });
  });

  describe('ExpressRESTAdapter', () => {
    it('should attempt setup when login credentials fail', async () => {
      const mockFetch = vi.fn()
        // First login attempt fails (401 Unauthorized)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ error: 'Invalid credentials' })
        })
        // Setup registration succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Setup completed' })
        })
        // Second login attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'mock-express-jwt-token' })
        });
      global.fetch = mockFetch;

      const adapter = new ExpressRESTAdapter();
      const token = await adapter.login('tenant-test', 'admin-user', 'admin', 'password');

      expect(token).toBe('mock-express-jwt-token');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should query slotting suggestions route successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ sku: 'SKU-A', currentLocationId: 'loc-1', estimatedSavings: 100 }]
      });
      global.fetch = mockFetch;
      const adapter = new ExpressRESTAdapter();
      const suggestions = await adapter.getSlottingSuggestions('tenant-test');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].sku).toBe('SKU-A');
    });
  });

  describe('LaravelRESTAdapter', () => {
    it('should query catalog and gather stock for each SKU sequentially', async () => {
      const mockFetch = vi.fn()
        // Product list request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            products: [
              {
                id: 'p-1',
                name: 'Product 1',
                variants: [
                  { id: 'v-1', sku: 'SKU-A', tracking_mode: 'quantity', attributes: [] }
                ]
              }
            ]
          })
        })
        // SKU stock query
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ available_quantity: 42, location_id: 'loc-A' })
        });
      global.fetch = mockFetch;

      const adapter = new LaravelRESTAdapter();
      const items = await adapter.getInventoryItems();

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({
        id: 'v-1-stock',
        sku: 'SKU-A',
        locationId: 'loc-A',
        quantity: 42,
        version: 1
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should query slotting suggestions route successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ sku: 'SKU-A', currentLocationId: 'loc-1', estimatedSavings: 100 }]
      });
      global.fetch = mockFetch;
      const adapter = new LaravelRESTAdapter();
      const suggestions = await adapter.getSlottingSuggestions('tenant-test');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].sku).toBe('SKU-A');
    });

    it('should connect to Server-Sent Events and capture barcode scans', () => {
      const mockEventSourceInstance = {
        url: '',
        onmessage: null as any,
        onerror: null as any,
        close: vi.fn()
      };
      
      const constructorSpy = vi.fn();
      class EventSourceMock {
        constructor(url: string) {
          constructorSpy(url);
          mockEventSourceInstance.url = url;
          return mockEventSourceInstance as any;
        }
      }
      global.EventSource = EventSourceMock as any;

      localStorage.setItem('auth_token', 'test-auth-token-999');

      const adapter = new LaravelRESTAdapter();
      const onScan = vi.fn();
      const unsubscribe = adapter.subscribeBarcodeScans('tenant-1', onScan);

      expect(constructorSpy).toHaveBeenCalledWith(
        'http://localhost:8000/api/notifications/subscribe?token=test-auth-token-999'
      );

      mockEventSourceInstance.onmessage({
        data: JSON.stringify({
          type: 'BarcodeScanned',
          scanValue: '9988776655',
          symbology: 'EAN-13',
          context: 'receive',
          status: 'success',
          time: '2026-07-15T12:00:00Z'
        })
      });

      expect(onScan).toHaveBeenCalledWith({
        scanValue: '9988776655',
        symbology: 'EAN-13',
        context: 'receive',
        status: 'success',
        time: '2026-07-15T12:00:00Z'
      });

      unsubscribe();
      expect(mockEventSourceInstance.close).toHaveBeenCalled();
    });

    it('should query rfid tags, assign, and subscribe', async () => {
      const mockFetch = vi.fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: [{ epc: 'EPC-1', sku: 'SKU-A', serial_number: 'SN-1' }] })
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Tag assigned successfully' })
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'RFID scan simulation published.' })
        });
      global.fetch = mockFetch;

      const adapter = new LaravelRESTAdapter();
      const tags = await adapter.getRfidTags('tenant-1');
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe('EPC-1');

      await adapter.assignRfidTag('tenant-1', 'EPC-1', 'SKU-A', 'SN-1');
      await adapter.simulateRfidScan('tenant-1', 'LOC-A', ['EPC-1']);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // subscribeRfidScans
      const mockEventSourceInstance = {
        url: '',
        onmessage: null as any,
        onerror: null as any,
        close: vi.fn()
      };
      global.EventSource = class {
        constructor(url: string) {
          mockEventSourceInstance.url = url;
          return mockEventSourceInstance as any;
        }
      } as any;

      const onScanProcessed = vi.fn();
      const unsubscribe = adapter.subscribeRfidScans('tenant-1', onScanProcessed);
      mockEventSourceInstance.onmessage({
        data: JSON.stringify({
          type: 'rfid_scan_processed',
          message: JSON.stringify({
            id: 'batch-1',
            tenantId: 'tenant-1',
            locationId: 'LOC-A',
            totalCount: 1,
            matchedCount: 1,
            unmatchedCount: 0,
            unmatchedEpcs: []
          })
        })
      });

      expect(onScanProcessed).toHaveBeenCalledWith({
        id: 'batch-1',
        tenantId: 'tenant-1',
        locationId: 'LOC-A',
        totalCount: 1,
        matchedCount: 1,
        unmatchedCount: 0,
        unmatchedEpcs: []
      });
      unsubscribe();
    });
  });

  describe('GraphQLAdapter RFID methods', () => {
    it('should query rfid tags, assign, and simulate scans', async () => {
      const mockFetch = vi.fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { rfidTags: [{ epc: 'EPC-GQL-1', sku: 'SKU-GQL', serialNumber: 'SN-GQL', status: 'ACTIVE' }] }
          })
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { assignRfidTag: true }
          })
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { simulateRfidScan: true }
          })
        });
      global.fetch = mockFetch;

      const adapter = new GraphQLAdapter();
      const tags = await adapter.getRfidTags('tenant-1');
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe('EPC-GQL-1');

      await adapter.assignRfidTag('tenant-1', 'EPC-GQL-1', 'SKU-GQL', 'SN-GQL');
      await adapter.simulateRfidScan('tenant-1', 'LOC-A', ['EPC-GQL-1']);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('ExpressRESTAdapter RFID methods', () => {
    it('should query rfid tags, assign, and simulate scans', async () => {
      const mockFetch = vi.fn()
        // getRfidTags
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: [{ epc: 'EPC-EXP-1', sku: 'SKU-EXP', serialNumber: 'SN-EXP', status: 'ACTIVE' }] })
        })
        // assignRfidTag
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Tag assigned successfully' })
        })
        // simulateRfidScan
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'RFID scan simulation published.' })
        });
      global.fetch = mockFetch;

      const adapter = new ExpressRESTAdapter();
      const tags = await adapter.getRfidTags('tenant-1');
      expect(tags).toHaveLength(1);
      expect(tags[0].epc).toBe('EPC-EXP-1');

      await adapter.assignRfidTag('tenant-1', 'EPC-EXP-1', 'SKU-EXP', 'SN-EXP');
      await adapter.simulateRfidScan('tenant-1', 'LOC-A', ['EPC-EXP-1']);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
