import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RFIDBulkScannerView } from '../../src/components/RFIDBulkScannerView';

describe('RFIDBulkScannerView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('renders correctly', () => {
    render(<RFIDBulkScannerView />);

    expect(screen.getByText('Simulate IoT Antenna Bulk Batch Ingest')).toBeInTheDocument();
    expect(screen.getByText('Batch Tag Count:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Execute Bulk RFID Ingest' })).toBeInTheDocument();
  });

  it('updates batch tag count on select change', () => {
    render(<RFIDBulkScannerView />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('1000'); // Default value

    fireEvent.change(select, { target: { value: '5000' } });
    expect(select).toHaveValue('5000');
  });

  it('updates button state during scan simulation', () => {
    render(<RFIDBulkScannerView />);

    const button = screen.getByRole('button', { name: 'Execute Bulk RFID Ingest' });

    fireEvent.click(button);

    // The button text should change to "Processing Ingest..." and become disabled
    expect(screen.getByRole('button', { name: 'Processing Ingest...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Processing Ingest...' })).toBeDisabled();
  });

  it('displays processing results after scan finishes', () => {
    render(<RFIDBulkScannerView />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '5000' } });

    const button = screen.getByRole('button', { name: 'Execute Bulk RFID Ingest' });
    fireEvent.click(button);

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Check for success message
    expect(screen.getByText('✓ Batch Successfully Processed')).toBeInTheDocument();

    // Check for headers
    expect(screen.getByText('Total Scanned')).toBeInTheDocument();
    expect(screen.getByText('Unique EPC Tags')).toBeInTheDocument();
    expect(screen.getByText('Duplicates Deduplicated')).toBeInTheDocument();
    expect(screen.getByText('Execution Latency')).toBeInTheDocument();

    // Check for correct values based on 5000 tags
    // total = 5000
    // unique = Math.floor(5000 * 0.94) = 4700
    // duplicates = 5000 - 4700 = 300
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('4,700')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();

    // Execution latency text (ms) is random between 12 and 30, so we just check for ms
    expect(screen.getByText(/ms$/)).toBeInTheDocument();
  });

  it('updates processing results correctly on consecutive scans', () => {
    render(<RFIDBulkScannerView />);

    const select = screen.getByRole('combobox');
    const button = screen.getByRole('button', { name: 'Execute Bulk RFID Ingest' });

    // First scan with 1000 tags
    fireEvent.change(select, { target: { value: '1000' } });
    fireEvent.click(button);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('940')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();

    // Second scan with 500 tags
    fireEvent.change(select, { target: { value: '500' } });
    fireEvent.click(button);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // 500 tags
    // unique = Math.floor(500 * 0.94) = 470
    // duplicates = 500 - 470 = 30
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('470')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('handles 10000 tags option correctly', () => {
    render(<RFIDBulkScannerView />);

    const select = screen.getByRole('combobox');
    const button = screen.getByRole('button', { name: 'Execute Bulk RFID Ingest' });

    fireEvent.change(select, { target: { value: '10000' } });
    fireEvent.click(button);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // 10000 tags
    // unique = Math.floor(10000 * 0.94) = 9400
    // duplicates = 10000 - 9400 = 600
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('9,400')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });
});
