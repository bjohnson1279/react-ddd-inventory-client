import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarehousePanel } from '../../src/components/Panels';
import userEvent from '@testing-library/user-event';

const Wrapper = (props: any) => {
  const [wmsMaxWeight, setWmsMaxWeight] = React.useState(0);
  const [wmsMaxVolume, setWmsMaxVolume] = React.useState(0);
  const [putawayQty, setPutawayQty] = React.useState(0);

  return (
    <WarehousePanel
      {...props}
      wmsMaxWeight={wmsMaxWeight}
      setWmsMaxWeight={(val) => {
        setWmsMaxWeight(val);
        props.setWmsMaxWeight(val);
      }}
      wmsMaxVolume={wmsMaxVolume}
      setWmsMaxVolume={(val) => {
        setWmsMaxVolume(val);
        props.setWmsMaxVolume(val);
      }}
      putawayQty={putawayQty}
      setPutawayQty={(val) => {
        setPutawayQty(val);
        props.setPutawayQty(val);
      }}
    />
  );
};

describe('WarehousePanel', () => {
  const defaultProps = {
    wmsLocId: '',
    setWmsLocId: vi.fn(),
    wmsWarehouseId: '',
    setWmsWarehouseId: vi.fn(),
    wmsZone: '',
    setWmsZone: vi.fn(),
    wmsMaxWeight: 0,
    setWmsMaxWeight: vi.fn(),
    wmsMaxVolume: 0,
    setWmsMaxVolume: vi.fn(),
    handleCreateWmsLocation: vi.fn((e) => e.preventDefault()),
    putawaySku: '',
    setPutawaySku: vi.fn(),
    putawayQty: 0,
    setPutawayQty: vi.fn(),
    handleGetPutawaySuggestions: vi.fn((e) => e.preventDefault()),
    putawayResult: [],
    wmsLocations: [],
    handleDeleteWmsLocation: vi.fn(),
    pickSkusInput: '',
    setPickSkusInput: vi.fn(),
    handleOptimizePickRoute: vi.fn((e) => e.preventDefault()),
    pickRouteResult: [],
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all sections', () => {
    render(<WarehousePanel {...defaultProps} />);
    expect(screen.getByText('Configure Warehouse Location Layout')).toBeInTheDocument();
    expect(screen.getByText('Get Putaway Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Location Registry')).toBeInTheDocument();
    expect(screen.getByText('WMS Picking Route Optimization')).toBeInTheDocument();
  });

  it('handles input changes for configure location form', async () => {
    const user = userEvent.setup();
    render(<Wrapper {...defaultProps} />);

    const locIdInput = screen.getByPlaceholderText('e.g. LOC-CENTRAL');
    await user.type(locIdInput, 'L');
    expect(defaultProps.setWmsLocId).toHaveBeenCalledWith('L');

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[1], 'W1');
    expect(defaultProps.setWmsWarehouseId).toHaveBeenCalledWith('W');

    await user.type(inputs[2], 'Z1');
    expect(defaultProps.setWmsZone).toHaveBeenCalledWith('Z');

    const numberInputs = screen.getAllByRole('spinbutton');
    await user.clear(numberInputs[0]);
    await user.type(numberInputs[0], '100');
    expect(defaultProps.setWmsMaxWeight).toHaveBeenCalledWith(100);

    await user.clear(numberInputs[1]);
    await user.type(numberInputs[1], '10.5');
    expect(defaultProps.setWmsMaxVolume).toHaveBeenCalledWith(10.5);
  });

  it('submits configure location form', () => {
    render(<WarehousePanel {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: 'Configure Location' });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);
    expect(defaultProps.handleCreateWmsLocation).toHaveBeenCalled();
  });

  it('handles input changes for get putaway recommendation form', async () => {
    const user = userEvent.setup();
    render(<Wrapper {...defaultProps} />);

    const skuInput = screen.getByPlaceholderText('e.g. ROUTE-SKU');
    await user.type(skuInput, 'S');
    expect(defaultProps.setPutawaySku).toHaveBeenCalledWith('S');

    const numberInputs = screen.getAllByRole('spinbutton');
    const qtyInput = numberInputs[2];
    await user.clear(qtyInput);
    await user.type(qtyInput, '50');
    expect(defaultProps.setPutawayQty).toHaveBeenCalledWith(50);
  });

  it('submits get putaway recommendation form', () => {
    render(<WarehousePanel {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: 'Suggest Bin Location' });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);
    expect(defaultProps.handleGetPutawaySuggestions).toHaveBeenCalled();
  });

  it('displays empty registry state', () => {
    render(<WarehousePanel {...defaultProps} />);
    expect(screen.getByText('No warehouse locations configured.')).toBeInTheDocument();
  });

  it('displays populated registry table', () => {
    const locations = [
      { id: 'LOC-1', zone: 'A', maxWeightGrams: 1000, maxVolumeCubicMeters: 1.5 }
    ];
    render(<WarehousePanel {...defaultProps} wmsLocations={locations} />);
    expect(screen.getByText('LOC-1')).toBeInTheDocument();
    expect(screen.getByText('Zone A')).toBeInTheDocument();
    expect(screen.getByText('1000g')).toBeInTheDocument();
    expect(screen.getByText('1.5m³')).toBeInTheDocument();
  });

  it('handles deleting location', () => {
    const locations = [
      { id: 'LOC-1', zone: 'A', maxWeightGrams: 1000, maxVolumeCubicMeters: 1.5 }
    ];
    render(<WarehousePanel {...defaultProps} wmsLocations={locations} />);
    const deleteBtn = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);
    expect(defaultProps.handleDeleteWmsLocation).toHaveBeenCalledWith('LOC-1');
  });

  it('displays putaway recommendations', () => {
    const results = [{ locationId: 'BIN-1', suggestedQuantity: 50 }];
    render(<WarehousePanel {...defaultProps} putawayResult={results} />);
    expect(screen.getByText('Suggested Bin:')).toBeInTheDocument();
    expect(screen.getByText('BIN-1')).toBeInTheDocument();
    expect(screen.getByText(/Fulfill: 50 units/)).toBeInTheDocument();
  });

  it('handles input changes for wms picking route optimization form', async () => {
    const user = userEvent.setup();
    render(<WarehousePanel {...defaultProps} />);

    const routeInput = screen.getByPlaceholderText('ROUTE-SKU, CHARGER-WRLS-BLK');
    await user.type(routeInput, 'R');
    expect(defaultProps.setPickSkusInput).toHaveBeenCalledWith('R');
  });

  it('submits wms picking route optimization form', () => {
    render(<WarehousePanel {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: 'Generate Optimal Pick Sequence' });
    const form = submitBtn.closest('form');
    fireEvent.submit(form!);
    expect(defaultProps.handleOptimizePickRoute).toHaveBeenCalled();
  });

  it('displays pick route optimization result', () => {
    const routes = ['SKU-1', 'SKU-2'];
    render(<WarehousePanel {...defaultProps} pickRouteResult={routes} />);
    expect(screen.getByText('Suggested Sequencing Path')).toBeInTheDocument();
    expect(screen.getByText('SKU-1')).toBeInTheDocument();
    expect(screen.getByText('SKU-2')).toBeInTheDocument();
  });

  it('disables buttons when loading is true', () => {
    render(<WarehousePanel {...defaultProps} loading={true} />);
    const configBtn = screen.getByRole('button', { name: 'Configure Location' });
    const suggestBtn = screen.getByRole('button', { name: 'Suggest Bin Location' });
    const optimizeBtn = screen.getByRole('button', { name: 'Generate Optimal Pick Sequence' });

    expect(configBtn).toBeDisabled();
    expect(configBtn).toHaveAttribute('aria-busy', 'true');
    expect(suggestBtn).toBeDisabled();
    expect(suggestBtn).toHaveAttribute('aria-busy', 'true');
    expect(optimizeBtn).toBeDisabled();
    expect(optimizeBtn).toHaveAttribute('aria-busy', 'true');
  });
});
