import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcurementPanel } from './Panels';

describe('ProcurementPanel', () => {
  const mockHandleCreatePurchaseOrder = vi.fn((e) => e.preventDefault());
  const mockHandleReceivePO = vi.fn((e) => e.preventDefault());
  const mockHandleApprovePO = vi.fn();
  const mockHandleSendPO = vi.fn();
  const mockSetNewPoSupplier = vi.fn();
  const mockSetNewPoLines = vi.fn();
  const mockSetReceivePoId = vi.fn();
  const mockSetReceivePoLines = vi.fn();

  const getDefaultProps = () => ({
    newPoSupplier: 'Valid Supplier',
    setNewPoSupplier: mockSetNewPoSupplier,
    newPoLines: [{ sku: 'VALID-SKU', quantity: 1, unitCostCents: 1000 }],
    setNewPoLines: mockSetNewPoLines,
    handleCreatePurchaseOrder: mockHandleCreatePurchaseOrder,
    purchaseOrders: [],
    receivePoId: '',
    setReceivePoId: mockSetReceivePoId,
    receivePoLines: [],
    setReceivePoLines: mockSetReceivePoLines,
    handleReceivePO: mockHandleReceivePO,
    handleApprovePO: mockHandleApprovePO,
    handleSendPO: mockHandleSendPO,
    loading: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with no purchase orders', () => {
    render(<ProcurementPanel {...getDefaultProps()} />);

    expect(screen.getByText('Create Purchase Order (PO) Draft')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order Registry')).toBeInTheDocument();
    expect(screen.getByText('No Purchase Orders registered in local storage or backend.')).toBeInTheDocument();
  });

  it('allows drafting a new purchase order', async () => {
    render(<ProcurementPanel {...getDefaultProps()} />);

    const user = userEvent.setup();
    const supplierInput = screen.getByPlaceholderText('e.g. Acme Supplies Ltd.');
    await user.type(supplierInput, 'Acme Corp');
    expect(mockSetNewPoSupplier).toHaveBeenCalled();

    const skuInput = screen.getByPlaceholderText('SKU');
    await user.type(skuInput, 'TEST-SKU');

    const draftButton = screen.getByRole('button', { name: /Draft Purchase Order/i });
    await user.click(draftButton);
    expect(mockHandleCreatePurchaseOrder).toHaveBeenCalled();
  });

  it('adds a new item row when requested', async () => {
    render(<ProcurementPanel {...getDefaultProps()} />);

    const user = userEvent.setup();
    const addRowButton = screen.getByRole('button', { name: /\+ Add Item Row/i });
    await user.click(addRowButton);

    expect(mockSetNewPoLines).toHaveBeenCalledWith([
      { sku: 'VALID-SKU', quantity: 1, unitCostCents: 1000 },
      { sku: '', quantity: 1, unitCostCents: 1000 }
    ]);
  });

  it('displays purchase orders and allows approval', async () => {
    const props = {
      ...getDefaultProps(),
      purchaseOrders: [
        {
          id: 'PO-1',
          supplier: 'Test Supplier',
          status: 'draft',
          items: [{ sku: 'SKU-1', quantity: 10, unitCostCents: 500 }],
          createdAt: new Date().toISOString()
        }
      ]
    };

    render(<ProcurementPanel {...props} />);

    expect(screen.getByText('Test Supplier')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();

    const user = userEvent.setup();
    const approveButton = screen.getByRole('button', { name: /Approve/i });
    await user.click(approveButton);
    expect(mockHandleApprovePO).toHaveBeenCalledWith('PO-1');
  });

  it('allows sending an approved PO', async () => {
    const props = {
      ...getDefaultProps(),
      purchaseOrders: [
        {
          id: 'PO-2',
          supplier: 'Test Supplier',
          status: 'approved',
          items: [{ sku: 'SKU-1', quantity: 10, unitCostCents: 500 }],
          createdAt: new Date().toISOString()
        }
      ]
    };

    render(<ProcurementPanel {...props} />);

    const user = userEvent.setup();
    const sendButton = screen.getByRole('button', { name: /Send PO/i });
    await user.click(sendButton);
    expect(mockHandleSendPO).toHaveBeenCalledWith('PO-2');
  });

  it('displays receive inventory section for sent POs', async () => {
    const props = {
      ...getDefaultProps(),
      purchaseOrders: [
        {
          id: 'PO-3',
          supplier: 'Supplier With Sent PO',
          status: 'sent',
          items: [{ sku: 'SKU-RECV', quantity: 10, unitCostCents: 500 }],
          createdAt: new Date().toISOString()
        }
      ],
      receivePoId: 'PO-3',
      receivePoLines: [{ sku: 'SKU-RECV', quantity: 10 }]
    };

    render(<ProcurementPanel {...props} />);

    expect(screen.getByText('Receive Purchase Order Inventory')).toBeInTheDocument();

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'PO-3');
    expect(mockSetReceivePoId).toHaveBeenCalled();

    const fulfillButton = screen.getByRole('button', { name: /Fulfill PO & Receive Stock/i });
    await user.click(fulfillButton);
    expect(mockHandleReceivePO).toHaveBeenCalled();
  });
});
