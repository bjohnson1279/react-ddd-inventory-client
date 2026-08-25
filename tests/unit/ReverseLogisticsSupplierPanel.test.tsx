import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReverseLogisticsSupplierPanel } from '../../src/components/ReverseLogisticsSupplierPanel';

describe('ReverseLogisticsSupplierPanel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders default rma tab and text', () => {
    render(<ReverseLogisticsSupplierPanel />);
    expect(screen.getByText('Reverse Logistics & Supplier Portal Workflow')).toBeInTheDocument();
    expect(screen.getByText('RMA Returns Inspection & Grading')).toBeInTheDocument();
    expect(screen.queryByText('Submit Inbound Supplier ASN')).not.toBeInTheDocument();
  });

  it('switches to supplier tab', () => {
    render(<ReverseLogisticsSupplierPanel />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);
    expect(screen.getByText('Submit Inbound Supplier ASN')).toBeInTheDocument();
    expect(screen.getByText('Supplier OTIF Performance Scorecard')).toBeInTheDocument();
    expect(screen.queryByText('RMA Returns Inspection & Grading')).not.toBeInTheDocument();
  });

  it('handles RMA inspection API fallback flow', async () => {
    const mockRmaResponse = {
      rmaNumber: 'RMA-8001',
      sku: 'SKU-1002',
      disposition: 'RESTOCK',
      actionTaken: 'Restocked to bin',
      notes: 'Undamaged',
      processedAt: '2023-10-10T12:00:00Z',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockRmaResponse),
    });

    render(<ReverseLogisticsSupplierPanel />);
    const inspectBtn = screen.getByText('Complete RMA Inspection');
    fireEvent.click(inspectBtn);

    expect(screen.getByText('Processing Disposition...')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rma/inspect', expect.any(Object));
    });

    expect(await screen.findByText('Inspection Processed')).toBeInTheDocument();
    expect(screen.getByText('Restocked to bin')).toBeInTheDocument();
  });

  it('handles RMA API error flow', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));

    render(<ReverseLogisticsSupplierPanel />);
    const inspectBtn = screen.getByText('Complete RMA Inspection');
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });

  it('handles ASN API fallback submission flow', async () => {
    const mockAsnResponse = {
      asnNumber: 'ASN-409',
      status: 'RECEIVED'
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockAsnResponse),
    });

    render(<ReverseLogisticsSupplierPanel />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const submitBtn = screen.getByText('Submit Supplier ASN');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/supplier/asn', expect.any(Object));
    });

    expect(await screen.findByText(/ASN Submitted:/)).toBeInTheDocument();
    expect(screen.getByText(/RECEIVED/)).toBeInTheDocument();
  });

  it('handles ASN API error flow', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error on ASN'));

    render(<ReverseLogisticsSupplierPanel />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const submitBtn = screen.getByText('Submit Supplier ASN');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Network error on ASN')).toBeInTheDocument();
    });
  });

  it('handles Fetch Scorecard fallback flow', async () => {
    const mockScorecardResponse = {
      otifScore: 95,
      onTimeRate: 98,
      inFullRate: 97,
      defectRate: 1,
      totalShipments: 10
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockScorecardResponse),
    });

    render(<ReverseLogisticsSupplierPanel />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const fetchBtn = screen.getByText('Fetch Scorecard');
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/supplier/otif-scorecard?supplierId=SUP-101');
    });

    expect(await screen.findByText('95%')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
    expect(screen.getByText('97%')).toBeInTheDocument();
    expect(screen.getByText('1%')).toBeInTheDocument();
    expect(screen.getByText(/Evaluated across 10 historical PO shipments/)).toBeInTheDocument();
  });

  it('handles Fetch Scorecard API error flow', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Fetch error'));

    render(<ReverseLogisticsSupplierPanel />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const fetchBtn = screen.getByText('Fetch Scorecard');
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(screen.getByText('Fetch error')).toBeInTheDocument();
    });
  });

  it('handles RMA inspection API flow with mocked api prop', async () => {
    const mockRmaResponse = {
      rmaNumber: 'RMA-8001',
      sku: 'SKU-1002',
      disposition: 'RESTOCK',
      actionTaken: 'Restocked to bin via mock',
      notes: 'Undamaged',
      processedAt: '2023-10-10T12:00:00Z',
    };
    const mockApi = {
      inspectRMAItem: vi.fn().mockResolvedValue(mockRmaResponse),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);
    const inspectBtn = screen.getByText('Complete RMA Inspection');
    fireEvent.click(inspectBtn);

    expect(screen.getByText('Processing Disposition...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.inspectRMAItem).toHaveBeenCalled();
    });

    expect(await screen.findByText('Inspection Processed')).toBeInTheDocument();
    expect(screen.getByText('Restocked to bin via mock')).toBeInTheDocument();
  });

  it('handles ASN API submission flow with mocked api prop', async () => {
    const mockAsnResponse = {
      asnNumber: 'ASN-409',
      status: 'RECEIVED-MOCK'
    };
    const mockApi = {
      submitSupplierASN: vi.fn().mockResolvedValue(mockAsnResponse),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const submitBtn = screen.getByText('Submit Supplier ASN');
    fireEvent.click(submitBtn);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.submitSupplierASN).toHaveBeenCalled();
    });

    expect(await screen.findByText(/ASN Submitted:/)).toBeInTheDocument();
    expect(screen.getByText(/RECEIVED-MOCK/)).toBeInTheDocument();
  });

  it('handles Fetch Scorecard flow with mocked api prop', async () => {
    const mockScorecardResponse = {
      otifScore: 92,
      onTimeRate: 94,
      inFullRate: 96,
      defectRate: 2,
      totalShipments: 12
    };
    const mockApi = {
      getSupplierOTIFScorecard: vi.fn().mockResolvedValue(mockScorecardResponse),
    };

    render(<ReverseLogisticsSupplierPanel api={mockApi} />);
    const supplierTabBtn = screen.getByText('Supplier ASN & OTIF Scorecard');
    fireEvent.click(supplierTabBtn);

    const fetchBtn = screen.getByText('Fetch Scorecard');
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(mockApi.getSupplierOTIFScorecard).toHaveBeenCalled();
    });

    expect(await screen.findByText('92%')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.getByText(/Evaluated across 12 historical PO shipments/)).toBeInTheDocument();
  });

});