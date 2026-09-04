import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { RoutingPanel } from './Panels';

// The Spinner is mocked in the setup but since Vitest hoists it, let's just assert on its structure (svg with class spinner)
// or we can test by label texts

describe('RoutingPanel', () => {
  const defaultProps = {
    routingSku: '',
    setRoutingSku: vi.fn(),
    routingQuantity: 0,
    setRoutingQuantity: vi.fn(),
    routingAddress: '',
    setRoutingAddress: vi.fn(),
    routingStrategy: 'MINIMIZE_COST',
    setRoutingStrategy: vi.fn(),
    routingPlan: null,
    handleComputeRoute: vi.fn((e) => e.preventDefault()),
    loading: false
  };

  it('renders initial empty state correctly', () => {
    render(<RoutingPanel {...defaultProps} />);

    expect(screen.getByText('Intelligent Order Routing Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Submit parameters on the left to resolve origin allocations.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compute Optimal Routing Plan/i })).toBeInTheDocument();
  });

  it('calls setter functions on input changes', async () => {
    const user = userEvent.setup();
    render(<RoutingPanel {...defaultProps} />);

    const skuInput = screen.getAllByRole('textbox')[0];
    await user.type(skuInput, 'TEST-SKU');
    expect(defaultProps.setRoutingSku).toHaveBeenCalled();

    const qtyInput = screen.getByRole('spinbutton');
    await user.type(qtyInput, '5');
    expect(defaultProps.setRoutingQuantity).toHaveBeenCalled();

    const addressInput = screen.getAllByRole('textbox')[1];
    await user.type(addressInput, '123 Test St');
    expect(defaultProps.setRoutingAddress).toHaveBeenCalled();

    const strategySelect = screen.getByRole('combobox');
    await user.selectOptions(strategySelect, 'MINIMIZE_SPLITS');
    expect(defaultProps.setRoutingStrategy).toHaveBeenCalledWith('MINIMIZE_SPLITS');
  });

  it('calls handleComputeRoute on form submit', async () => {
    const user = userEvent.setup();
    render(<RoutingPanel {...defaultProps} routingSku="A" routingQuantity={1} routingAddress="B" />);

    const submitButton = screen.getByRole('button', { name: /Compute Optimal Routing Plan/i });
    await user.click(submitButton);

    expect(defaultProps.handleComputeRoute).toHaveBeenCalled();
  });

  it('disables submit button and shows loading state', () => {
    render(<RoutingPanel {...defaultProps} loading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
    // SVG spinner is rendered inside the button
    expect(document.querySelector('.spinner')).toBeInTheDocument();
  });

  it('renders optimal fulfillment plan when provided', () => {
    const mockRoutingPlan = {
      totalCost: 1550, // $15.50
      totalDistance: 125.5,
      splitCount: 2,
      allocations: [
        { locationId: 'WH-1', quantity: 3 },
        { locationId: 'WH-2', quantity: 2 }
      ]
    };

    render(<RoutingPanel {...defaultProps} routingPlan={mockRoutingPlan} />);

    expect(screen.getByText('Optimal Fulfillment Plan')).toBeInTheDocument();
    expect(screen.getByText('$15.50')).toBeInTheDocument();
    expect(screen.getByText('125.5 km')).toBeInTheDocument();
    expect(screen.getByText('2 splits')).toBeInTheDocument();

    expect(screen.getByText('WH-1')).toBeInTheDocument();
    expect(screen.getByText('3 units')).toBeInTheDocument();
    expect(screen.getByText('WH-2')).toBeInTheDocument();
    expect(screen.getByText('2 units')).toBeInTheDocument();
  });
});
