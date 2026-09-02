import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RebalancingMatrixPanel } from './RebalancingMatrixPanel';

const mockApiData = {
  summary: {
    warehouses: [
      {
        warehouseId: 'WH-1',
        region: 'North',
        healthStatus: 'HEALTHY',
        totalSkus: 150,
        avgDoc: 20,
        surplusCount: 5,
        deficitCount: 2,
      },
    ],
    totalEstimatedShippingCost: 1500,
    skusImproved: 10,
    avgDocImprovement: 5,
  },
  recommendations: [
    {
      sourceWarehouseId: 'WH-1',
      destWarehouseId: 'WH-2',
      priority: 'HIGH',
      sku: 'SKU-123',
      quantity: 50,
      estimatedShippingCost: 100,
      destCurrentDoc: 4,
      destProjectedDoc: 14,
      urgencyReason: 'Stockout risk',
    },
  ],
  matrix: {
    warehouses: ['WH-1', 'WH-2'],
    rows: [
      {
        sku: 'SKU-123',
        cells: [
          { doc: 45, onHand: 100, velocity: 2 },
          { doc: 4, onHand: 10, velocity: 2.5 },
        ],
      },
    ],
  },
};

describe('RebalancingMatrixPanel', () => {
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      getRebalanceMatrix: vi.fn().mockResolvedValue(mockApiData),
    };

    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton and then successfully displays the matrix data', async () => {
    render(<RebalancingMatrixPanel api={mockApi} />);

    expect(screen.getByText('Rebalancing Matrix')).toBeInTheDocument();

    // Checking data loads correctly
    await waitFor(() => {
      expect(screen.getAllByText('WH-1').length).toBeGreaterThan(0);
    });

    // Check Warehouse Health Cards
    expect(screen.getByText('North')).toBeInTheDocument();

    // Check Cost-Benefit Summary
    expect(screen.getByText('Cost-Benefit Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Transfers')).toBeInTheDocument();

    // Using a regex to find $1500 which might be split across multiple nodes or have extra spaces
    expect(screen.getByText(/\$1500/)).toBeInTheDocument();

    // Check Transfer Recommendations
    expect(screen.getAllByText('SKU-123').length).toBeGreaterThan(0);
    expect(screen.getByText('Stockout risk')).toBeInTheDocument();

    // Check Matrix Grid
    expect(screen.getByText('Matrix Grid (DOC)')).toBeInTheDocument();
  });

  it('handles errors properly and provides a retry mechanism', async () => {
    mockApi.getRebalanceMatrix.mockRejectedValueOnce(new Error('Failed to fetch matrix'));

    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch matrix')).toBeInTheDocument();
    });

    // Dismiss error
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);

    await waitFor(() => {
        expect(screen.queryByText('Failed to fetch matrix')).not.toBeInTheDocument();
    });

    // Trigger failure again
    mockApi.getRebalanceMatrix.mockRejectedValueOnce(new Error('Second failure'));

    // Hit calculate button to retry
    const calcButton = screen.getByText('Calculate Matrix');
    fireEvent.click(calcButton);

    await waitFor(() => {
      expect(screen.getByText('Second failure')).toBeInTheDocument();
    });

    // Hit retry inside alert
    mockApi.getRebalanceMatrix.mockResolvedValueOnce(mockApiData);
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByText('Second failure')).not.toBeInTheDocument();
      expect(screen.getAllByText('WH-1').length).toBeGreaterThan(0);
    });
  });

  it('triggers an alert when executing a transfer', async () => {
    render(<RebalancingMatrixPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getAllByText('WH-1').length).toBeGreaterThan(0);
    });

    const executeButton = screen.getByText('Execute Transfer');
    fireEvent.click(executeButton);

    expect(window.alert).toHaveBeenCalledWith('Executing transfer for SKU-123');
  });
});
