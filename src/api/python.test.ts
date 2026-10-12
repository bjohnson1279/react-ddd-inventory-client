import { afterEach, describe, expect, it, vi } from 'vitest';
import { PythonRESTAdapter } from './python';

afterEach(() => vi.unstubAllGlobals());

describe('Python integration transport', () => {
  it('lists only persisted Shopify connections and never synthesizes mock stores', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'store', provider: 'SHOPIFY', origin: 'actual.myshopify.com', active: true }, { id: 'sink', provider: 'EVENT_SINK' }] });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    expect(await adapter.getShopifyConnections('tenant')).toEqual([]);
    expect(await adapter.getShopifyConnections('tenant')).toEqual([{ id: 'store', tenantId: 'tenant', platform: 'shopify', storeDomain: 'actual.myshopify.com', isActive: true }]);
  });

  it('preserves tenant, mutation and version fields and encodes connection/order paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    const command = { tenantId: 'tenant', expectedVersion: 3, mutationId: 'retry', reason: 'Reviewed recovery' };
    await adapter.retryIntegrationDelivery('job/id', command);
    expect(fetchMock.mock.calls[0][0]).toMatch(/job%2Fid\/retry$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(command);
    await adapter.completeIntegrationOrder('order/id', 'cancel', command);
    expect(fetchMock.mock.calls[1][0]).toMatch(/order%2Fid\/cancel$/);
  });
});

describe('Python financial accounting transport', () => {
  it('posts the actual balanced journal and replays the same command after a lost response', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'journal', method: 'accrual', lines: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    const lines = [{ accountCode: '1000', amountCents: 101, type: 'debit' as const, memo: 'Cash' },
      { accountCode: '3000', amountCents: 101, type: 'credit' as const, memo: 'Opening equity' }];
    await expect(new PythonRESTAdapter().createJournalEntry('store', 'Actual opening', 'accrual', lines)).rejects.toThrow('Response lost');
    await new PythonRESTAdapter().createJournalEntry('store', 'Actual opening', 'accrual', lines);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/accounting\/journals$/);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.lines).toEqual(lines);
    expect(payload.description).toBe('Actual opening');
    expect(payload.quantity).toBeUndefined();
    expect(payload.sku).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
  });

  it('keeps document amounts, source links, settlement versions and tenant selectors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'document' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    const doc = { tenantId: 'store', kind: 'SALE' as const, date: '2026-10-12', reference: 'sale', counterparty: 'Customer',
      amountCents: 350, sourceIds: ['movement'], mutationId: 'doc-once', reason: 'Actual sale amount' };
    await adapter.createFinancialDocument(doc);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(doc);
    const payment = { tenantId: 'store', expectedVersion: 1, amountCents: 150, date: '2026-10-12', reference: 'bank-receipt', mutationId: 'pay-once', reason: 'Actual payment' };
    await adapter.settleFinancialDocument('doc/id', payment);
    expect(fetchMock.mock.calls[1][0]).toMatch(/doc%2Fid\/settle$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(payment);
    await adapter.getFinancialStatus('store/id');
    expect(fetchMock.mock.calls[2][0]).toMatch(/tenantId=store%2Fid$/);
  });

  it('paginates real journal rows and surfaces accounting read failures', async () => {
    const entries = Array.from({ length: 1000 }, (_, index) => ({ id: String(index), lines: [] }));
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => entries })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'last', lines: [] }] })
      .mockResolvedValue({ ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Finance permission required' }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new PythonRESTAdapter().getJournalEntries('store')).toHaveLength(1001);
    expect(fetchMock.mock.calls[1][0]).toMatch(/offset=1000$/);
    await expect(new PythonRESTAdapter().getFinancialTrialBalance('store')).rejects.toThrow('Finance permission required');
  });
});

describe('Python serial and kit transport', () => {
  it('preserves serial identity, lifecycle version and command IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'serial', status: 'in_stock', version: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    await adapter.traceSerialHistory('SN:1');
    expect(fetchMock.mock.calls[0][0]).toMatch(/SN%3A1$/);
    const payload = { expectedVersion: 1, mutationId: 'sale-once', reason: 'Sale', referenceId: 'sale-1' };
    await adapter.changeSerial('SN:1', 'sell', payload);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(payload);
    await adapter.defineKit({ sku: 'KIT', name: 'Bundle', components: [{ sku: 'PART', quantity: 2 }], expectedVersion: 0, mutationId: 'formula', reason: 'New bundle' });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).components).toEqual([{ sku: 'PART', quantity: 2 }]);
  });

  it('captures kit and source versions and replays an uncertain assembly with the same command', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ version: 3, components: [{ sku: 'PART', quantity: 2 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ sku: 'PART', locationId: 'shop', version: 7 }] })
      .mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValue({ ok: true, json: async () => ({ quantity: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(new PythonRESTAdapter().assembleKit('store', 'shop', 'KIT', 1, 'ignored-client-actor', 'assembly-once')).rejects.toThrow('Network lost');
    await new PythonRESTAdapter().assembleKit('store', 'shop', 'KIT', 1, 'ignored-client-actor', 'assembly-once');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const payload = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(payload.expectedVersion).toBe(3);
    expect(payload.tenantId).toBe('store');
    expect(payload.stockVersions).toEqual({ PART: 7, KIT: 0 });
    expect(payload.actorId).toBeUndefined();
    expect(fetchMock.mock.calls[3][1].body).toBe(fetchMock.mock.calls[2][1].body);
    await expect(new PythonRESTAdapter().assembleKit('store', 'shop', 'KIT', 2, 'actor', 'assembly-once')).rejects.toThrow('another quantity');
  });
});

