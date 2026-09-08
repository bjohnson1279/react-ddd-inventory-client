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

  it('updates line item inputs correctly', async () => {
    render(<ProcurementPanel {...getDefaultProps()} />);
    const user = userEvent.setup();

    const skuInput = screen.getByPlaceholderText('SKU');
    await user.clear(skuInput);
    await user.type(skuInput, 'TEST-SKU');
    // Since it's a controlled component and we don't update state in this test wrapper,
    // the value remains "VALID-SKU". userEvent.type will append/replace characters based on selection.
    // It's safer to just check that it was called.
    expect(mockSetNewPoLines).toHaveBeenCalled();

    const qtyInput = screen.getByPlaceholderText('Qty');
    await user.clear(qtyInput);
    await user.type(qtyInput, '5');
    expect(mockSetNewPoLines).toHaveBeenCalled();

    const unitCostInput = screen.getByPlaceholderText('Unit Cost (Cents)');
    await user.clear(unitCostInput);
    await user.type(unitCostInput, '2000');
    expect(mockSetNewPoLines).toHaveBeenCalled();
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

  it('displays receive inventory section for sent POs and allows selecting a PO', async () => {
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
      ]
    };

    render(<ProcurementPanel {...props} />);

    expect(screen.getByText('Receive Purchase Order Inventory')).toBeInTheDocument();

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'PO-3');
    expect(mockSetReceivePoId).toHaveBeenCalledWith('PO-3');
    expect(mockSetReceivePoLines).toHaveBeenCalledWith([{ sku: 'SKU-RECV', quantity: 10 }]);
  });

  it('updates receipt quantities correctly and fulfills PO', async () => {
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

    const user = userEvent.setup();

    const qtyInputs = screen.getAllByRole('spinbutton');
    const receiveQtyInput = qtyInputs[qtyInputs.length - 1]; // last one is the receive quantity

    await user.clear(receiveQtyInput);
    await user.type(receiveQtyInput, '15');

    expect(mockSetReceivePoLines).toHaveBeenCalled();

    const fulfillButton = screen.getByRole('button', { name: /Fulfill PO & Receive Stock/i });
    await user.click(fulfillButton);
    expect(mockHandleReceivePO).toHaveBeenCalled();
  });

  it('disables buttons when loading is true', () => {
    render(<ProcurementPanel {...getDefaultProps()} loading={true} />);

    // The "Draft Purchase Order" button text is replaced by a Spinner, so we find it by type="submit" in the first form
    // Actually we can find it by its aria-busy attribute since it's the only one with aria-busy in the panel
    // Wait, all submit buttons have aria-busy={loading}
    const buttons = screen.getAllByRole('button');
    // buttons[0] is Add Item Row
    // buttons[1] is Draft Purchase Order
    expect(buttons[1]).toBeDisabled();
    expect(buttons[1]).toHaveAttribute('aria-busy', 'true');
  });

  it('displays different PO statuses with correct badges', () => {
    const props = {
      ...getDefaultProps(),
      purchaseOrders: [
        {
          id: 'PO-1',
          supplier: 'Draft Supplier',
          status: 'draft',
          items: [{ sku: 'SKU-1', quantity: 1, unitCostCents: 100 }],
          createdAt: new Date().toISOString()
        },
        {
          id: 'PO-2',
          supplier: 'Approved Supplier',
          status: 'approved',
          items: [{ sku: 'SKU-2', quantity: 1, unitCostCents: 100 }],
          createdAt: new Date().toISOString()
        },
        {
          id: 'PO-3',
          supplier: 'Sent Supplier',
          status: 'sent',
          items: [{ sku: 'SKU-3', quantity: 1, unitCostCents: 100 }],
          createdAt: new Date().toISOString()
        },
        {
          id: 'PO-4',
          supplier: 'Received Supplier',
          status: 'received',
          items: [{ sku: 'SKU-4', quantity: 1, unitCostCents: 100 }],
          createdAt: new Date().toISOString()
        }
      ]
    };

    render(<ProcurementPanel {...props} />);

    expect(screen.getByText('DRAFT')).toHaveClass('badge-warning');
    expect(screen.getByText('APPROVED')).toHaveClass('badge-info');
    expect(screen.getByText('SENT')).toHaveClass('badge-primary');
    expect(screen.getByText('RECEIVED')).toHaveClass('badge-success');
  });
});
