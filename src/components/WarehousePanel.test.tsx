import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { WarehousePanel } from './Panels';

const getDefaultProps = () => ({
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
  handleCreateWmsLocation: vi.fn((e: React.FormEvent) => e.preventDefault()),
  putawaySku: '',
  setPutawaySku: vi.fn(),
  putawayQty: 0,
  setPutawayQty: vi.fn(),
  handleGetPutawaySuggestions: vi.fn((e: React.FormEvent) => e.preventDefault()),
  putawayResult: [],
  wmsLocations: [],
  handleDeleteWmsLocation: vi.fn(),
  pickSkusInput: '',
  setPickSkusInput: vi.fn(),
  handleOptimizePickRoute: vi.fn((e: React.FormEvent) => e.preventDefault()),
  pickRouteResult: [],
  loading: false,
});

const WarehousePanelWrapper = (props: any) => {
  const [wmsLocId, setWmsLocId] = useState(props.wmsLocId);
  const [putawaySku, setPutawaySku] = useState(props.putawaySku);

  return (
    <WarehousePanel
      {...props}
      wmsLocId={wmsLocId}
      setWmsLocId={(v) => { setWmsLocId(v); props.setWmsLocId(v); }}
      putawaySku={putawaySku}
      setPutawaySku={(v) => { setPutawaySku(v); props.setPutawaySku(v); }}
    />
  );
};

describe('WarehousePanel', () => {
  it('renders all sections and empty state correctly', () => {
    const props = getDefaultProps();
    render(<WarehousePanel {...props} />);

    expect(screen.getByText('Configure Warehouse Location Layout')).toBeInTheDocument();
    expect(screen.getByText('Get Putaway Recommendation')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Location Registry')).toBeInTheDocument();
    expect(screen.getByText('WMS Picking Route Optimization')).toBeInTheDocument();
    expect(screen.getByText('No warehouse locations configured.')).toBeInTheDocument();
  });

  it('renders populated warehouse locations and handles deletion', async () => {
    const props = getDefaultProps();
    props.wmsLocations = [
      { id: 'LOC-1', zone: 'A', maxWeightGrams: 5000, maxVolumeCubicMeters: 1.5 },
    ];
    render(<WarehousePanel {...props} />);

    expect(screen.getByText('LOC-1')).toBeInTheDocument();
    expect(screen.getByText('Zone A')).toBeInTheDocument();
    expect(screen.getByText('5000g')).toBeInTheDocument();
    expect(screen.getByText('1.5m³')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete warehouse location LOC-1' });
    fireEvent.click(deleteBtn);

    expect(props.handleDeleteWmsLocation).toHaveBeenCalledWith('LOC-1');
    expect(props.handleDeleteWmsLocation).toHaveBeenCalledTimes(1);
  });

  it('handles form submissions correctly', () => {
    const props = getDefaultProps();
    const { container } = render(<WarehousePanel {...props} />);

    const forms = container.querySelectorAll('form');
    expect(forms).toHaveLength(3);

    fireEvent.submit(forms[0]);
    expect(props.handleCreateWmsLocation).toHaveBeenCalledTimes(1);

    fireEvent.submit(forms[1]);
    expect(props.handleGetPutawaySuggestions).toHaveBeenCalledTimes(1);

    fireEvent.submit(forms[2]);
    expect(props.handleOptimizePickRoute).toHaveBeenCalledTimes(1);
  });

  it('handles input changes correctly', async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    render(<WarehousePanelWrapper {...props} />);

    const locIdInput = screen.getByPlaceholderText('e.g. LOC-CENTRAL');
    await user.type(locIdInput, 'LOC-2');
    expect(props.setWmsLocId).toHaveBeenCalledWith('LOC-2');

    const skuInput = screen.getByPlaceholderText('e.g. ROUTE-SKU');
    await user.type(skuInput, 'SKU-1');
    expect(props.setPutawaySku).toHaveBeenCalledWith('SKU-1');
  });

  it('renders putaway results correctly', () => {
    const props = getDefaultProps();
    props.putawayResult = [{ locationId: 'LOC-123', suggestedQuantity: 10 }];
    render(<WarehousePanel {...props} />);

    expect(screen.getByText('LOC-123')).toBeInTheDocument();
    expect(screen.getByText(/10 units/)).toBeInTheDocument();
  });

  it('renders pick route results correctly', () => {
    const props = getDefaultProps();
    props.pickRouteResult = ['SKU-A', 'SKU-B'];
    render(<WarehousePanel {...props} />);

    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getByText('SKU-B')).toBeInTheDocument();
  });

  it('disables submit buttons when loading is true', () => {
    const props = getDefaultProps();
    props.loading = true;
    render(<WarehousePanel {...props} />);

    const buttons = screen.getAllByRole('button');
    const submitBtns = buttons.filter(btn => btn.getAttribute('type') === 'submit');
    expect(submitBtns).toHaveLength(3);
    submitBtns.forEach(btn => {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });
  });
});
