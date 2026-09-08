import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { RoutingPanel } from './Panels';

describe('RoutingPanel', () => {
  const getDefaultProps = () => ({
    routingSku: '',
    setRoutingSku: vi.fn(),
    routingQuantity: 0,
    setRoutingQuantity: vi.fn(),
    routingAddress: '',
    setRoutingAddress: vi.fn(),
    routingStrategy: 'MINIMIZE_COST',
    setRoutingStrategy: vi.fn(),
    routingPlan: null,
    handleComputeRoute: vi.fn((e: React.FormEvent) => e.preventDefault()),
    loading: false
  });

  const Wrapper = () => {
    const [routingSku, setRoutingSku] = useState('');
    const [routingQuantity, setRoutingQuantity] = useState(0);
    const [routingAddress, setRoutingAddress] = useState('');
    const [routingStrategy, setRoutingStrategy] = useState('MINIMIZE_COST');

    return (
      <RoutingPanel
        {...getDefaultProps()}
        routingSku={routingSku}
        setRoutingSku={setRoutingSku}
        routingQuantity={routingQuantity}
        setRoutingQuantity={setRoutingQuantity}
        routingAddress={routingAddress}
        setRoutingAddress={setRoutingAddress}
        routingStrategy={routingStrategy}
        setRoutingStrategy={setRoutingStrategy}
      />
    );
  };

  it('renders initial empty state correctly', () => {
    render(<RoutingPanel {...getDefaultProps()} />);

    expect(screen.getByText('Intelligent Order Routing Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Submit parameters on the left to resolve origin allocations.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compute Optimal Routing Plan/i })).toBeInTheDocument();
  });

  it('calls setter functions on input changes', async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    render(<RoutingPanel {...props} />);

    const skuInput = screen.getAllByRole('textbox')[0];
    await user.type(skuInput, 'TEST-SKU');
    expect(props.setRoutingSku).toHaveBeenCalled();

    const qtyInput = screen.getByRole('spinbutton');
    await user.type(qtyInput, '5');
    expect(props.setRoutingQuantity).toHaveBeenCalled();

    const addressInput = screen.getAllByRole('textbox')[1];
    await user.type(addressInput, '123 Test St');
    expect(props.setRoutingAddress).toHaveBeenCalled();

    const strategySelect = screen.getByRole('combobox');
    await user.selectOptions(strategySelect, 'MINIMIZE_SPLITS');
    expect(props.setRoutingStrategy).toHaveBeenCalledWith('MINIMIZE_SPLITS');
  });

  it('updates values correctly in a controlled component workflow', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const skuInput = screen.getAllByRole('textbox')[0];
    await user.type(skuInput, 'TEST-SKU');
    expect(skuInput).toHaveValue('TEST-SKU');

    const qtyInput = screen.getByRole('spinbutton');
    await user.type(qtyInput, '5');
    expect(qtyInput).toHaveValue(5);

    const addressInput = screen.getAllByRole('textbox')[1];
    await user.type(addressInput, '123 Test St');
    expect(addressInput).toHaveValue('123 Test St');

    const strategySelect = screen.getByRole('combobox');
    await user.selectOptions(strategySelect, 'MINIMIZE_SPLITS');
    expect(strategySelect).toHaveValue('MINIMIZE_SPLITS');
  });

  it('calls handleComputeRoute on form submit', () => {
    const props = getDefaultProps();
    render(<RoutingPanel {...props} routingSku="A" routingQuantity={1} routingAddress="B" />);

    // In JSDOM, fireEvent.click on submit button might not trigger onSubmit for forms with 'required' inputs.
    // Use fireEvent.submit(formElement) directly.
    const form = screen.getByRole('button', { name: /Compute Optimal Routing Plan/i }).closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    expect(props.handleComputeRoute).toHaveBeenCalled();
  });

  it('disables submit button and shows loading state', () => {
    render(<RoutingPanel {...getDefaultProps()} loading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
  });

  it('renders optimal fulfillment plan when provided', () => {
    const mockRoutingPlan = {
      totalCost: 1550, // 1550 cents = $15.50
      totalDistance: 125.5,
      splitCount: 2,
      allocations: [
        { locationId: 'WH-1', quantity: 3 },
        { locationId: 'WH-2', quantity: 2 }
      ]
    };

    render(<RoutingPanel {...getDefaultProps()} routingPlan={mockRoutingPlan} />);

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
