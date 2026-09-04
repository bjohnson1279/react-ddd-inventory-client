import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ScanningPanel } from './Panels';

describe('ScanningPanel', () => {
  const defaultProps = {
    scanVal: '',
    setScanVal: vi.fn(),
    scanContext: 'receive',
    setScanContext: vi.fn(),
    scanAmount: 1,
    setScanAmount: vi.fn(),
    scanActualQty: 0,
    setScanActualQty: vi.fn(),
    handleDispatchScan: vi.fn((e) => {
      if (e && e.preventDefault) e.preventDefault();
    }),
    scanHistory: [],
    loading: false,
    isOnline: true,
    offlineQueueCount: 0,
    handleSyncQueue: vi.fn(),
  };

  it('renders basic form elements and online status', () => {
    render(<ScanningPanel {...defaultProps} />);
    expect(screen.getByText('Barcode Scanning Simulator')).toBeInTheDocument();
    expect(screen.getByText('ONLINE')).toBeInTheDocument();

    // Verify label texts
    expect(screen.getByText('Scanned Barcode Value')).toBeInTheDocument();
    expect(screen.getByText('Fulfillment/Routing Context')).toBeInTheDocument();
    expect(screen.getByText('Scanned Package Increment Quantity')).toBeInTheDocument();
    expect(screen.getByText('Actual Store Count (Audit Context Only)')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Dispatch Barcode Scan' })).toBeInTheDocument();
    expect(screen.getByText('No active scans recorded in this session.')).toBeInTheDocument();
  });

  it('renders offline alert when isOnline is false', () => {
    render(<ScanningPanel {...defaultProps} isOnline={false} />);
    expect(screen.getByText('OFFLINE MODE')).toBeInTheDocument();
    expect(screen.getByText(/Industrial Dead Zone Alert:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buffer Barcode Offline' })).toBeInTheDocument();
  });

  it('renders queued scans alert and sync button when online and offlineQueueCount > 0', () => {
    render(<ScanningPanel {...defaultProps} offlineQueueCount={3} />);
    expect(screen.getByText(/You have 3 scan\(s\) waiting in IndexedDB queue./i)).toBeInTheDocument();
    const syncBtn = screen.getByRole('button', { name: 'Sync Queue Now' });
    expect(syncBtn).toBeInTheDocument();
  });

  it('calls setter props when inputs change', async () => {
    const user = userEvent.setup();
    render(<ScanningPanel {...defaultProps} />);

    const textInputs = screen.getAllByRole('textbox');
    const barcodeInput = textInputs[0];
    await user.type(barcodeInput, 'A');
    expect(defaultProps.setScanVal).toHaveBeenCalledWith('A');

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'dispatch');
    expect(defaultProps.setScanContext).toHaveBeenCalledWith('dispatch');

    const numInputs = screen.getAllByRole('spinbutton');
    const amountInput = numInputs[0];
    await user.type(amountInput, '2');
    expect(defaultProps.setScanAmount).toHaveBeenCalled();

    const qtyInput = numInputs[1];
    await user.type(qtyInput, '5');
    expect(defaultProps.setScanActualQty).toHaveBeenCalled();
  });

  it('calls handleDispatchScan on form submission', async () => {
    const user = userEvent.setup();
    render(<ScanningPanel {...defaultProps} scanVal="12345" />);
    const submitBtn = screen.getByRole('button', { name: 'Dispatch Barcode Scan' });
    await user.click(submitBtn);
    expect(defaultProps.handleDispatchScan).toHaveBeenCalled();
  });

  it('renders scan history correctly', () => {
    const history = [
      { time: '10:00', scan: 'ABC', context: 'receive', status: 'Success' },
      { time: '10:05', scan: 'DEF', context: 'dispatch', status: 'Error: invalid' }
    ];
    render(<ScanningPanel {...defaultProps} scanHistory={history} />);

    expect(screen.queryByText('No active scans recorded in this session.')).not.toBeInTheDocument();
    expect(screen.getByText('ABC')).toBeInTheDocument();
    expect(screen.getByText('RECEIVE')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();

    expect(screen.getByText('DEF')).toBeInTheDocument();
    expect(screen.getByText('DISPATCH')).toBeInTheDocument();
    expect(screen.getByText('Error: invalid')).toBeInTheDocument();
  });
});
