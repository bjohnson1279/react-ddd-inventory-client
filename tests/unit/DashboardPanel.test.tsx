import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPanel } from '../../src/components/Panels';

const getDefaultProps = () => ({
  products: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }], // 3 products
  inventoryItems: [
    { id: 'inv1', sku: 'SKU1', locationId: 'loc1', quantity: 15, version: 1 },
    { id: 'inv2', sku: 'SKU2', locationId: 'loc2', quantity: 5, version: 2 },
    { id: 'inv3', sku: 'SKU3', locationId: 'loc1', quantity: 2, version: 1 },
  ], // 2 low stock
  shopifyConns: [
    { id: 's1', isActive: true },
    { id: 's2', isActive: false },
    { id: 's3', isActive: true },
    { id: 's4', isActive: true },
    { id: 's5', isActive: true }
  ], // 4 active connections
  journals: [{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }, { id: 'j4' }, { id: 'j5' }], // 5 journal entries
  loadDashboardData: vi.fn(),
  loading: false,
});

describe('DashboardPanel', () => {
  it('renders summary statistics correctly based on props', () => {
    const props = getDefaultProps();
    render(<DashboardPanel {...props} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // Catalog Inventory
    expect(screen.getByText('2')).toBeInTheDocument(); // Low Stock SKUs
    expect(screen.getByText('4')).toBeInTheDocument(); // Platform Integrations
    expect(screen.getByText('5')).toBeInTheDocument(); // Double-Entry Ledger
  });

  it('renders empty state for inventory items when empty', () => {
    const props = getDefaultProps();
    props.inventoryItems = [];
    render(<DashboardPanel {...props} />);

    expect(screen.getByText('No inventory stock records loaded.')).toBeInTheDocument();
  });

  it('renders inventory items with correct health status', () => {
    const props = getDefaultProps();
    render(<DashboardPanel {...props} />);

    expect(screen.getByText('inv1')).toBeInTheDocument();
    expect(screen.getByText('SKU1')).toBeInTheDocument();
    expect(screen.getByText('15 units')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    expect(screen.getByText('inv2')).toBeInTheDocument();
    expect(screen.getByText('SKU2')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();

    const lowStockBadges = screen.getAllByText('Low Stock');
    expect(lowStockBadges.length).toBe(2);
  });

  it('calls loadDashboardData when refresh button is clicked', () => {
    const props = getDefaultProps();
    render(<DashboardPanel {...props} />);

    const refreshButton = screen.getByRole('button', { name: /Refresh Stock/i });
    fireEvent.click(refreshButton);
    expect(props.loadDashboardData).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables refresh button when loading is true', () => {
    const props = getDefaultProps();
    props.loading = true;
    const { container } = render(<DashboardPanel {...props} />);

    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Refresh Stock')).not.toBeInTheDocument();
    expect(container.querySelector('.spinner')).toBeInTheDocument();
  });
});
