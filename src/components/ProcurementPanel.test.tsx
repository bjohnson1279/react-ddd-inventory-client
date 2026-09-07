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
    const approveButton = screen.getByRole('button', { name: /Approve purchase order/i });
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
  it('updates draft PO line items correctly', async () => {
    render(<ProcurementPanel {...getDefaultProps()} />);
    const user = userEvent.setup();

    const skuInput = screen.getByPlaceholderText('SKU');
    await user.clear(skuInput);
    await user.type(skuInput, 'NEW-SKU');

    const qtyInput = screen.getByPlaceholderText('Qty');
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');

    const costInput = screen.getByPlaceholderText('Unit Cost (Cents)');
    await user.clear(costInput);
    await user.type(costInput, '1500');

    expect(mockSetNewPoLines).toHaveBeenCalled();
  });

  it('updates receipt quantities correctly', async () => {
    const props = {
      ...getDefaultProps(),
      purchaseOrders: [
        {
          id: 'PO-3',
          supplier: 'Supplier',
          status: 'sent',
          items: [{ sku: 'SKU-RECV', quantity: 10, unitCostCents: 500 }],
          createdAt: new Date().toISOString()
        }
      ],
      receivePoId: 'PO-3',
      receivePoLines: [{ sku: 'SKU-RECV', quantity: 10 }]
    };

    render(<ProcurementPanel {...props} />);
    const user = userEvent.setup();

    const spinbuttons = screen.getAllByRole('spinbutton');
    const receiptQtyInput = spinbuttons[spinbuttons.length - 1];

    await user.clear(receiptQtyInput);
    await user.type(receiptQtyInput, '12');

    expect(mockSetReceivePoLines).toHaveBeenCalled();
  });

  it('disables submit buttons when loading is true', () => {
    const props = {
      ...getDefaultProps(),
      loading: true,
      purchaseOrders: [
        {
          id: 'PO-3',
          supplier: 'Supplier',
          status: 'sent',
          items: [{ sku: 'SKU-RECV', quantity: 10, unitCostCents: 500 }],
          createdAt: new Date().toISOString()
        }
      ],
      receivePoId: 'PO-3',
      receivePoLines: [{ sku: 'SKU-RECV', quantity: 10 }]
    };

    const { container } = render(<ProcurementPanel {...props} />);

    // Since loading replaces button text with Spinner, get the submit buttons by querySelector
    const submitButtons = container.querySelectorAll('button[type="submit"]');

    expect(submitButtons.length).toBe(2);

    expect(submitButtons[0]).toBeDisabled();
    expect(submitButtons[0]).toHaveAttribute('aria-busy', 'true');

    expect(submitButtons[1]).toBeDisabled();
    expect(submitButtons[1]).toHaveAttribute('aria-busy', 'true');
  });
});
