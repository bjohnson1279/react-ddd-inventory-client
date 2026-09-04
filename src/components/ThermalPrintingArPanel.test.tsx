import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ThermalPrintingArPanel } from './ThermalPrintingArPanel';
import React from 'react';

describe('ThermalPrintingArPanel', () => {
  it('renders initial thermal printing tab correctly', () => {
    render(<ThermalPrintingArPanel />);
    expect(screen.getByText('Thermal Printing & WebXR AR-Guided Operations')).toBeInTheDocument();
    expect(screen.getByText('Spool ZPL/TSPL Thermal Print Job')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send ZPL Print Command' })).toBeInTheDocument();
  });

  it('switches to AR tab when AR button is clicked', () => {
    render(<ThermalPrintingArPanel />);
    const arTabButton = screen.getByRole('button', { name: 'WebXR AR Pick & Pack Viewport' });
    fireEvent.click(arTabButton);

    expect(screen.getByText('WebXR Visual AR Spatial Guidance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Launch AR Overlay Guidance' })).toBeInTheDocument();
  });

  it('toggles AR guidance active state', () => {
    render(<ThermalPrintingArPanel />);

    // Switch to AR Tab
    const arTabButton = screen.getByRole('button', { name: 'WebXR AR Pick & Pack Viewport' });
    fireEvent.click(arTabButton);

    // Activate AR
    const launchButton = screen.getByRole('button', { name: 'Launch AR Overlay Guidance' });
    fireEvent.click(launchButton);

    expect(screen.getByText('AR LIVE CAMERA FEED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close AR Viewport' })).toBeInTheDocument();

    // Deactivate AR
    const closeButton = screen.getByRole('button', { name: 'Close AR Viewport' });
    fireEvent.click(closeButton);

    expect(screen.getByText(/Click "Launch AR Overlay Guidance" to activate/i)).toBeInTheDocument();
  });

  it('calls api printZplThermalLabel with correct arguments', async () => {
    const mockApi = {
      printZplThermalLabel: vi.fn().mockResolvedValue({
        jobId: 'TEST_JOB_123',
        printerName: 'Zebra-ZT411-DockA',
        zplCode: '^XA^FO50,50^ADN,36,20^FDTEST^FS^XZ',
        sentAt: '2023-01-01T12:00:00Z'
      })
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    const printButton = screen.getByRole('button', { name: 'Send ZPL Print Command' });
    fireEvent.click(printButton);

    expect(printButton).toHaveTextContent('Spooling ZPL Job...');
    expect(printButton).toBeDisabled();

    await waitFor(() => {
      expect(mockApi.printZplThermalLabel).toHaveBeenCalledWith({
        printerName: 'Zebra-ZT411-DockA',
        labelType: 'BIN',
        barcodeValue: 'BIN-A-102-RACK4',
        subtitle: 'High Velocity Storage Zone'
      });
    });

    expect(screen.getByText('TEST_JOB_123')).toBeInTheDocument();
    expect(screen.getByText('^XA^FO50,50^ADN,36,20^FDTEST^FS^XZ')).toBeInTheDocument();
  });

  it('handles fetch fallback correctly when no api provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        jobId: 'FETCH_JOB_456',
        printerName: 'Zebra-ZT411-DockA',
        zplCode: '^XA^FO50,50^ADN,36,20^FDFETCH^FS^XZ',
        sentAt: '2023-01-01T12:00:00Z'
      })
    });
    globalThis.fetch = mockFetch;

    render(<ThermalPrintingArPanel />);

    const printButton = screen.getByRole('button', { name: 'Send ZPL Print Command' });
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/hardware/print-thermal', expect.objectContaining({
        method: 'POST'
      }));
    });

    await waitFor(() => expect(screen.getByText('FETCH_JOB_456')).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByText('FETCH_JOB_456')).toBeInTheDocument();
    });
    expect(screen.getByText('^XA^FO50,50^ADN,36,20^FDFETCH^FS^XZ')).toBeInTheDocument();
  });
});
