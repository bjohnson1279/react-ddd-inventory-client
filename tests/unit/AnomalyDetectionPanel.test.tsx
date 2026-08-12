import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetectionPanel } from '../../src/components/AnomalyDetectionPanel';
import { InventoryClient } from '../../src/api/client';

describe('AnomalyDetectionPanel', () => {
  let mockApi: Partial<InventoryClient>;

  beforeEach(() => {
    mockApi = {
      analyzeInventoryAnomalies: vi.fn(),
    };
  });

  const renderComponent = () => render(<AnomalyDetectionPanel api={mockApi as InventoryClient} />);

  it('renders loading state initially', async () => {
    // Delay the resolution to ensure we can see the loading state
    mockApi.analyzeInventoryAnomalies = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderComponent();

    // Before resolving, it should show loading text
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    // Wait for promise to settle so we don't leak act warnings
    await waitFor(() => {
      expect(screen.getByText('Analyze Now')).toBeInTheDocument();
    });
  });

  it('renders error state when API fails', async () => {
    mockApi.analyzeInventoryAnomalies = vi.fn().mockRejectedValue(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    expect(retryBtn).toBeInTheDocument();

    // Test retry functionality
    fireEvent.click(retryBtn);
    expect(mockApi.analyzeInventoryAnomalies).toHaveBeenCalledTimes(2);
  });

  it('renders anomaly data when API succeeds', async () => {
    const mockData = {
      totalCritical: 5,
      totalHigh: 12,
      totalMedium: 8,
      totalLow: 3,
      overallRiskScore: 85,
      alerts: [],
      actorRisks: [
        { actorId: 'actor-1', riskScore: 90 }
      ]
    };
    mockApi.analyzeInventoryAnomalies = vi.fn().mockResolvedValue(mockData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Anomaly Alert Feed')).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();

    // Check actor risk
    expect(screen.getByText('actor-1')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('filters alerts correctly', async () => {
    const mockData = {
      totalCritical: 1,
      totalHigh: 1,
      alerts: [
        { severity: 'CRITICAL', title: 'Critical Alert', description: 'Desc 1', confidence: 99 },
        { severity: 'HIGH', title: 'High Alert', description: 'Desc 2', confidence: 80 }
      ],
      actorRisks: []
    };
    mockApi.analyzeInventoryAnomalies = vi.fn().mockResolvedValue(mockData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    });
    expect(screen.getByText('High Alert')).toBeInTheDocument();

    // Click Critical filter
    fireEvent.click(screen.getByRole('button', { name: 'Critical' }));

    expect(screen.getByText('Critical Alert')).toBeInTheDocument();
    expect(screen.queryByText('High Alert')).not.toBeInTheDocument();

    // Click Low filter (empty state)
    fireEvent.click(screen.getByRole('button', { name: 'Low' }));
    expect(screen.getByText('No alerts found for this filter.')).toBeInTheDocument();
  });

  it('expands alert card to show evidence via click and keyboard', async () => {
    const mockData = {
      alerts: [
        {
          severity: 'CRITICAL',
          title: 'Suspicious Activity',
          description: 'Test desc',
          confidence: 100,
          evidence: 'Found 5 deleted records'
        }
      ]
    };
    mockApi.analyzeInventoryAnomalies = vi.fn().mockResolvedValue(mockData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Suspicious Activity')).toBeInTheDocument();
    });

    const alertCard = screen.getByText('Suspicious Activity').closest('div[role="button"]') as HTMLElement;

    // Initially evidence is hidden
    expect(screen.queryByText('Found 5 deleted records')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(alertCard);
    expect(screen.getByText('Found 5 deleted records')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(alertCard);
    expect(screen.queryByText('Found 5 deleted records')).not.toBeInTheDocument();

    // Keyboard (Enter) to expand
    fireEvent.keyDown(alertCard, { key: 'Enter', code: 'Enter' });
    expect(screen.getByText('Found 5 deleted records')).toBeInTheDocument();

    // Keyboard (Space) to collapse
    fireEvent.keyDown(alertCard, { key: ' ', code: 'Space' });
    expect(screen.queryByText('Found 5 deleted records')).not.toBeInTheDocument();
  });

  it('renders empty actor risk state', async () => {
    const mockData = {
      alerts: [],
      actorRisks: []
    };
    mockApi.analyzeInventoryAnomalies = vi.fn().mockResolvedValue(mockData);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No actor risk data available.')).toBeInTheDocument();
    });
  });
});
