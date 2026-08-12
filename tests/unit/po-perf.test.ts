import { describe, it, expect, vi } from 'vitest';
import { LaravelRESTAdapter } from '../../src/api/laravel';
import { ExpressRESTAdapter } from '../../src/api/express';

describe('Performance: getPurchaseOrders', () => {
  it('LaravelRESTAdapter should fetch POs in bulk (< 300ms for 5 items)', async () => {
    const adapter = new LaravelRESTAdapter();
    const mockRequest = vi.spyOn(adapter as any, 'request').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // simulate 100ms network delay
      return [
        { id: 'id1', tenant_id: 'tenant1', supplier: 'supplier', status: 'pending', created_at: 'now', items: [] },
        { id: 'id2', tenant_id: 'tenant1', supplier: 'supplier', status: 'pending', created_at: 'now', items: [] }
      ];
    });

    const originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: () => JSON.stringify(['id1', 'id2', 'id3', 'id4', 'id5']),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as any;

    const startTime = Date.now();
    await adapter.getPurchaseOrders('tenant1');
    const duration = Date.now() - startTime;

    console.log(`[Baseline Laravel] Duration: ${duration}ms`);
    expect(duration).toBeLessThan(300); // 100ms request max wait time across 5 requests concurrently is roughly ~100ms

    mockRequest.mockRestore();
    global.localStorage = originalLocalStorage;
  });

  it('ExpressRESTAdapter should fetch POs in bulk (< 300ms for 5 items)', async () => {
    const adapter = new ExpressRESTAdapter();
    const mockRequest = vi.spyOn(adapter as any, 'request').mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // simulate 100ms delay per request
      return [
        { id: 'id1', tenant_id: 'tenant1', supplier: 'supplier', status: 'pending', created_at: 'now', items: [] },
        { id: 'id2', tenant_id: 'tenant1', supplier: 'supplier', status: 'pending', created_at: 'now', items: [] }
      ];
    });

    const originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: () => JSON.stringify(['id1', 'id2', 'id3', 'id4', 'id5']),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    } as any;

    const startTime = Date.now();
    await adapter.getPurchaseOrders('tenant1');
    const duration = Date.now() - startTime;

    console.log(`[Baseline Express] Duration: ${duration}ms`);
    expect(duration).toBeLessThan(300);

    mockRequest.mockRestore();
    global.localStorage = originalLocalStorage;
  });
});