describe('Python event delivery transport', () => {
  it('loads actual delivery counters and exposes denied access instead of empty results', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ pending: 3, published: 7, failed: 2 }) })
      .mockResolvedValue({ ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Access denied' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    expect(await adapter.getOutboxStats()).toEqual({ pendingCount: 3, publishedCount: 7, failedCount: 2 });
    await expect(adapter.getOutboxStats()).rejects.toThrow('Access denied');
    await expect(adapter.getDeadLetterEvents()).rejects.toThrow('Access denied');
  });

  it('replays the same retry after an uncertain response without requiring the event to remain dead-lettered', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DEAD_LETTER', version: 4 }) })
      .mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'PENDING' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(new PythonRESTAdapter().retryOutboxEvent('lost/once')).rejects.toThrow('Network lost');
    await new PythonRESTAdapter().retryOutboxEvent('lost/once');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toMatch(/lost%2Fonce\/retry$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).expectedVersion).toBe(4);
    expect(fetchMock.mock.calls[2][1].body).toEqual(fetchMock.mock.calls[1][1].body);
  });

  it('refreshes a version after a definite conflict and retains actual dead-letter metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DEAD_LETTER', version: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => JSON.stringify({ detail: 'Stale retry' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DEAD_LETTER', version: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'PENDING' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'dead', eventType: 'StockChanged', payload: { tenantId: 'store' },
        status: 'DEAD_LETTER', error: 'PublishTimeout', version: 5, attempts: 2, sequence: 1, createdAt: '2026-10-12T00:00:00Z' }] });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    await expect(adapter.retryOutboxEvent('changed')).rejects.toThrow('Stale retry');
    await adapter.retryOutboxEvent('changed');
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).expectedVersion).toBe(2);
    expect(await adapter.getDeadLetterEvents()).toEqual([{ id: 'dead', eventType: 'StockChanged', payload: '{"tenantId":"store"}',
      status: 'DEAD_LETTER', error: 'PublishTimeout', version: 5, attempts: 2, sequence: 1, occurredAt: '2026-10-12T00:00:00Z' }]);
  });
});

describe('Python transfers and units transport', () => {
  it('keeps exact quantities, configuration versions and invoice prices at the boundary', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 1 }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    const configuration = { sku: 'CASE', baseUnit: 'ea', category: 'discrete' as const,
      purchaseUnit: 'case', rules: [{ unit: 'case', factorToBase: '24' }], expectedVersion: 0, mutationId: 'configure' };
    await adapter.configureUom(configuration);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(configuration);
    const receipt = { sku: 'CASE', quantity: '0.5', unit: 'case', uomVersion: 1, unitCostCents: 1001, mutationId: 'receipt' };
    await adapter.mutateStockInUnit('receive', receipt);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(receipt);
    await adapter.convertUom('CASE/ONE', 12, 'ea', 'case');
    expect(fetchMock.mock.calls[2][0]).toMatch(/CASE%2FONE\/convert$/);
  });

  it('replays transfer commands with the same mutation and source versions after a lost response', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'DISPATCHED' }) });
    vi.stubGlobal('fetch', fetchMock);
    const data = { expectedVersion: 0, sourceVersions: { CASE: 3 }, reason: 'Truck collected', mutationId: 'dispatch-once' };
    const adapter = new PythonRESTAdapter();
    await expect(adapter.reviewStockTransfer('transfer/one', 'dispatch', data)).rejects.toThrow('Network lost');
    await adapter.reviewStockTransfer('transfer/one', 'dispatch', data);
    expect(fetchMock.mock.calls[0][0]).toMatch(/transfer%2Fone\/dispatch$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(data);
    expect(fetchMock.mock.calls[1][1].body).toEqual(fetchMock.mock.calls[0][1].body);
  });
});

