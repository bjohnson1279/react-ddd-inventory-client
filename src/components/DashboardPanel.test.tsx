import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPanel } from './Panels';

describe('DashboardPanel', () => {
  const defaultProps = {
    products: [{ id: 1 }, { id: 2 }],
    inventoryItems: [
      { id: '1', sku: 'SKU1', locationId: 'L1', quantity: 15, version: 1 },
      { id: '2', sku: 'SKU2', locationId: 'L2', quantity: 5, version: 1 }
    ],
    shopifyConns: [{ isActive: true }, { isActive: false }, { isActive: true }],
    journals: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
    loadDashboardData: vi.fn(),
    loading: false
  };

  it('renders stat cards correctly', () => {
    render(<DashboardPanel {...defaultProps} />);

    // Catalog Inventory
    expect(screen.getByText('Catalog Inventory')).toBeInTheDocument();
    expect(screen.getByText('Unique Products Registered')).toBeInTheDocument();

    // Low Stock SKUs
    expect(screen.getByText('Low Stock SKUs')).toBeInTheDocument();
    expect(screen.getByText('SKUs below safety threshold (10)')).toBeInTheDocument();

    // Platform Integrations
    expect(screen.getByText('Platform Integrations')).toBeInTheDocument();
    expect(screen.getByText('Active Shopify Connections')).toBeInTheDocument();

    // Double-Entry Ledger
    expect(screen.getByText('Double-Entry Ledger')).toBeInTheDocument();
    expect(screen.getByText('Recorded Journal Entries')).toBeInTheDocument();

    // Check values
    const values = screen.getAllByText('2'); // products.length and activeShopifyConns
    expect(values.length).toBeGreaterThanOrEqual(2);

    // lowStockCount: find '1' elements
    const lowStockValues = screen.getAllByText('1');
    expect(lowStockValues.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('4')).toBeInTheDocument(); // journals.length
  });

  it('renders empty state for inventory table', () => {
    render(<DashboardPanel {...defaultProps} inventoryItems={[]} />);
    expect(screen.getByText('No inventory stock records loaded.')).toBeInTheDocument();
  });

  it('renders populated inventory table with correct badges', () => {
    render(<DashboardPanel {...defaultProps} />);

    expect(screen.getByText('SKU1')).toBeInTheDocument();
    expect(screen.getByText('15 units')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    expect(screen.getByText('SKU2')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('handles refresh button correctly when not loading', () => {
    render(<DashboardPanel {...defaultProps} />);

    const refreshButton = screen.getByRole('button', { name: /refresh stock/i });
    expect(refreshButton).not.toBeDisabled();
    expect(refreshButton).toHaveAttribute('aria-busy', 'false');

    fireEvent.click(refreshButton);
    expect(defaultProps.loadDashboardData).toHaveBeenCalledTimes(1);
  });

  it('handles refresh button correctly when loading', () => {
    // When loading is true, button renders a Spinner instead of 'Refresh Stock' text
    // The DashboardPanel has a button with disabled={loading} and aria-busy={loading}
    render(<DashboardPanel {...defaultProps} loading={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
