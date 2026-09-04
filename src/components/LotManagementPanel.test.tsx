import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LotManagementPanel } from './Panels';

describe('LotManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    localStorage.setItem('auth_token', 'mock_token');
  });

  it('renders initial state correctly', () => {
    render(<LotManagementPanel />);
    expect(screen.getByText('🛡️ Lot Quarantine & Recall Traceability')).toBeInTheDocument();
    expect(screen.getByText('⚡ Dynamic Cross-Docking Evaluator')).toBeInTheDocument();
  });

  it('handles quarantine action successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      json: async () => ({ status: 'QUARANTINED' }),
    } as Response);
    render(<LotManagementPanel />);

    await user.click(screen.getByRole('button', { name: /quarantine lot/i }));

    await waitFor(() => {
      expect(screen.getByText('Lot LOT-2026-X updated to QUARANTINED')).toBeInTheDocument();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/lots/quarantine', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        lotNumber: 'LOT-2026-X',
        variantId: 'VAR-MED-100',
        reason: 'Quality defect inspection'
      })
    }));
  });

  it('generates trace report successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      json: async () => ({
        lotNumber: 'LOT-2026-X',
        status: 'ACTIVE',
        affectedOrders: ['ORD-1', 'ORD-2'],
        affectedCustomers: ['Cust A', 'Cust B']
      }),
    } as Response);
    render(<LotManagementPanel />);

    await user.click(screen.getByRole('button', { name: /generate trace report/i }));

    await waitFor(() => {
      expect(screen.getByText('Lot Lineage Traceability Report')).toBeInTheDocument();
    });
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // affectedOrders.length
    expect(screen.getByText('Cust A, Cust B')).toBeInTheDocument();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/lots/LOT-2026-X/traceability?variantId=VAR-MED-100', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer mock_token'
      })
    }));
  });

  it('evaluates cross-docking successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      json: async () => ([
        { destinationBay: 'BAY-01', recommendedCrossDockQuantity: 30 }
      ]),
    } as Response);
    render(<LotManagementPanel />);

    await user.click(screen.getByRole('button', { name: /evaluate dock-to-dock opportunities/i }));

    await waitFor(() => {
      expect(screen.getByText('Recommended Direct Transfers')).toBeInTheDocument();
    });
    expect(screen.getByText('BAY-01')).toBeInTheDocument();
    expect(screen.getByText(/30 units/i)).toBeInTheDocument();

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/cross-dock/evaluate', expect.objectContaining({
      method: 'POST',
      body: expect.any(String)
    }));
  });

  it('handles API errors correctly', async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network failure'));
    render(<LotManagementPanel />);

    await user.click(screen.getByRole('button', { name: /quarantine lot/i }));

    await waitFor(() => {
      expect(screen.getByText('Error: Network failure')).toBeInTheDocument();
    });
  });

  it('handles cross-dock API errors correctly', async () => {
    const user = userEvent.setup();
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Cross-dock failure'));
    render(<LotManagementPanel />);

    await user.click(screen.getByRole('button', { name: /evaluate dock-to-dock opportunities/i }));

    await waitFor(() => {
      expect(screen.getByText('Cross-Docking error: Cross-dock failure')).toBeInTheDocument();
    });
  });
});
