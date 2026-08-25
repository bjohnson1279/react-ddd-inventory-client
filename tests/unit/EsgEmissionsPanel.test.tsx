import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EsgEmissionsPanel } from '../../src/components/EsgEmissionsPanel';

const mockReport = {
  totalEmissionsCo2eKg: 10000,
  transportEmissionsCo2eKg: 5000,
  facilityEmissionsCo2eKg: 5000,
  emissionsIntensityPerOrder: 10,
  breakdownByMode: {
    air: 2000,
    groundExpress: 2000,
    ltl: 1000
  }
};

describe('EsgEmissionsPanel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // We can simulate an unresolved promise to check loading state
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(<EsgEmissionsPanel />);
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('fetches data successfully via global fetch', async () => {
    (global.fetch as vi.Mock).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockReport),
    });

    render(<EsgEmissionsPanel />);

    await waitFor(() => {
      expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('10,000 kg')).toBeInTheDocument(); // totalEmissionsCo2eKg
    expect(screen.getByText('Scope 3 Transport Freight')).toBeInTheDocument();
  });

  it('fetches data successfully via api prop', async () => {
    const mockApi = {
      getEsgEmissionsReport: vi.fn().mockResolvedValue(mockReport),
    };

    render(<EsgEmissionsPanel api={mockApi} />);

    await waitFor(() => {
      expect(mockApi.getEsgEmissionsReport).toHaveBeenCalledWith({ tenantId: 'tenant-1' });
    });

    expect(screen.getByText('10,000 kg')).toBeInTheDocument();
  });

  it('handles fetch errors correctly', async () => {
    (global.fetch as vi.Mock).mockRejectedValue(new Error('API Error'));

    render(<EsgEmissionsPanel />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('refetches data when refresh button is clicked', async () => {
    (global.fetch as vi.Mock).mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockReport),
    });

    render(<EsgEmissionsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Refresh ESG Metrics')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh ESG Metrics');
    fireEvent.click(refreshButton);

    expect(screen.getByText('Refreshing...')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial fetch + refresh
    });
  });
});
