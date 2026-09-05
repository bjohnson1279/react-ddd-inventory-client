import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPanel } from './Panels';

describe('DashboardPanel', () => {
  const mockProducts = [{ id: 'p1' }, { id: 'p2' }];
  const mockInventoryItems = [
    { id: 'i1', sku: 'SKU-1', locationId: 'LOC-1', quantity: 5, version: 1 },
    { id: 'i2', sku: 'SKU-2', locationId: 'LOC-2', quantity: 15, version: 2 }
  ];
  const mockShopifyConns = [{ id: 's1', isActive: true }, { id: 's2', isActive: false }];
  const mockJournals = [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }];

  it('renders stat cards correctly with derived counts', () => {
    render(
      <DashboardPanel
        products={mockProducts}
        inventoryItems={mockInventoryItems}
        shopifyConns={mockShopifyConns}
        journals={mockJournals}
        loadDashboardData={vi.fn()}
        loading={false}
      />
    );

    // Products length
    expect(screen.getByText('Catalog Inventory')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Low stock count (qty < 10) -> 1 item (qty 5)
    expect(screen.getByText('Low Stock SKUs')).toBeInTheDocument();

    // Active shopify conns -> 1 item
    expect(screen.getByText('Platform Integrations')).toBeInTheDocument();

    // The low stock and active shopify conns both evaluate to '1'. We just ensure the values are present.
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(2);

    // Journals length
    expect(screen.getByText('Double-Entry Ledger')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders empty state for inventory items', () => {
    render(
      <DashboardPanel
        products={[]}
        inventoryItems={[]}
        shopifyConns={[]}
        journals={[]}
        loadDashboardData={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('No inventory stock records loaded.')).toBeInTheDocument();
  });

  it('renders inventory items table correctly', () => {
    render(
      <DashboardPanel
        products={mockProducts}
        inventoryItems={mockInventoryItems}
        shopifyConns={mockShopifyConns}
        journals={mockJournals}
        loadDashboardData={vi.fn()}
        loading={false}
      />
    );

    expect(screen.getByText('SKU-1')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();

    expect(screen.getByText('SKU-2')).toBeInTheDocument();
    expect(screen.getByText('15 units')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('handles loadDashboardData click', async () => {
    const user = userEvent.setup();
    const loadDashboardDataMock = vi.fn();

    render(
      <DashboardPanel
        products={[]}
        inventoryItems={[]}
        shopifyConns={[]}
        journals={[]}
        loadDashboardData={loadDashboardDataMock}
        loading={false}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /Refresh Stock/i });
    await user.click(refreshButton);

    expect(loadDashboardDataMock).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button and shows busy state when loading', () => {
    const { container } = render(
      <DashboardPanel
        products={[]}
        inventoryItems={[]}
        shopifyConns={[]}
        journals={[]}
        loadDashboardData={vi.fn()}
        loading={true}
      />
    );

    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute('aria-busy', 'true');

    // Spinner should be rendered (svg element with class 'spinner')
    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });
});
