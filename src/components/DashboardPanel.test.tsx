import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPanel } from './Panels';

describe('DashboardPanel', () => {
  const defaultProps = {
    products: [{ id: 'p1' }, { id: 'p2' }],
    inventoryItems: [
      { id: 'i1', sku: 'SKU1', locationId: 'L1', quantity: 15, version: 1 },
      { id: 'i2', sku: 'SKU2', locationId: 'L2', quantity: 5, version: 1 }
    ],
    shopifyConns: [{ id: 's1', isActive: true }, { id: 's2', isActive: false }],
    journals: [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }],
    loadDashboardData: vi.fn(),
    loading: false
  };

  it('renders stats correctly based on props', () => {
    render(<DashboardPanel {...defaultProps} />);

    // Catalog Inventory
    const catalogCard = screen.getByText('Catalog Inventory').closest('.stat-card');
    expect(within(catalogCard as HTMLElement).getByText('2')).toBeInTheDocument();

    // Low Stock SKUs (1 item has quantity < 10)
    const lowStockCard = screen.getByText('Low Stock SKUs').closest('.stat-card');
    expect(within(lowStockCard as HTMLElement).getByText('1')).toBeInTheDocument();

    // Platform Integrations (1 active)
    const integrationsCard = screen.getByText('Platform Integrations').closest('.stat-card');
    expect(within(integrationsCard as HTMLElement).getByText('1')).toBeInTheDocument();

    // Double-Entry Ledger (3 items)
    const ledgerCard = screen.getByText('Double-Entry Ledger').closest('.stat-card');
    expect(within(ledgerCard as HTMLElement).getByText('3')).toBeInTheDocument();
  });

  it('renders inventory items table', () => {
    render(<DashboardPanel {...defaultProps} />);

    expect(screen.getByText('Real-time Stock Levels')).toBeInTheDocument();
    expect(screen.getByText('SKU1')).toBeInTheDocument();
    expect(screen.getByText('15 units')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    expect(screen.getByText('SKU2')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('calls loadDashboardData when Refresh Stock button is clicked', () => {
    render(<DashboardPanel {...defaultProps} />);

    const refreshButton = screen.getByRole('button', { name: /refresh stock/i });
    fireEvent.click(refreshButton);

    expect(defaultProps.loadDashboardData).toHaveBeenCalledTimes(1);
  });

  it('disables Refresh Stock button when loading is true', () => {
    render(<DashboardPanel {...defaultProps} loading={true} />);

    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute('aria-busy', 'true');
  });

  it('displays empty state when inventoryItems is empty', () => {
    render(<DashboardPanel {...defaultProps} inventoryItems={[]} />);

    expect(screen.getByText('No inventory stock records loaded.')).toBeInTheDocument();
  });
});
