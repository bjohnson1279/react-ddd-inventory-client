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
  });
});
