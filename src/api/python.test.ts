import { afterEach, describe, expect, it, vi } from 'vitest';
import { PythonRESTAdapter } from './python';

afterEach(() => vi.unstubAllGlobals());

describe('Python physical counts transport', () => {
  it('uses persisted count routes, snapshots and explicit review', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ record_id: 'count', revision: 2 }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    expect((await adapter.startCycleCount('store-a', 'Stocktake', true, 'A', 'back room')).id).toBe('count');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/cycle-counts\/start$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ location_id: 'back room', is_blind_count: true });
    await adapter.submitCycleCount('count', { revision: 2, mutationId: 'offline', items: [{ sku: 'A', countedQuantity: 8 }] });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ record_id: 'count', revision: 2,
      mutation_id: 'offline', items: [{ sku: 'A', counted_quantity: 8 }] });
    await adapter.reviewCycleCount('count', 'approve', 2, 'Checked', 'approval');
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/cycle-counts\/count\/approve$/);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).mutation_id).toBe('approval');
  });

  it('surfaces stale-count conflicts instead of acknowledging reconciliation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409,
      text: async () => JSON.stringify({ detail: 'Stock changed since count snapshot' }) }));
    await expect(new PythonRESTAdapter().reviewCycleCount('count', 'approve', 0, 'Checked', 'approval'))
      .rejects.toThrow('Stock changed since count snapshot');
  });
});

describe('Python catalog transport', () => {
  it('loads persisted products including products without stock or variants', async () => {
    const products = [{ id: 'shirt', name: 'T Shirt', variants: [] }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => products });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new PythonRESTAdapter().getProducts()).toEqual(products);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/inventory\/products$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces API failures instead of returning an empty product list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401,
      text: async () => JSON.stringify({ detail: 'Invalid or expired token' }) }));
    await expect(new PythonRESTAdapter().getProducts()).rejects.toThrow('Invalid or expired token');
  });
});

describe('Python valuation transport', () => {
  it('uses one server report with the requested tenant, location and method', async () => {
    const rows = [{ sku: 'SKU-A', totalQuantity: 8, totalValueCents: 1600 }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new PythonRESTAdapter().getValuationReport('store-a', 'back room', 'WAC')).toEqual(rows);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/accounting/valuation-report');
    expect(url.searchParams.get('tenantId')).toBe('store-a');
    expect(url.searchParams.get('locationId')).toBe('back room');
    expect(url.searchParams.get('method')).toBe('WAC');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows unpriced-stock errors instead of reporting a zero valuation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409,
      text: async () => JSON.stringify({ detail: 'Unpriced stock' }) }));
    await expect(new PythonRESTAdapter().getValuationReport('store-a')).rejects.toThrow('Unpriced stock');
  });
});
