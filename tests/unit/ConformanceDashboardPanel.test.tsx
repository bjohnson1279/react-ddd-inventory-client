import React from 'react';
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
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders initial state correctly', async () => {
    fetchMock.mockResolvedValue({ ok: true });

    render(<ConformanceDashboardPanel tenantId="test-tenant" />);

    await act(async () => {
      await Promise.resolve();
    });

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
  });
});
