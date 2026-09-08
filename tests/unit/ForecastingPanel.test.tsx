import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ForecastingPanel } from '../../src/components/Panels';

const getDefaultProps = () => ({
  forecastingReport: [
    { sku: 'SKU-1', currentStock: 10, suggestedROP: 15, safetyStock: 5, velocity7d: 1, velocity30d: 2, velocity90d: 3, forecast30d: 30 },
    { sku: 'SKU-2', currentStock: 50, suggestedROP: 10, safetyStock: 5, velocity7d: 1, velocity30d: 2, velocity90d: 3, forecast30d: 30 }
  ],
  loadForecastingReport: vi.fn(),
  locationId: 'LOC-MAIN',
  reorderPolicies: [
    { sku: 'SKU-A', locationId: 'LOC-1', reorderPoint: 20, safetyStock: 5, economicOrderQuantity: 100 }
  ],
  policySku: 'TEST-SKU',
  setPolicySku: vi.fn(),
  policyLoc: 'TEST-LOC',
  setPolicyLoc: vi.fn(),
  policyRop: 10,
  setPolicyRop: vi.fn(),
  policySafety: 5,
  setPolicySafety: vi.fn(),
  policyEoq: 50,
  setPolicyEoq: vi.fn(),
  handleSaveReorderPolicy: vi.fn((e: React.FormEvent) => e.preventDefault()),
  handleEvaluateReorderPolicies: vi.fn(),
  fefoSku: 'FEFO-SKU',
  setFefoSku: vi.fn(),
  fefoQty: 10,
  setFefoQty: vi.fn(),
  fefoResult: [
    { lotNumber: 'LOT-1', expirationDate: '2025-01-01T00:00:00Z', quantityToPick: 10 }
  ],
  handleGetFefoSuggestions: vi.fn((e: React.FormEvent) => e.preventDefault()),
  recallLotNum: 'LOT-A-1',
  setRecallLotNum: vi.fn(),
  recallResult: [
    { sku: 'SKU-X', quantity: 5, lotNumber: 'LOT-A-1' }
  ],
  handleTraceRecall: vi.fn((e: React.FormEvent) => e.preventDefault()),
  loading: false
});

const Wrapper = (props: any) => {
  const [policySku, setPolicySku] = React.useState(props.policySku);
  const [policyLoc, setPolicyLoc] = React.useState(props.policyLoc);
  const [policyRop, setPolicyRop] = React.useState(props.policyRop);
  const [policySafety, setPolicySafety] = React.useState(props.policySafety);
  const [policyEoq, setPolicyEoq] = React.useState(props.policyEoq);

  const [fefoSku, setFefoSku] = React.useState(props.fefoSku);
  const [fefoQty, setFefoQty] = React.useState(props.fefoQty);

  const [recallLotNum, setRecallLotNum] = React.useState(props.recallLotNum);

  return (
    <ForecastingPanel
      {...props}
      policySku={policySku}
      setPolicySku={setPolicySku}
      policyLoc={policyLoc}
      setPolicyLoc={setPolicyLoc}
      policyRop={policyRop}
      setPolicyRop={setPolicyRop}
      policySafety={policySafety}
      setPolicySafety={setPolicySafety}
      policyEoq={policyEoq}
      setPolicyEoq={setPolicyEoq}
      fefoSku={fefoSku}
      setFefoSku={setFefoSku}
      fefoQty={fefoQty}
      setFefoQty={setFefoQty}
      recallLotNum={recallLotNum}
      setRecallLotNum={setRecallLotNum}
    />
  );
};

describe('ForecastingPanel', () => {
  it('renders correctly with given props', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    expect(screen.getByText('Products Monitored')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 items in forecastingReport

    expect(screen.getByText('Urgent Actions')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 item (SKU-1) has currentStock <= suggestedROP

    expect(screen.getByText('Target Location')).toBeInTheDocument();
    expect(screen.getByText('LOC-MAIN')).toBeInTheDocument();

    expect(screen.getByText('Configure Reorder Policy (ROP/EOQ)')).toBeInTheDocument();
    expect(screen.getByText('Active Reorder Policies')).toBeInTheDocument();

    // Check that custom reorder policies are rendered
    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getByText('20 / 5 units')).toBeInTheDocument();

    expect(screen.getByText('FEFO Expiry Pick Suggestions')).toBeInTheDocument();
    expect(screen.getByText('LOT-1')).toBeInTheDocument();

    expect(screen.getByText('Lot Recall Tracing Reports')).toBeInTheDocument();
    expect(screen.getByText('LOT-A-1')).toBeInTheDocument();
  });

  it('handles Configure Reorder Policy form submission', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    const policySkuInput = screen.getAllByRole('textbox').find(el => el.getAttribute('placeholder') === 'e.g. ROUTE-SKU') as HTMLElement;
    fireEvent.change(policySkuInput, { target: { value: 'NEW-SKU' } });

    const saveButton = screen.getByRole('button', { name: /Save Policy/i });
    const form = saveButton.closest('form');
    fireEvent.submit(form!);

    expect(props.handleSaveReorderPolicy).toHaveBeenCalled();
  });

  it('handles Evaluate Policies button click', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    const evaluateButton = screen.getByRole('button', { name: /Evaluate Policies/i });
    fireEvent.click(evaluateButton);

    expect(props.handleEvaluateReorderPolicies).toHaveBeenCalled();
  });

  it('handles FEFO Expiry form submission', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    const saveButton = screen.getByRole('button', { name: /Get Expiring Stock Layers/i });
    const form = saveButton.closest('form');
    fireEvent.submit(form!);

    expect(props.handleGetFefoSuggestions).toHaveBeenCalled();
  });

  it('handles Trace Recall form submission', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    const saveButton = screen.getByRole('button', { name: /Compile Recall Report/i });
    const form = saveButton.closest('form');
    fireEvent.submit(form!);

    expect(props.handleTraceRecall).toHaveBeenCalled();
  });

  it('handles Recalculate ROP button click', () => {
    const props = getDefaultProps();
    render(<Wrapper {...props} />);

    const recalculateButton = screen.getByRole('button', { name: /Recalculate ROP/i });
    fireEvent.click(recalculateButton);

    expect(props.loadForecastingReport).toHaveBeenCalled();
  });

  it('renders empty states properly', () => {
    const props = {
      ...getDefaultProps(),
      forecastingReport: [],
      reorderPolicies: [],
      fefoResult: [],
      recallResult: []
    };
    render(<Wrapper {...props} />);

    expect(screen.getByText('No custom reorder policies saved.')).toBeInTheDocument();
    expect(screen.getByText('No demand forecasting items calculated. Make sure stock movement transactions exist in database.')).toBeInTheDocument();
    expect(screen.getByText('No units from this lot have been dispatched to customers.')).toBeInTheDocument();
  });
});