describe('Python returns transport', () => {
  it('refreshes the quarantine version after a definite stale-decision rejection', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'changed', version: 0 }] })
      .mockResolvedValueOnce({ ok: false, status: 409, text: async () => JSON.stringify({ detail: 'Stale decision' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'changed', version: 1 }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'RESTOCKED' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    await expect(adapter.resolveQuarantine('store-a', 'changed', 'RESTOCK')).rejects.toThrow('Stale decision');
    await adapter.resolveQuarantine('store-a', 'changed', 'RESTOCK');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).expectedVersion).toBe(0);
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).expectedVersion).toBe(1);
  });
  it('loads persisted quarantine data and exposes authorization failures', async () => {
    const rows = [{ id: 'held', version: 2, quantity: 1, status: 'QUARANTINED' }];
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => rows })
      .mockResolvedValue({ ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Access denied' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    expect(await adapter.getQuarantinedItems('store-a')).toEqual(rows);
    await expect(adapter.getQuarantinedItems('store-a')).rejects.toThrow('Access denied');
  });

  it('replays a quarantine decision after an uncertain response without needing a still-pending row', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true,
      json: async () => [{ id: 'held-retry', version: 2 }] }).mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'RESTOCKED' }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(new PythonRESTAdapter().resolveQuarantine('store-a', 'held-retry', 'RESTOCK')).rejects.toThrow('Network lost');
    await new PythonRESTAdapter().resolveQuarantine('store-a', 'held-retry', 'RESTOCK');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const first = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(first.expectedVersion).toBe(2);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(first);
  });

  it('sends explicit return versions, receipt IDs and write-off references', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'return' }) });
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new PythonRESTAdapter();
    await adapter.receiveReturn('return', 1, 'arrival', [{ layerId: 'source-layer', quantity: 1 }]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expectedVersion: 1, receiptId: 'arrival',
      items: [{ layerId: 'source-layer', quantity: 1 }] });
    await adapter.writeOffStock({ sku: 'A', quantity: 1, expectedVersion: 3, reasonCode: 'DAMAGE', reason: 'Broken', mutationId: 'loss' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/returns\/write-offs$/);
  });
});

describe('Python procurement transport', () => {
  it('reuses a PO creation mutation ID after an uncertain response', async () => {
    const supplier = { ok: true, json: async () => [{ id: 'vendor-retry', name: 'Retry vendor', isActive: true }] };
    const fetchMock = vi.fn().mockResolvedValueOnce(supplier).mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValueOnce(supplier).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'po' }) });
    vi.stubGlobal('fetch', fetchMock);
    const lines = [{ sku: 'A', quantity: 10, unitCostCents: 100 }];
    await expect(new PythonRESTAdapter().createPurchaseOrder('store-a', 'Retry vendor', lines)).rejects.toThrow('Network lost');
    await new PythonRESTAdapter().createPurchaseOrder('store-a', 'Retry vendor', lines);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).mutationId).toBe(JSON.parse(fetchMock.mock.calls[3][1].body).mutationId);
  });
  it('resolves the shared form supplier name to an owned supplier ID', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true,
      json: async () => [{ id: 'supplier-a', name: 'Wholesale', isActive: true }] })
      .mockResolvedValue({ ok: true, json: async () => ({ id: 'new-order' }) });
    vi.stubGlobal('fetch', fetchMock);
    await new PythonRESTAdapter().createPurchaseOrder('store-a', 'Wholesale',
      [{ sku: 'A', quantity: 10, unitCostCents: 100 }]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).supplierId).toBe('supplier-a');
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/purchase-orders$/);
  });
  it('loads server orders without a browser ID list', async () => {
    const orders = [{ id: 'server-po', status: 'partially_received' }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => orders });
    vi.stubGlobal('fetch', fetchMock);
    expect(await new PythonRESTAdapter().getPurchaseOrders('store-a')).toEqual(orders);
    expect(fetchMock.mock.calls[0][0]).toContain('/purchase-orders?tenantId=store-a');
    expect(fetchMock.mock.calls[0][0]).not.toContain('ids=');
  });

  it('surfaces procurement and policy failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403,
      text: async () => JSON.stringify({ detail: 'Access denied' }) }));
    const adapter = new PythonRESTAdapter();
    await expect(adapter.getPurchaseOrders('store-a')).rejects.toThrow('Access denied');
    await expect(adapter.getReorderPolicies('store-a')).rejects.toThrow('Access denied');
  });

  it('retains a receipt ID after an uncertain failure, including a new adapter instance', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'partially_received' }) });
    vi.stubGlobal('fetch', fetchMock);
    const lines = [{ sku: 'A', quantity: 4 }];
    await expect(new PythonRESTAdapter().receivePurchaseOrder('store-a', 'po', lines)).rejects.toThrow('Network lost');
    await new PythonRESTAdapter().receivePurchaseOrder('store-a', 'po', lines);
    await new PythonRESTAdapter().receivePurchaseOrder('store-a', 'po', lines);
    const ids = fetchMock.mock.calls.map(call => JSON.parse(call[1].body).receiptId);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
  });
});

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
