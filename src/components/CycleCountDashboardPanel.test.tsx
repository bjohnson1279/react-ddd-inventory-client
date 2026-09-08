import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CycleCountDashboardPanel } from './CycleCountDashboardPanel';
import * as clientApi from '../api/client';

vi.mock('../api/client', () => ({
  useInventory: vi.fn()
}));

describe('CycleCountDashboardPanel', () => {
  const mockGetCycleCounts = vi.fn();
  const mockClient = { getCycleCounts: mockGetCycleCounts };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientApi.useInventory).mockReturnValue({ client: mockClient as any } as any);
  });

  it('renders initial empty state and fetches data', async () => {
    mockGetCycleCounts.mockResolvedValueOnce([]);

    render(<CycleCountDashboardPanel tenantId="t1" />);

    expect(screen.getByText('Cycle Counting')).toBeInTheDocument();
    expect(screen.getByText('Start Count')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetCycleCounts).toHaveBeenCalledWith('t1');
    });

    expect(screen.getByText('No active cycle counts')).toBeInTheDocument();
  });

  it('renders cycle counts correctly', async () => {
    const mockCounts = [
      { id: '1', name: 'Count A', status: 'PENDING' },
      { id: '2', name: 'Count B', status: 'IN_PROGRESS' }
    ];
    mockGetCycleCounts.mockResolvedValueOnce(mockCounts);

    render(<CycleCountDashboardPanel tenantId="t1" />);

    await waitFor(() => {
      expect(screen.getByText('Count A')).toBeInTheDocument();
    });

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('Count B')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();

    const submitButtons = screen.getAllByText('Submit');
    expect(submitButtons.length).toBe(2);
  });

  it('handles API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCycleCounts.mockRejectedValueOnce(new Error('API Error'));

    render(<CycleCountDashboardPanel tenantId="t1" />);

    await waitFor(() => {
      expect(mockGetCycleCounts).toHaveBeenCalledWith('t1');
    });

    expect(screen.getByText('No active cycle counts')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
