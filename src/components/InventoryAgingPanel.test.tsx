import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryAgingPanel } from './InventoryAgingPanel';
import { useInventory } from '../api/client';

vi.mock('../api/client', () => ({
  useInventory: vi.fn(),
}));

describe('InventoryAgingPanel', () => {
  const mockGenerateAgingReport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInventory).mockReturnValue({
      client: {
        generateAgingReport: mockGenerateAgingReport,
      },
    } as any);
  });

  it('renders loading state initially', async () => {
    mockGenerateAgingReport.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ buckets: [] }), 100)));

    const { container } = render(<InventoryAgingPanel tenantId="test-tenant" />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument());
  });

  it('renders empty state when there are no aging buckets', async () => {
    mockGenerateAgingReport.mockResolvedValue({ generatedAt: new Date().toISOString(), buckets: [] });

    render(<InventoryAgingPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('No aging data available. Your inventory is turning over healthily!')).toBeInTheDocument();
    });
  });

  it('renders aging data buckets when available', async () => {
    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      buckets: [
        { bucket: '0-30 days', quantity: 150, value: 150000 },
        { bucket: '31-60 days', quantity: 75, value: 80000 },
      ]
    });

    render(<InventoryAgingPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('0-30 days')).toBeInTheDocument();
      expect(screen.getByText('150 items')).toBeInTheDocument();
      expect(screen.getByText('$1500.00')).toBeInTheDocument();

      expect(screen.getByText('31-60 days')).toBeInTheDocument();
      expect(screen.getByText('75 items')).toBeInTheDocument();
      expect(screen.getByText('$800.00')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully and logs to console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerateAgingReport.mockRejectedValue(new Error('Network error'));

    render(<InventoryAgingPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
