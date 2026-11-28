import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryAgingPanel } from '../../src/components/InventoryAgingPanel';
import { InventoryClientContext } from '../../src/api/client';

describe('InventoryAgingPanel in tests/unit', () => {
  const mockGenerateAgingReport = vi.fn();

  const mockClient = {
    generateAgingReport: mockGenerateAgingReport,
  };

  const renderWithProvider = (component: React.ReactNode) => {
    return render(
      <InventoryClientContext.Provider
        value={{
          client: mockClient as any,
          backendType: 'express',
          setBackendType: vi.fn(),
        }}
      >
        {component}
      </InventoryClientContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton state initially while report is null', async () => {
    mockGenerateAgingReport.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ buckets: [] }), 50))
    );

    const { container } = renderWithProvider(<InventoryAgingPanel tenantId="tenant-alpha" />);

    expect(screen.getByText('Inventory Aging')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
    expect(mockGenerateAgingReport).toHaveBeenCalledWith('tenant-alpha');
  });

  it('renders aging buckets with proper count, formatted currency, and generatedAt date', async () => {
    const timestamp = '2025-05-10T12:00:00.000Z';
    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: timestamp,
      buckets: [
        { bucket: '0-30 days', quantity: 120, value: 245000 },
        { bucket: '31-60 days', quantity: 45, value: 89050 },
        { bucket: '61-90 days', quantity: 15, value: 31000 },
      ],
    });

    renderWithProvider(<InventoryAgingPanel tenantId="tenant-alpha" />);

    await waitFor(() => {
      expect(screen.getByText('0-30 days')).toBeInTheDocument();
    });

    expect(screen.getByText('120 items')).toBeInTheDocument();
    expect(screen.getByText('$2450.00')).toBeInTheDocument();

    expect(screen.getByText('31-60 days')).toBeInTheDocument();
    expect(screen.getByText('45 items')).toBeInTheDocument();
    expect(screen.getByText('$890.50')).toBeInTheDocument();

    expect(screen.getByText('61-90 days')).toBeInTheDocument();
    expect(screen.getByText('15 items')).toBeInTheDocument();
    expect(screen.getByText('$310.00')).toBeInTheDocument();

    expect(
      screen.getByText(`Generated at: ${new Date(timestamp).toLocaleString()}`)
    ).toBeInTheDocument();
  });

  it('renders empty state when aging report has empty buckets array', async () => {
    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: '2025-05-10T12:00:00.000Z',
      buckets: [],
    });

    renderWithProvider(<InventoryAgingPanel tenantId="tenant-beta" />);

    await waitFor(() => {
      expect(
        screen.getByText('No aging data available. Your inventory is turning over healthily!')
      ).toBeInTheDocument();
    });
  });

  it('renders empty state when aging report has undefined buckets', async () => {
    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: '2025-05-10T12:00:00.000Z',
    });

    renderWithProvider(<InventoryAgingPanel tenantId="tenant-beta" />);

    await waitFor(() => {
      expect(
        screen.getByText('No aging data available. Your inventory is turning over healthily!')
      ).toBeInTheDocument();
    });
  });

  it('handles client rejection gracefully and logs error to console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('Failed to generate aging report');
    mockGenerateAgingReport.mockRejectedValue(networkError);

    renderWithProvider(<InventoryAgingPanel tenantId="tenant-gamma" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(networkError);
    });

    consoleSpy.mockRestore();
  });

  it('refetches aging report when tenantId prop changes', async () => {
    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: '2025-05-10T12:00:00.000Z',
      buckets: [{ bucket: '0-30 days', quantity: 50, value: 10000 }],
    });

    const { rerender } = renderWithProvider(<InventoryAgingPanel tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('50 items')).toBeInTheDocument();
    });
    expect(mockGenerateAgingReport).toHaveBeenCalledTimes(1);
    expect(mockGenerateAgingReport).toHaveBeenCalledWith('tenant-1');

    mockGenerateAgingReport.mockResolvedValue({
      generatedAt: '2025-05-10T13:00:00.000Z',
      buckets: [{ bucket: '0-30 days', quantity: 99, value: 20000 }],
    });

    rerender(
      <InventoryClientContext.Provider
        value={{
          client: mockClient as any,
          backendType: 'express',
          setBackendType: vi.fn(),
        }}
      >
        <InventoryAgingPanel tenantId="tenant-2" />
      </InventoryClientContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('99 items')).toBeInTheDocument();
    });
    expect(mockGenerateAgingReport).toHaveBeenCalledTimes(2);
    expect(mockGenerateAgingReport).toHaveBeenCalledWith('tenant-2');
  });
});
