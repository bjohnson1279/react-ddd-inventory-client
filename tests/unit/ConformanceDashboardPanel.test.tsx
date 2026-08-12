import React from 'react';
<<<<<<< HEAD
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ConformanceDashboardPanel } from '../../src/components/ConformanceDashboardPanel';

const mockTenantId = 'tenant-123';

describe('ConformanceDashboardPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
=======
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ConformanceDashboardPanel } from '../../src/components/ConformanceDashboardPanel';

describe('ConformanceDashboardPanel', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Mock performance.now for latency calculations
    const performanceMock = vi.spyOn(performance, 'now');
    let callCount = 0;
    performanceMock.mockImplementation(() => {
        callCount++;
        return callCount * 10;
    });
>>>>>>> origin/main
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

<<<<<<< HEAD
  it('renders initial dashboard structure and runs health check', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    expect(screen.getByText('Cross-Backend Conformance')).toBeInTheDocument();

    // Use fake timer to clear the initial fetch effect
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const onlineStatuses = screen.getAllByText('🟢 Online');
    expect(onlineStatuses).toHaveLength(3);
  });

  it('performs manual health refresh and handles offline status', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    (global.fetch as Mock).mockClear();
    (global.fetch as Mock).mockRejectedValue(new Error('Connection failed'));

    const refreshBtn = screen.getByRole('button', { name: 'Refresh' });

    act(() => {
      fireEvent.click(refreshBtn);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const offlineStatuses = screen.getAllByText('🔴 Offline');
    expect(offlineStatuses).toHaveLength(3);
  });

  it('handles polling interval updates', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    (global.fetch as Mock).mockClear();

    const selects = screen.getAllByRole('combobox');
    const pollingSelect = selects[0]; // Assuming it's the first select

    await act(async () => {
      fireEvent.change(pollingSelect, { target: { value: '5' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      // Wait for any pending promises triggered by the interval to resolve
      await Promise.resolve();
      await vi.runOnlyPendingTimersAsync();
    });

    // We expect fetch to be called for the 3 endpoints after 5 seconds
    expect((global.fetch as Mock).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('displays conformance parity static data', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Inventory CRUD')).toBeInTheDocument();
    expect(screen.getByText('Accounting Ledger')).toBeInTheDocument();
    expect(screen.getByText('Compliance Rules')).toBeInTheDocument();

    expect(screen.getByText('98.6%')).toBeInTheDocument();
  });

  it('performs API comparison', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    (global.fetch as Mock).mockClear();

    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'GraphQL Data' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'Express Data' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'PHP Data' }) });

    const compareBtn = screen.getByRole('button', { name: 'Compare Across Backends' });

    act(() => {
      fireEvent.click(compareBtn);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText(/GraphQL Data/)).toBeInTheDocument();
    expect(screen.getByText(/Express Data/)).toBeInTheDocument();
    expect(screen.getByText(/PHP Data/)).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('handles API comparison errors gracefully', async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId={mockTenantId} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    (global.fetch as Mock).mockClear();

    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) // GraphQL
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) // Express
      .mockRejectedValueOnce(new Error('Network error')); // PHP

    const selects = screen.getAllByRole('combobox');
    const operationSelect = selects[1];

    act(() => {
      fireEvent.change(operationSelect, { target: { value: 'compliance' } });
    });

    const compareBtn = screen.getByRole('button', { name: 'Compare Across Backends' });

    act(() => {
      fireEvent.click(compareBtn);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const errorBoxes = screen.getAllByText(/"error":\s*"Failed"/);
    expect(errorBoxes.length).toBeGreaterThan(0);
    expect(screen.getByText(/"error":\s*"Network error"/)).toBeInTheDocument();
=======
  it('renders initial state correctly', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    expect(screen.getByText('Cross-Backend Conformance')).toBeInTheDocument();
    expect(screen.getByText('Live Backend Health')).toBeInTheDocument();

    // Check parity section
    expect(screen.getByText('Conformance Test Parity')).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();

    // Check API comparison section
    expect(screen.getByText('API Response Comparison')).toBeInTheDocument();
  });

  it('fetches health data on mount', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === 'http://localhost:4000') {
        return Promise.resolve({ ok: true });
      } else if (url === 'http://localhost:5000') {
        return Promise.resolve({ ok: true });
      } else {
        return Promise.reject(new Error('Failed to fetch'));
      }
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    // Since we're using fake timers and fetch is mocked as a resolved promise,
    // we just need to flush promises.
    await act(async () => {
        await Promise.resolve(); // wait for use effect promise
        await Promise.resolve(); // wait for fetch promise
        await Promise.resolve(); // wait for state update
    });

    // It should have completed the fetch and updated state
    expect(screen.getAllByText('🟢 Online').length).toBe(2);
    expect(screen.getByText('🔴 Offline')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('polls for health data based on interval', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    // Wait for the initial mount fetch to complete
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockClear();

    // Select 5s polling interval
    const selects = screen.getAllByRole('combobox');
    const select = selects[0]; // first combobox is polling interval

    await act(async () => {
      fireEvent.change(select, { target: { value: '5' } });
    });

    // When the polling interval changes, the useEffect is triggered again.
    // This will immediately call checkHealth() again and set up the interval.
    // We need to wait for this immediate fetch to resolve.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The immediate fetch within the new useEffect call means 3 fetches happen.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockClear();

    // Advance 5 seconds (5000ms) to trigger the first interval execution
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mockClear();

    // Advance another 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('performs API response comparison', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('graphql')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { inventoryItems: [] } })
        });
      } else if (url.includes('5000')) {
         return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] })
        });
      } else if (url.includes('8000')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });

    fetchMock.mockClear();

    const compareButton = screen.getByRole('button', { name: 'Compare Across Backends' });

    // Use select to pick an operation
    const selects = screen.getAllByRole('combobox');
    const compareSelect = selects[1];

    await act(async () => {
      fireEvent.change(compareSelect, { target: { value: 'inventory' } });
    });

    await act(async () => {
      fireEvent.click(compareButton);
    });

    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });

    // Check responses are rendered
    expect(screen.getByText(/inventoryItems/)).toBeInTheDocument();
    expect(screen.getByText(/items/)).toBeInTheDocument();
    expect(screen.getByText(/Failed/)).toBeInTheDocument(); // Expect PHP failure based on logic where !res.ok throws

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Check headers passed
    const graphqlCall = fetchMock.mock.calls.find(c => c[0] === 'http://localhost:4000/graphql');
    expect(graphqlCall[1].headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(graphqlCall[1].body)).toEqual({ query: 'query { inventoryItems { id sku quantity } }' });

    const restCall = fetchMock.mock.calls.find(c => c[0] === 'http://localhost:5000/api/inventory');
    expect(restCall[1].headers).toEqual({ 'Content-Type': 'application/json', 'tenant-id': 'test-tenant' });
>>>>>>> origin/main
  });
});
