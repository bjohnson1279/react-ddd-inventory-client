import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ForecastingPanel } from './Panels';
import React from 'react';

describe('ForecastingPanel', () => {
  const defaultProps = {
    forecastingReport: [
      { sku: 'SKU1', currentStock: 10, suggestedROP: 15, salesVelocity7d: 2, salesVelocity30d: 2.5, salesVelocity90d: 3, forecastedDemand: 50, safetyStock: 5 },
      { sku: 'SKU2', currentStock: 30, suggestedROP: 10, salesVelocity7d: 1, salesVelocity30d: 1, salesVelocity90d: 1, forecastedDemand: 20, safetyStock: 5 },
      { sku: 'SKU3', currentStock: 12, suggestedROP: 10, salesVelocity7d: 1, salesVelocity30d: 1, salesVelocity90d: 1, forecastedDemand: 20, safetyStock: 5 }
    ],
    loadForecastingReport: vi.fn(),
    locationId: 'loc-1',
    reorderPolicies: [],
    policySku: '',
    setPolicySku: vi.fn(),
    policyLoc: '',
    setPolicyLoc: vi.fn(),
    policyRop: 0,
    setPolicyRop: vi.fn(),
    policySafety: 0,
    setPolicySafety: vi.fn(),
    policyEoq: 0,
    setPolicyEoq: vi.fn(),
    handleSaveReorderPolicy: vi.fn((e) => e.preventDefault()),
    handleEvaluateReorderPolicies: vi.fn(),
    fefoSku: '',
    setFefoSku: vi.fn(),
    fefoQty: 0,
    setFefoQty: vi.fn(),
    fefoResult: [],
    handleGetFefoSuggestions: vi.fn((e) => e.preventDefault()),
    recallLotNum: '',
    setRecallLotNum: vi.fn(),
    recallResult: null,
    handleTraceRecall: vi.fn((e) => e.preventDefault()),
    loading: false
  };

  it('renders stat cards correctly', () => {
    render(<ForecastingPanel {...defaultProps} />);
    expect(screen.getByText('Products Monitored')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 items in report
    expect(screen.getByText('Urgent Actions')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 urgent action
    expect(screen.getByText('Target Location')).toBeInTheDocument();
    expect(screen.getByText('LOC-1')).toBeInTheDocument(); // locationId.toUpperCase()
  });

  it('handles empty reorder policies', () => {
    render(<ForecastingPanel {...defaultProps} />);
    expect(screen.getByText('No custom reorder policies saved.')).toBeInTheDocument();
  });

  it('renders reorder policies', () => {
    const props = {
      ...defaultProps,
      reorderPolicies: [
        { sku: 'SKU-A', locationId: 'loc-1', reorderPoint: 10, safetyStock: 5, economicOrderQuantity: 100 }
      ]
    };
    render(<ForecastingPanel {...props} />);
    expect(screen.getByText('SKU-A')).toBeInTheDocument();
    expect(screen.getByText('10 / 5 units')).toBeInTheDocument();
    expect(screen.getByText('100 units')).toBeInTheDocument();
  });

  it('calls handleSaveReorderPolicy when form is submitted', () => {
    render(<ForecastingPanel {...defaultProps} />);


    const formBtn = screen.getByRole('button', { name: 'Save Policy' });
    fireEvent.submit(formBtn.closest('form')!);


    expect(defaultProps.handleSaveReorderPolicy).toHaveBeenCalled();
  });

  it('renders FEFO recommendations', () => {
    const props = {
      ...defaultProps,
      fefoResult: [
        { lotNumber: 'LOT1', expirationDate: '2025-01-01', quantityToPick: 5 }
      ]
    };
    render(<ForecastingPanel {...props} />);
    expect(screen.getAllByText('LOT1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('5 units')[0]).toBeInTheDocument();
  });

  it('renders recall results', () => {
    const props = {
      ...defaultProps,
      recallResult: [
        { sku: 'SKU1', quantity: 10, lotNumber: 'LOT1' }
      ]
    };
    render(<ForecastingPanel {...props} />);
    expect(screen.getAllByText('10 units')[0]).toBeInTheDocument();
    expect(screen.getAllByText('LOT1')[0]).toBeInTheDocument();
  });

  it('shows empty message when recall results are empty array', () => {
    const props = { ...defaultProps, recallResult: [] };
    render(<ForecastingPanel {...props} />);
    expect(screen.getByText('No units from this lot have been dispatched to customers.')).toBeInTheDocument();
  });

  it('renders Demand Planning & ROP Safety Stock Recommendations', () => {
    render(<ForecastingPanel {...defaultProps} />);
    expect(screen.getByText('🔴 REORDER URGENT')).toBeInTheDocument(); // SKU1
    expect(screen.getByText('🟢 STOCK HEALTHY')).toBeInTheDocument(); // SKU2
    expect(screen.getByText('🟡 MONITOR STOCKS')).toBeInTheDocument(); // SKU3
  });

  it('shows empty message when forecastingReport is empty', () => {
    const props = { ...defaultProps, forecastingReport: [] };
    render(<ForecastingPanel {...props} />);
    expect(screen.getByText('No demand forecasting items calculated. Make sure stock movement transactions exist in database.')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    const props = { ...defaultProps, loading: true };
    render(<ForecastingPanel {...props} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });
  });
});
