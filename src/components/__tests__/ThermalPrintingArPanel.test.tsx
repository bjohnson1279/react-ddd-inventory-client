import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThermalPrintingArPanel } from '../ThermalPrintingArPanel';

describe('ThermalPrintingArPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly', () => {
    render(<ThermalPrintingArPanel />);
    expect(screen.getByText('Thermal Printing & WebXR AR-Guided Operations')).toBeDefined();
  });

  it('handles error path when printZplThermalLabel throws an error', async () => {
    const mockApi = {
      printZplThermalLabel: vi.fn().mockRejectedValue(new Error('Network Error'))
    };

    render(<ThermalPrintingArPanel api={mockApi} />);

    // Switch to thermal sub tab if not already active (it is default, but just in case)
    // Click the print button
    const printButton = screen.getByRole('button', { name: /Send ZPL Print Command/i });
    fireEvent.click(printButton);

    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network Error');
    });
  });

  it('handles error path when fetch throws an error (no api handler provided)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Fetch Network Error'));
    global.fetch = mockFetch;

    render(<ThermalPrintingArPanel />);

    // Click the print button
    const printButton = screen.getByRole('button', { name: /Send ZPL Print Command/i });
    fireEvent.click(printButton);

    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Fetch Network Error');
    });
  });
});
