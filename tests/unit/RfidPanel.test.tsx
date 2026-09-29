import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RfidPanel } from '../../src/components/Panels';

describe('RfidPanel', () => {
  const mockClient = {
    getRfidTags: vi.fn(),
    subscribeRfidScans: vi.fn(),
    assignRfidTag: vi.fn(),
    simulateRfidScan: vi.fn(),
  };

  const mockLocations = [
    { id: 'loc-1', name: 'Location 1', zone: 'Zone A' },
    { id: 'loc-2', name: 'Location 2', zone: 'Zone B' },
  ];

  const tenantId = 'test-tenant';

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getRfidTags.mockResolvedValue([]);
    mockClient.subscribeRfidScans.mockReturnValue(vi.fn());
  });

  it('renders initially and fetches tags', async () => {
    const mockTags = [
      { epc: 'E123', sku: 'SKU1', serialNumber: 'SN1', status: 'active' },
    ];
    mockClient.getRfidTags.mockResolvedValueOnce(mockTags);

    render(<RfidPanel tenantId={tenantId} client={mockClient} locations={mockLocations} />);

    expect(screen.getByText('Register RFID Tag Mappings')).toBeInTheDocument();
    expect(screen.getByText('Simulate RFID Portal Scan')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockClient.getRfidTags).toHaveBeenCalledWith(tenantId);
    });

    const epcElements = screen.getAllByText('E123');
    expect(epcElements.length).toBeGreaterThan(0);

    const skuElements = screen.getAllByText('SKU1');
    expect(skuElements.length).toBeGreaterThan(0);
  });

  it('handles assignment of a new RFID tag', async () => {
    render(<RfidPanel tenantId={tenantId} client={mockClient} locations={mockLocations} />);

    await waitFor(() => expect(screen.getByText('Register RFID Tag Mappings')).toBeInTheDocument());

    const epcInput = screen.getByPlaceholderText('E28011302000762A17849C10');
    const skuInput = screen.getByPlaceholderText('SKU-GEN-SHIRT');
    const snInput = screen.getByPlaceholderText('SN-10002931');

    fireEvent.change(epcInput, { target: { value: 'NEW-EPC' } });
    fireEvent.change(skuInput, { target: { value: 'NEW-SKU' } });
    fireEvent.change(snInput, { target: { value: 'NEW-SN' } });

    fireEvent.click(screen.getByRole('button', { name: /Register Mapping/i }));

    await waitFor(() => {
      expect(mockClient.assignRfidTag).toHaveBeenCalledWith(tenantId, 'NEW-EPC', 'NEW-SKU', 'NEW-SN');
    });

    expect(screen.getByText('RFID tag assigned successfully.')).toBeInTheDocument();
  });

  it('handles scan simulation', async () => {
    render(<RfidPanel tenantId={tenantId} client={mockClient} locations={mockLocations} />);

    await waitFor(() => expect(screen.getByText('Simulate RFID Portal Scan')).toBeInTheDocument());

    const locationSelect = screen.getByRole('combobox');
    const manualEpcTextarea = screen.getByPlaceholderText(/E28011302000000000000001/);

    fireEvent.change(locationSelect, { target: { value: 'loc-1' } });
    fireEvent.change(manualEpcTextarea, { target: { value: 'MANUAL-EPC' } });

    fireEvent.click(screen.getByRole('button', { name: /Simulate Scan Ingest/i }));

    await waitFor(() => {
      expect(mockClient.simulateRfidScan).toHaveBeenCalledWith(tenantId, 'loc-1', ['MANUAL-EPC']);
    });

    expect(screen.getByText('Simulated scan of 1 tags at location loc-1.')).toBeInTheDocument();
  });
});
