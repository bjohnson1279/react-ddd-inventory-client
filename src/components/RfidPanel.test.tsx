import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RfidPanel } from './Panels';
import { RfidScanUpdate } from '../api/client';

describe('RfidPanel', () => {
  const mockTenantId = 'tenant-123';
  const mockLocations = [
    { id: 'loc-1', name: 'Warehouse A', zone: 'Zone 1' },
    { id: 'loc-2', name: 'Store Front', zone: 'Zone 2' }
  ];

  let mockClient: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockClient = {
      getRfidTags: vi.fn().mockResolvedValue([
        { epc: 'E28011302000762A17849C10', sku: 'SKU-001', serialNumber: 'SN-001', lastSeenAt: null, lastLocation: null }
      ]),
      subscribeRfidScans: vi.fn().mockReturnValue(vi.fn()), // Returns unsubscribe fn
      assignRfidTag: vi.fn().mockResolvedValue(true),
      simulateRfidScan: vi.fn().mockResolvedValue(true)
    };
    user = userEvent.setup();
  });

  it('renders and fetches initial tags', async () => {
    render(<RfidPanel tenantId={mockTenantId} client={mockClient} locations={mockLocations} />);

    expect(mockClient.getRfidTags).toHaveBeenCalledWith(mockTenantId);
    expect(mockClient.subscribeRfidScans).toHaveBeenCalledWith(mockTenantId, expect.any(Function));

    await waitFor(() => {
      expect(screen.getAllByText('E28011302000762A17849C10')[0]).toBeInTheDocument();
      expect(screen.getAllByText('SKU-001')[0]).toBeInTheDocument();
    });
  });

  it('handles assigning a new RFID tag', async () => {
    render(<RfidPanel tenantId={mockTenantId} client={mockClient} locations={mockLocations} />);

    await waitFor(() => {
      expect(screen.getAllByText('E28011302000762A17849C10')[0]).toBeInTheDocument();
    });

    const epcInput = screen.getByPlaceholderText('E28011302000762A17849C10');
    const skuInput = screen.getByPlaceholderText('SKU-GEN-SHIRT');
    const snInput = screen.getByPlaceholderText('SN-10002931');
    const submitBtn = screen.getByRole('button', { name: /Register Mapping/i });

    await user.type(epcInput, 'NEW-EPC-123');
    await user.type(skuInput, 'NEW-SKU-123');
    await user.type(snInput, 'NEW-SN-123');

    await user.click(submitBtn);

    expect(mockClient.assignRfidTag).toHaveBeenCalledWith(mockTenantId, 'NEW-EPC-123', 'NEW-SKU-123', 'NEW-SN-123');

    await waitFor(() => {
      expect(screen.getByText('RFID tag assigned successfully.')).toBeInTheDocument();
    });
  });

  it('handles simulating an RFID scan', async () => {
    render(<RfidPanel tenantId={mockTenantId} client={mockClient} locations={mockLocations} />);

    await waitFor(() => {
      expect(screen.getAllByText('E28011302000762A17849C10')[0]).toBeInTheDocument();
    });

    const locationSelect = screen.getByRole('combobox');
    await user.selectOptions(locationSelect, 'loc-1');
    expect(locationSelect).toHaveValue('loc-1');

    const tagCheckbox = screen.getByRole('checkbox');
    await user.click(tagCheckbox);

    const manualEpcTextarea = screen.getByPlaceholderText(/E28011302000000000000001/i);
    await user.type(manualEpcTextarea, 'MANUAL-EPC-1\nMANUAL-EPC-2');

    const submitBtn = screen.getByRole('button', { name: /Simulate Scan Ingest/i });
    await user.click(submitBtn);

    expect(mockClient.simulateRfidScan).toHaveBeenCalledWith(mockTenantId, 'loc-1', [
      'E28011302000762A17849C10',
      'MANUAL-EPC-1',
      'MANUAL-EPC-2'
    ]);

    await waitFor(() => {
      expect(screen.getByText('Simulated scan of 3 tags at location loc-1.')).toBeInTheDocument();
    });
  });

  it('displays scan metrics when events arrive', async () => {
    let scanCallback: any;
    mockClient.subscribeRfidScans = vi.fn().mockImplementation((tenantId, cb) => {
      scanCallback = cb;
      return vi.fn();
    });

    render(<RfidPanel tenantId={mockTenantId} client={mockClient} locations={mockLocations} />);

    await waitFor(() => {
      expect(screen.getByText('Batches Processed')).toBeInTheDocument();
    });

    const scanEvent: RfidScanUpdate = {
      id: 'batch-00000001',
      tenantId: mockTenantId,
      locationId: 'loc-1',
      totalCount: 10,
      matchedCount: 8,
      unmatchedCount: 2,
      unmatchedEpcs: ['UNREG-1', 'UNREG-2']
    };

    act(() => {
      scanCallback(scanEvent);
    });

    await waitFor(() => {
      expect(screen.getByText('80.0%')).toBeInTheDocument();
      const batchesVals = screen.getAllByText('1');
      expect(batchesVals.length).toBeGreaterThan(0);
      const scannedVals = screen.getAllByText('10');
      expect(scannedVals.length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/\[BATCH: 00000001\]/i)).toBeInTheDocument();
  });
});
