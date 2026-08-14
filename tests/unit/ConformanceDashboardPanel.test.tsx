import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ConformanceDashboardPanel } from '../../src/components/ConformanceDashboardPanel';

const mockTenantId = 'tenant-123';

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

    act(() => {
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

    await act(async () => {
      fireEvent.click(compareBtn);
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

  });
});
