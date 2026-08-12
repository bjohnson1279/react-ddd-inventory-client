import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RebalancingMatrixPanel } from '../../src/components/RebalancingMatrixPanel';
import { InventoryClient } from '../../src/api/client';

const mockApi = {
  getRebalanceMatrix: vi.fn(),
} as unknown as InventoryClient;

describe('RebalancingMatrixPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and fetches data on mount', async () => {
    (mockApi.getRebalanceMatrix as any).mockResolvedValue({
      summary: {
        warehouses: [
          { warehouseId: 'WH-1', region: 'North', healthStatus: 'HEALTHY', totalSkus: 100, avgDoc: 30, surplusCount: 5, deficitCount: 2 }
        ],
        totalEstimatedShippingCost: 500,
        skusImproved: 10,
        avgDocImprovement: 5
      },
      recommendations: [
        { sku: 'SKU-A', sourceWarehouseId: 'WH-1', destWarehouseId: 'WH-2', priority: 'HIGH', quantity: 50, estimatedShippingCost: 100, destCurrentDoc: 10, destProjectedDoc: 15, urgencyReason: 'Low stock' }
      ],
      matrix: {
        warehouses: ['WH-1', 'WH-2'],
        rows: [
          { sku: 'SKU-A', cells: [{ doc: 30, onHand: 100, velocity: 10 }, { doc: 10, onHand: 20, velocity: 2 }] }
        ]
      }
    });

    render(<RebalancingMatrixPanel api={mockApi} />);

    // Initially, it might show "Calculating..."
    expect(screen.getByText(/Rebalancing Matrix/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(mockApi.getRebalanceMatrix).toHaveBeenCalledWith('default-tenant');
    });

    expect(await screen.findByText('Cost-Benefit Summary')).toBeInTheDocument();
    expect(screen.getByText('Total SKUs')).toBeInTheDocument();
    expect(screen.getAllByText('WH-1')[0]).toBeInTheDocument(); // Multiple instances in matrix and flow
    expect(screen.getAllByText('SKU-A')[0]).toBeInTheDocument(); // Multiple instances
    expect(screen.getByText('Execute Transfer')).toBeInTheDocument();
  });

  it('displays loading state correctly', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    (mockApi.getRebalanceMatrix as any).mockReturnValue(promise);

    render(<RebalancingMatrixPanel api={mockApi} />);

    expect(screen.getByText('Calculating...')).toBeInTheDocument();

    // Cleanup
    resolvePromise({ summary: {}, recommendations: [], matrix: {} });
    await waitFor(() => expect(screen.getByText('Calculate Matrix')).toBeInTheDocument());
  });

  it('handles error state and retry functionality', async () => {
    (mockApi.getRebalanceMatrix as any)
      .mockRejectedValueOnce(new Error('Matrix calculation failed'))
      .mockResolvedValueOnce({ summary: {}, recommendations: [], matrix: {} });

    render(<RebalancingMatrixPanel api={mockApi} />);

    // Wait for the error to appear
    expect(await screen.findByText('Matrix calculation failed')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText('Retry'));

    // Should fetch again
    await waitFor(() => {
      expect(mockApi.getRebalanceMatrix).toHaveBeenCalledTimes(2);
    });

    // Error should be gone
    await waitFor(() => {
      expect(screen.queryByText('Matrix calculation failed')).not.toBeInTheDocument();
    });
  });

  it('handles "Execute Transfer" click', async () => {
    window.alert = vi.fn();
    (mockApi.getRebalanceMatrix as any).mockResolvedValue({
      summary: {},
      recommendations: [
        { sku: 'SKU-TEST', sourceWarehouseId: 'WH-1', destWarehouseId: 'WH-2', priority: 'HIGH', quantity: 50, estimatedShippingCost: 100, destCurrentDoc: 10, destProjectedDoc: 15, urgencyReason: 'Low stock' }
      ],
      matrix: {}
    });

    render(<RebalancingMatrixPanel api={mockApi} />);

    const executeBtn = await screen.findByText('Execute Transfer');
    fireEvent.click(executeBtn);

    expect(window.alert).toHaveBeenCalledWith('Executing transfer for SKU-TEST');
  });

  it('handles empty recommendations gracefully', async () => {
    (mockApi.getRebalanceMatrix as any).mockResolvedValue({
      summary: {},
      recommendations: [],
      matrix: {}
    });

    render(<RebalancingMatrixPanel api={mockApi} />);

    expect(await screen.findByText('No transfers recommended at this time.')).toBeInTheDocument();
  });
});
