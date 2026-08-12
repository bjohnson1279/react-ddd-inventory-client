import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, describe, it, vi } from 'vitest';
import { ReverseLogisticsSupplierPanel } from '../../src/components/ReverseLogisticsSupplierPanel';

describe('ReverseLogisticsSupplierPanel', () => {
  it('renders RMA Returns tab by default', () => {
    render(<ReverseLogisticsSupplierPanel />);
    expect(screen.getByText('RMA Returns Inspection & Grading')).toBeInTheDocument();

    // Check for some text instead of label to avoid form control warnings due to missing HTML id
    expect(screen.getByText('RMA Number')).toBeInTheDocument();
  });

  it('switches to Supplier ASN & OTIF Scorecard tab', () => {
    render(<ReverseLogisticsSupplierPanel />);

    // Click the supplier tab
    const supplierTab = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTab);

    // Verify RMA content is gone
    expect(screen.queryByText('RMA Returns Inspection & Grading')).not.toBeInTheDocument();

    // Verify Supplier content is shown
    expect(screen.getByText('Submit Inbound Supplier ASN')).toBeInTheDocument();
    expect(screen.getByText('Supplier OTIF Performance Scorecard')).toBeInTheDocument();
  });

  it('calls api.inspectRMAItem on complete rma inspection', async () => {
    const mockApi = {
      inspectRMAItem: vi.fn().mockResolvedValue({
        rmaNumber: 'RMA-8001',
        sku: 'SKU-1002',
        disposition: 'RESTOCK',
        actionTaken: 'Item restocked successfully',
        notes: 'Good condition',
        processedAt: '2023-01-01T12:00:00Z',
      }),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);

    // Fill out form
    const inputs = screen.getAllByRole('textbox');
    // Assuming the textarea is the third textbox or we can find it by value
    const notesInput = screen.getByDisplayValue('Item undamaged in original packaging');
    fireEvent.change(notesInput, { target: { value: 'Good condition' } });

    // Submit
    const button = screen.getByText('Complete RMA Inspection');
    fireEvent.click(button);

    // Check loading state
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Processing Disposition...');

    await waitFor(() => {
      expect(mockApi.inspectRMAItem).toHaveBeenCalledWith({
        rmaNumber: 'RMA-8001',
        sku: 'SKU-1002',
        disposition: 'RESTOCK',
        notes: 'Good condition',
      });
    });

    // Check results displayed
    expect(screen.getByText('Inspection Processed')).toBeInTheDocument();
    expect(screen.getByText('Item restocked successfully')).toBeInTheDocument();
  });

  it('calls api.submitSupplierASN on submit supplier ASN', async () => {
    const mockApi = {
      submitSupplierASN: vi.fn().mockResolvedValue({
        asnNumber: 'ASN-409',
        status: 'RECEIVED',
      }),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);

    // Switch to supplier tab
    fireEvent.click(screen.getByText('Supplier ASN & OTIF Scorecard'));

    // Submit
    const button = screen.getByText('Submit Supplier ASN');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApi.submitSupplierASN).toHaveBeenCalledWith({
        asnNumber: 'ASN-409',
        supplierId: 'SUP-101',
        expectedDelivery: '2026-08-10',
        lineItemsJson: JSON.stringify([{ sku: 'SKU-1001', quantity: 100 }]),
      });
    });

    // Check results displayed
    expect(screen.getByText(/ASN Submitted: ASN-409/)).toBeInTheDocument();
  });

  it('calls fetch when api methods are missing for RMA inspection', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        rmaNumber: 'RMA-8001',
        sku: 'SKU-1002',
        disposition: 'RESTOCK',
        actionTaken: 'Item restocked successfully via fetch',
        notes: 'Good condition',
        processedAt: '2023-01-01T12:00:00Z',
      }),
    });

    render(<ReverseLogisticsSupplierPanel api={{}} />);

    // Submit
    fireEvent.click(screen.getByText('Complete RMA Inspection'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rma/inspect', expect.any(Object));
    });

    // Check results displayed
    expect(screen.getByText('Item restocked successfully via fetch')).toBeInTheDocument();
  });

  it('displays error message on API failure', async () => {
    const mockApi = {
      inspectRMAItem: vi.fn().mockRejectedValue(new Error('Inspection failed due to backend error')),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);

    fireEvent.click(screen.getByText('Complete RMA Inspection'));

    await waitFor(() => {
      const errorMsg = screen.getByText('Inspection failed due to backend error');
      expect(errorMsg).toBeInTheDocument();
      expect(errorMsg.closest('div')).toHaveAttribute('role', 'alert');
    });
  });

  it('calls api.getSupplierOTIFScorecard and displays scorecard', async () => {
    const mockApi = {
      getSupplierOTIFScorecard: vi.fn().mockResolvedValue({
        otifScore: 95,
        onTimeRate: 98,
        inFullRate: 96,
        defectRate: 2,
        totalShipments: 150,
      }),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);

    // Switch to supplier tab
    fireEvent.click(screen.getByText('Supplier ASN & OTIF Scorecard'));

    // Change supplier ID
    const inputs = screen.getAllByPlaceholderText('Supplier ID');
    fireEvent.change(inputs[0], { target: { value: 'SUP-999' } });

    // Submit
    const button = screen.getByText('Fetch Scorecard');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApi.getSupplierOTIFScorecard).toHaveBeenCalledWith({
        supplierId: 'SUP-999',
      });
    });

    // Check results displayed
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.getByText('Evaluated across 150 historical PO shipments')).toBeInTheDocument();
  });
});
