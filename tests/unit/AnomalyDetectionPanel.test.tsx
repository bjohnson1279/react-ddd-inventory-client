import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetectionPanel } from '../../src/components/AnomalyDetectionPanel';
import { InventoryClient } from '../../src/api/client';

const mockAnalyzeInventoryAnomalies = vi.fn();

const mockApi = {
  analyzeInventoryAnomalies: mockAnalyzeInventoryAnomalies,
} as unknown as InventoryClient;

const mockData = {
  overallRiskScore: 85,
  totalCritical: 1,
  totalHigh: 2,
  totalMedium: 3,
  totalLow: 4,
  alerts: [
    { severity: 'CRITICAL', title: 'Critical Alert', description: 'Desc 1', sku: 'SKU1', locationId: 'LOC1', actorId: 'ACT1', confidence: 95, evidence: 'Evidence 1', detectedAt: new Date().toISOString() },
    { severity: 'HIGH', title: 'High Alert', description: 'Desc 2', sku: 'SKU2', locationId: 'LOC2', actorId: 'ACT2', confidence: 80, evidence: 'Evidence 2', detectedAt: new Date().toISOString() },
    { severity: 'MEDIUM', title: 'Medium Alert', description: 'Desc 3', sku: 'SKU3', locationId: 'LOC3', actorId: 'ACT3', confidence: 60, evidence: 'Evidence 3', detectedAt: new Date().toISOString() },
    { severity: 'LOW', title: 'Low Alert', description: 'Desc 4', sku: 'SKU4', locationId: 'LOC4', actorId: 'ACT4', confidence: 40, evidence: 'Evidence 4', detectedAt: new Date().toISOString() },
  ],
  actorRisks: [
    { actorId: 'ACT1', riskScore: 90 },
    { actorId: 'ACT2', riskScore: 70 },
  ],
};

describe('AnomalyDetectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    // Return a promise that doesn't resolve immediately to check loading state
    mockAnalyzeInventoryAnomalies.mockReturnValue(new Promise(() => {}));

    const { container } = render(<AnomalyDetectionPanel api={mockApi} />);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(container.querySelector('.ai-skeleton')).toBeInTheDocument();
  });

  it('renders data correctly after successful fetch', async () => {
    mockAnalyzeInventoryAnomalies.mockResolvedValue(mockData);

    render(<AnomalyDetectionPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText('Analyze Now')).toBeInTheDocument();
    });

    // Check summaries
    expect(screen.getByText('Overall Risk')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();

    const criticalCount = screen.getByText('1');
    expect(criticalCount).toHaveClass('severity-count critical');

    const highCount = screen.getByText('2');
    expect(highCount).toHaveClass('severity-count high');

    const mediumCount = screen.getByText('3');
    expect(mediumCount).toHaveClass('severity-count medium');

    const lowCount = screen.getByText('4');
    expect(lowCount).toHaveClass('severity-count low');

    // Check sections
    expect(screen.getByText('Anomaly Alert Feed')).toBeInTheDocument();
    expect(screen.getByText('Actor Risk Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Temporal Pattern Timeline')).toBeInTheDocument();

    // Check alerts
    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    expect(screen.getByText('High Alert')).toBeInTheDocument();
    expect(screen.getByText('Medium Alert')).toBeInTheDocument();
    expect(screen.getByText('Low Alert')).toBeInTheDocument();
  });

  it('renders error state and handles retry', async () => {
    const errorMsg = 'Mocked network error';
    mockAnalyzeInventoryAnomalies.mockRejectedValueOnce(new Error(errorMsg));
    mockAnalyzeInventoryAnomalies.mockResolvedValueOnce(mockData);

    render(<AnomalyDetectionPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });

    expect(mockAnalyzeInventoryAnomalies).toHaveBeenCalledTimes(2);
  });

  it('filters alerts based on severity', async () => {
    mockAnalyzeInventoryAnomalies.mockResolvedValue(mockData);

    render(<AnomalyDetectionPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });

    // Click Critical filter
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }));

    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    expect(screen.queryByText('High Alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Medium Alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Alert')).not.toBeInTheDocument();

    // Click High filter
    fireEvent.click(screen.getByRole('button', { name: 'High' }));

    expect(screen.queryByText('Critical Alert')).not.toBeInTheDocument();
    expect(screen.getByText('High Alert')).toBeInTheDocument();

    // Click All filter
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    expect(screen.getByText('High Alert')).toBeInTheDocument();
  });

  it('expands alert card to show evidence', async () => {
    mockAnalyzeInventoryAnomalies.mockResolvedValue(mockData);

    render(<AnomalyDetectionPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });

    const criticalCard = screen.getByText('Critical Alert').closest('.alert-card');
    expect(screen.queryByText('Evidence 1')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(criticalCard!);

    expect(screen.getByText('Evidence 1')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(criticalCard!);

    expect(screen.queryByText('Evidence 1')).not.toBeInTheDocument();

    // Keydown (Enter) to expand
    fireEvent.keyDown(criticalCard!, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Evidence 1')).toBeInTheDocument();

    // Keydown (Space) to collapse
    fireEvent.keyDown(criticalCard!, { key: ' ', code: 'Space' });
    expect(screen.queryByText('Evidence 1')).not.toBeInTheDocument();
  });
});
