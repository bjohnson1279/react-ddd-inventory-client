import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { useInventory } from '../../src/api/client';
import { getQueuedScans, syncOfflineQueue } from '../../src/api/offlineQueue';

vi.mock('../../src/api/client', async (original) => ({
  ...await original<typeof import('../../src/api/client')>(),
  useInventory: vi.fn(),
}));
vi.mock('../../src/api/offlineQueue', () => ({
  getQueuedScans: vi.fn(), syncOfflineQueue: vi.fn(), addScanToQueue: vi.fn(),
}));

const jwt = `header.${btoa(JSON.stringify({ permissions: [] }))}.signature`;
let api: Record<string, ReturnType<typeof vi.fn>>;
let switchBackend: ReturnType<typeof vi.fn>;

function session(role = 'admin') {
  localStorage.setItem('auth_token', jwt);
  localStorage.setItem('auth_role', role);
  localStorage.setItem('auth_tenant', 'store-42');
  localStorage.setItem('auth_actor', 'operator-42');
}
function mount(backendType = 'express') {
  vi.mocked(useInventory).mockReturnValue({ client: api as any, backendType: backendType as any, setBackendType: switchBackend });
  return render(<App />);
}
async function ready() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());
}

beforeEach(() => {
  vi.clearAllMocks();
  api = Object.fromEntries(['getInventoryItems', 'getProducts', 'getShopifyConnections', 'getJournalEntries',
    'getStockOnboardings', 'getForecastingReport', 'getReorderPolicies', 'getWarehouseLocations',
  ].map(name => [name, vi.fn().mockResolvedValue([])]));
  api.login = vi.fn().mockResolvedValue(jwt);
  api.subscribeBarcodeScans = vi.fn().mockReturnValue(vi.fn());
  switchBackend = vi.fn();
  vi.mocked(getQueuedScans).mockResolvedValue([]);
  vi.mocked(syncOfflineQueue).mockResolvedValue({ successCount: 0, failedCount: 0 });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'healthy' }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('application authentication and navigation', () => {
  it('keeps local and session storage independent', () => {
    localStorage.setItem('auth_token', 'local');
    sessionStorage.setItem('auth_token', 'session');
    sessionStorage.clear();
    expect(localStorage.getItem('auth_token')).toBe('local');
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('does not load protected data before login and delegates backend selection', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'System Authentication' })).toBeInTheDocument();
    expect(api.getInventoryItems).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Backend API Node:'), { target: { value: 'python' } });
    expect(switchBackend).toHaveBeenCalledWith('python');
  });

  it('authenticates with entered credentials, persists identity, and clears it on logout', async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Tenant ID'), { target: { value: 'store-42' } });
    fireEvent.change(screen.getByLabelText('Actor ID / Email'), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText('Assigned Role'), { target: { value: 'accountant' } });
    fireEvent.change(screen.getByLabelText('Secure Key / Password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate Credentials' }));
    await ready();
    expect(api.login).toHaveBeenCalledWith('store-42', 'buyer@example.com', 'accountant', 'test-password');
    expect(localStorage.getItem('auth_token')).toBe(jwt);
    expect(localStorage.getItem('auth_role')).toBe('accountant');
    expect(localStorage.getItem('auth_tenant')).toBe('store-42');
    expect(localStorage.getItem('auth_actor')).toBe('buyer@example.com');
    fireEvent.click(screen.getByRole('button', { name: /Logout Session/ }));
    expect(screen.getByRole('heading', { name: 'System Authentication' })).toBeInTheDocument();
    for (const key of ['auth_token', 'auth_role', 'auth_tenant', 'auth_actor']) expect(localStorage.getItem(key)).toBeNull();
  });

  it('reports rejected credentials without persisting a session and permits retry', async () => {
    api.login.mockRejectedValueOnce(new Error('Credentials rejected'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate Credentials' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Credentials rejected'));
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(api.getInventoryItems).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate Credentials' }));
    await ready();
    expect(api.login).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['viewer', false, false], ['warehouse_operator', true, false], ['accountant', false, true], ['admin', true, true],
  ])('shows permitted workflows for %s', async (role, scanning, ledger) => {
    session(role); mount(); await ready();
    expect(!!screen.queryByText(/Barcode Workflows/)).toBe(scanning);
    expect(!!screen.queryByText(/General Ledger/)).toBe(ledger);
    expect(!!screen.queryByText(/Compliance Ledger/)).toBe(role === 'admin');
  });

  it.each(['viewer', 'warehouse_operator'])('does not request restricted Python financial/integration data for %s', async role => {
    session(role); mount('python'); await ready();
    expect(api.getInventoryItems).toHaveBeenCalled();
    expect(api.getShopifyConnections).not.toHaveBeenCalled();
    expect(api.getJournalEntries).not.toHaveBeenCalled();
    expect(screen.getByText('Restricted')).toBeInTheDocument();
  });

  it('loads Python journals but not integrations for an accountant', async () => {
    session('accountant'); mount('python'); await ready();
    expect(api.getJournalEntries).toHaveBeenCalledWith('store-42');
    expect(api.getShopifyConnections).not.toHaveBeenCalled();
  });

  it('shows a dashboard failure and recovers when stock is refreshed', async () => {
    session(); api.getInventoryItems.mockRejectedValueOnce(new Error('Inventory unavailable'));
    mount();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Inventory unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Stock' }));
    await ready();
    expect(api.getInventoryItems).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Real-time Stock Levels')).toBeInTheDocument();
  });

  it('loads tenant-scoped journals on ledger navigation instead of refreshing all inventory', async () => {
    session('accountant'); mount(); await ready();
    api.getInventoryItems.mockClear(); api.getJournalEntries.mockClear();
    fireEvent.click(screen.getByText(/General Ledger/));
    await waitFor(() => expect(api.getJournalEntries).toHaveBeenCalledWith('store-42'));
    expect(api.getInventoryItems).not.toHaveBeenCalled();
  });

  it('reports offline mode and sync failures on reconnection', async () => {
    session(); mount(); await ready();
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('Network connection lost');
    vi.mocked(getQueuedScans).mockResolvedValue([{ id: 'scan-1' }] as any);
    vi.mocked(syncOfflineQueue).mockResolvedValue({ successCount: 0, failedCount: 1 });
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('0 synced, 1 failed'));
    expect(syncOfflineQueue).toHaveBeenCalledWith(api);
  });
});
