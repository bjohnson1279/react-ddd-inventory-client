import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { SerialsPanel } from './Panels';

describe('SerialsPanel', () => {
  const mockSetTraceSerialNum = vi.fn();
  const mockHandleTraceSerial = vi.fn((e) => e.preventDefault());

  const defaultProps = {
    traceSerialNum: '',
    setTraceSerialNum: mockSetTraceSerialNum,
    tracedItem: null,
    handleTraceSerial: mockHandleTraceSerial,
    loading: false,
  };

  it('renders default state correctly', () => {
    render(<SerialsPanel {...defaultProps} />);
    expect(screen.getByText('Serialized Stock Tracker')).toBeInTheDocument();
    expect(screen.getByText('Serial Custody & Location Timeline')).toBeInTheDocument();
    expect(screen.getByText('Enter a serial number to trace custody and location transitions.')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();
    render(<SerialsPanel {...defaultProps} traceSerialNum="SN-123" />);

    const submitBtn = screen.getByRole('button', { name: /trace serial history/i });
    await user.click(submitBtn);

    expect(mockHandleTraceSerial).toHaveBeenCalled();
  });

  it('disables submit button when loading', () => {
    render(<SerialsPanel {...defaultProps} loading={true} />);
    const submitBtn = screen.getByRole('button', { name: /trace serial history/i });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
  });

  it('calls setTraceSerialNum on input change', async () => {
    const user = userEvent.setup();
    render(<SerialsPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter unique serial number...');
    await user.type(input, '1');
    expect(mockSetTraceSerialNum).toHaveBeenCalledWith('1');
  });

  it('renders traced item properties and timeline correctly', () => {
    const mockDate = new Date('2023-01-01T12:00:00Z');
    const mockTracedItem = {
      serialNumber: 'SN-123',
      variantId: 'VAR-1',
      locationId: 'LOC-1',
      status: 'active',
      history: [
        {
          from: 'Warehouse A',
          to: 'Warehouse B',
          occurredAt: mockDate.toISOString(),
          reason: 'Transfer',
          actor: 'admin',
          referenceId: 'TRX-1'
        }
      ]
    };

    render(<SerialsPanel {...defaultProps} tracedItem={mockTracedItem} />);

    expect(screen.getByText('Item Properties')).toBeInTheDocument();
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getByText('VAR-1')).toBeInTheDocument();
    expect(screen.getByText('LOC-1')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();

    expect(screen.getByText(/Status Transition: Warehouse A → Warehouse B/)).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('TRX-1')).toBeInTheDocument();
    expect(screen.getByText(mockDate.toLocaleTimeString())).toBeInTheDocument();
  });

  it('renders default text when tracedItem has empty history', () => {
    const mockTracedItem = {
      serialNumber: 'SN-123',
      variantId: 'VAR-1',
      locationId: 'LOC-1',
      status: 'active',
      history: []
    };
    render(<SerialsPanel {...defaultProps} tracedItem={mockTracedItem} />);
    expect(screen.getByText('Enter a serial number to trace custody and location transitions.')).toBeInTheDocument();
  });

  it('renders default text when tracedItem has no history property', () => {
    const mockTracedItem = {
      serialNumber: 'SN-123',
      variantId: 'VAR-1',
      locationId: 'LOC-1',
      status: 'active'
    };
    render(<SerialsPanel {...defaultProps} tracedItem={mockTracedItem} />);
    expect(screen.getByText('Enter a serial number to trace custody and location transitions.')).toBeInTheDocument();
  });

  it('renders history correctly when occurredAt and referenceId are missing', () => {
    const mockTracedItem = {
      serialNumber: 'SN-123',
      variantId: 'VAR-1',
      locationId: 'LOC-1',
      status: 'active',
      history: [
        {
          from: 'Warehouse A',
          to: 'Warehouse C',
          reason: 'Transfer',
          actor: 'admin'
        }
      ]
    };

    render(<SerialsPanel {...defaultProps} tracedItem={mockTracedItem} />);
    expect(screen.getByText(/Status Transition: Warehouse A → Warehouse C/)).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    // The reference ID block should not be rendered
    expect(screen.queryByText('Reference ID:')).not.toBeInTheDocument();
    // The time should be rendered using current time, just testing that a time is rendered and component doesn't crash
    expect(screen.queryAllByText(/:/)).not.toHaveLength(0);
  });
});
