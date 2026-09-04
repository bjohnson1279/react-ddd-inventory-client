import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CycleCountDashboardPanel } from './CycleCountDashboardPanel';
import * as clientApi from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual as any,
    useInventory: vi.fn(),
  };
});

describe('CycleCountDashboardPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no cycle counts', async () => {
    vi.mocked(clientApi.useInventory).mockReturnValue({
      client: {
        getCycleCounts: vi.fn().mockResolvedValue([]),
      }
    } as any);

    render(<CycleCountDashboardPanel tenantId="test-tenant" />);

    expect(screen.getByText('Cycle Counting')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('No active cycle counts')).toBeInTheDocument();
    });
  });

  it('renders populated state with cycle counts', async () => {
    const mockCounts = [
      { id: '1', name: 'Electronics Section', status: 'In Progress' },
      { id: '2', name: 'Apparel Section', status: 'Pending' }
    ];

    vi.mocked(clientApi.useInventory).mockReturnValue({
      client: {
        getCycleCounts: vi.fn().mockResolvedValue(mockCounts),
      }
    } as any);

    render(<CycleCountDashboardPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Electronics Section')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Apparel Section')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    const submitButtons = screen.getAllByText('Submit');
    expect(submitButtons).toHaveLength(2);
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(clientApi.useInventory).mockReturnValue({
      client: {
        getCycleCounts: vi.fn().mockRejectedValue(new Error('Network error')),
      }
    } as any);

    render(<CycleCountDashboardPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
