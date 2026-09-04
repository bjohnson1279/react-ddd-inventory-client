import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { RoutingPanel } from './Panels';

describe('RoutingPanel', () => {
  it('renders form and empty state correctly', () => {
    render(
      <RoutingPanel
        routingSku=""
        setRoutingSku={vi.fn()}
        routingQuantity={1}
        setRoutingQuantity={vi.fn()}
        routingAddress=""
        setRoutingAddress={vi.fn()}
        routingStrategy="MINIMIZE_COST"
        setRoutingStrategy={vi.fn()}
        routingPlan={null}
        handleComputeRoute={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('Intelligent Order Routing Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Submit parameters on the left to resolve origin allocations.')).toBeInTheDocument();
  });

  it('renders correctly with a routing plan', () => {
    const mockRoutingPlan = {
      totalCost: 1500, // $15.00
      totalDistance: 120.5,
      splitCount: 1,
      allocations: [
        { locationId: 'WH-1', quantity: 10 },
        { locationId: 'WH-2', quantity: 5 }
      ]
    };
    render(
      <RoutingPanel
        routingSku="SKU-1"
        setRoutingSku={vi.fn()}
        routingQuantity={15}
        setRoutingQuantity={vi.fn()}
        routingAddress="123 Main St"
        setRoutingAddress={vi.fn()}
        routingStrategy="MINIMIZE_COST"
        setRoutingStrategy={vi.fn()}
        routingPlan={mockRoutingPlan}
        handleComputeRoute={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('120.5 km')).toBeInTheDocument();
    expect(screen.getByText('1 splits')).toBeInTheDocument();
    expect(screen.getByText('WH-1')).toBeInTheDocument();
    expect(screen.getByText('10 units')).toBeInTheDocument();
    expect(screen.getByText('WH-2')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
  });

  it('calls set methods when form values change', async () => {
    const setRoutingSku = vi.fn();
    const setRoutingQuantity = vi.fn();
    const setRoutingAddress = vi.fn();
    const setRoutingStrategy = vi.fn();
    const handleComputeRoute = vi.fn((e) => e.preventDefault());

    const { container } = render(
      <RoutingPanel
        routingSku="SKU"
        setRoutingSku={setRoutingSku}
        routingQuantity={1}
        setRoutingQuantity={setRoutingQuantity}
        routingAddress="ADDR"
        setRoutingAddress={setRoutingAddress}
        routingStrategy="MINIMIZE_COST"
        setRoutingStrategy={setRoutingStrategy}
        routingPlan={null}
        handleComputeRoute={handleComputeRoute}
        loading={false}
      />
    );

    // Using querySelector instead of getByLabelText since labels are missing htmlFor
    const skuInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await userEvent.type(skuInput, 'TEST-SKU');
    expect(setRoutingSku).toHaveBeenCalled();

    const quantityInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '5');
    expect(setRoutingQuantity).toHaveBeenCalled();

    const addressInputs = container.querySelectorAll('input[type="text"]');
    const addressInput = addressInputs[1] as HTMLInputElement;
    await userEvent.type(addressInput, 'New York');
    expect(setRoutingAddress).toHaveBeenCalled();

    const strategySelect = container.querySelector('select') as HTMLSelectElement;
    await userEvent.selectOptions(strategySelect, 'MINIMIZE_SPLITS');
    expect(setRoutingStrategy).toHaveBeenCalledWith('MINIMIZE_SPLITS');

    // Test form submission. With jsdom, fireEvent.submit or form.submit might be needed, or clicking a button.
    const form = container.querySelector('form');
    // we bypass HTML5 validation in JSDOM sometimes but clicking submit when required fields are filled is best.
    const submitBtn = screen.getByRole('button', { name: /Compute Optimal Routing Plan/i });
    await userEvent.click(submitBtn);
    expect(handleComputeRoute).toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    render(
      <RoutingPanel
        routingSku=""
        setRoutingSku={vi.fn()}
        routingQuantity={1}
        setRoutingQuantity={vi.fn()}
        routingAddress=""
        setRoutingAddress={vi.fn()}
        routingStrategy="MINIMIZE_COST"
        setRoutingStrategy={vi.fn()}
        routingPlan={null}
        handleComputeRoute={vi.fn()}
        loading={true}
      />
    );
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Compute Optimal Routing Plan')).not.toBeInTheDocument();
  });
});
