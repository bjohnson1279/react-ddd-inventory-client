import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinancialAccountingPanel } from './FinancialAccountingPanel';
import type { PythonRESTAdapter } from '../api/python';

afterEach(cleanup);

describe('Python financial accounting panel', () => {
  it('shows actual opening values and prevents activation while stock is unpriced', async () => {
    const client = { getFinancialStatus: vi.fn().mockResolvedValue({ active: false, version: 0 }),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({ complete: false, onHandValueCents: null, inTransitValueCents: null,
        method: 'ACCRUAL', problems: [{ sku: 'ITEM', reason: 'Unpriced stock' }] }), activateFinancialAccounting: vi.fn() };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    expect(await screen.findByText('ITEM: Unpriced stock')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Start financial accounting' }) as HTMLButtonElement).disabled).toBe(true);
    expect(client.activateFinancialAccounting).not.toHaveBeenCalled();
    expect(client.getFinancialOpeningPreview).toHaveBeenCalledWith('store');
  });

  it('starts a reviewed book once and displays exact balances and reconciliation', async () => {
    const posted = vi.fn();
    const client = { getFinancialStatus: vi.fn().mockResolvedValueOnce({ active: false, version: 0 })
      .mockResolvedValue({ active: true, method: 'ACCRUAL', version: 2, closedThrough: null }),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({ complete: true, onHandValueCents: 1001, inTransitValueCents: 0, method: 'ACCRUAL', problems: [] }),
      activateFinancialAccounting: vi.fn().mockResolvedValue({ active: true }),
      getFinancialTrialBalance: vi.fn().mockResolvedValue({ isBalanced: true, complete: true, accounts: [
        { accountCode: '1200', accountName: 'Inventory', balanceCents: 1001 }, { accountCode: '3000', accountName: 'Opening equity', balanceCents: -1001 }] }),
      getFinancialReconciliation: vi.fn().mockResolvedValue({ isReconciled: true, ledgerInventoryCents: 1001, ledgerTransitCents: 0 }) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={posted} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start financial accounting' }));
    await waitFor(() => expect(posted).toHaveBeenCalledOnce());
    expect(client.activateFinancialAccounting).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'store', expectedVersion: 0, mutationId: expect.any(String) }));
    expect(await screen.findByText('1200 Inventory')).toBeDefined();
    expect(screen.getAllByText('$10.01').length).toBeGreaterThan(0);
    expect(screen.getByText(/Matches stock carrying values/)).toBeDefined();
    expect(screen.getByLabelText('Close through (UTC date)')).toBeDefined();
  });

  it('surfaces permission and backend failures instead of showing a healthy empty ledger', async () => {
    const client = { getFinancialStatus: vi.fn().mockRejectedValue(new Error('Finance permission required')) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Finance permission required');
    expect(screen.queryByText(/All stock sources resolved/)).toBeNull();
  });

  it('closes a financial period successfully', async () => {
    const posted = vi.fn();
    const client = {
      getFinancialStatus: vi.fn()
        .mockResolvedValueOnce({ active: true, method: 'ACCRUAL', version: 3, closedThrough: null })
        .mockResolvedValue({ active: true, method: 'ACCRUAL', version: 4, closedThrough: '2026-03-31' }),
      getFinancialTrialBalance: vi.fn().mockResolvedValue({
        isBalanced: true,
        complete: true,
        accounts: [{ accountCode: '1200', accountName: 'Inventory', balanceCents: 5000 }],
      }),
      getFinancialReconciliation: vi.fn().mockResolvedValue({
        isReconciled: true,
        ledgerInventoryCents: 5000,
        ledgerTransitCents: 0,
      }),
      closeFinancialPeriod: vi.fn().mockResolvedValue({ success: true }),
    };

    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={posted} />);

    await screen.findByLabelText('Close through (UTC date)');
    const cutoffInput = screen.getByLabelText('Close through (UTC date)');
    const reasonInput = screen.getByLabelText('Review reason');
    const submitBtn = screen.getByRole('button', { name: 'Close completed period' });

    // Submit button disabled when reason is empty or whitespace
    expect(submitBtn).toBeDisabled();

    fireEvent.change(cutoffInput, { target: { value: '2026-03-31' } });
    fireEvent.change(reasonInput, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: 'Month-end audit complete' } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => expect(posted).toHaveBeenCalledOnce());
    expect(client.closeFinancialPeriod).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'store',
        expectedVersion: 3,
        mutationId: expect.any(String),
        reason: 'Month-end audit complete',
        closedThrough: '2026-03-31',
      }),
    );
    expect(screen.getByText('Accounting period closed.')).toBeInTheDocument();
    expect(await screen.findByText(/Closed through: 2026-03-31/)).toBeInTheDocument();
  });

  it('handles error during period close', async () => {
    const posted = vi.fn();
    const client = {
      getFinancialStatus: vi.fn().mockResolvedValue({ active: true, method: 'ACCRUAL', version: 3, closedThrough: null }),
      getFinancialTrialBalance: vi.fn().mockResolvedValue({ isBalanced: true, complete: true, accounts: [] }),
      getFinancialReconciliation: vi.fn().mockResolvedValue({ isReconciled: true, ledgerInventoryCents: 0, ledgerTransitCents: 0 }),
      closeFinancialPeriod: vi.fn().mockRejectedValue(Object.assign(new Error('Period already closed or version conflict'), { status: 409 })),
    };

    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={posted} />);

    await screen.findByLabelText('Close through (UTC date)');
    fireEvent.change(screen.getByLabelText('Close through (UTC date)'), { target: { value: '2026-03-31' } });
    fireEvent.change(screen.getByLabelText('Review reason'), { target: { value: 'Quarterly close' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close completed period' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Period already closed or version conflict');
    });
    expect(posted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Close completed period' })).not.toBeDisabled();
  });

  it('handles error during financial accounting activation', async () => {
    const posted = vi.fn();
    const client = {
      getFinancialStatus: vi.fn().mockResolvedValue({ active: false, version: 1 }),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({
        complete: true,
        onHandValueCents: 5000,
        inTransitValueCents: 1000,
        method: 'ACCRUAL',
        problems: [],
      }),
      activateFinancialAccounting: vi.fn().mockRejectedValue(Object.assign(new Error('Activation failed due to lock conflict'), { status: 409 })),
    };

    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={posted} />);

    const activateBtn = await screen.findByRole('button', { name: 'Start financial accounting' });
    expect(activateBtn).not.toBeDisabled();

    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Activation failed due to lock conflict');
    });
    expect(posted).not.toHaveBeenCalled();
    expect(activateBtn).not.toBeDisabled();
  });

  it('supports manual refresh when active and when inactive, and handles refresh errors', async () => {
    const client = {
      getFinancialStatus: vi.fn()
        .mockResolvedValueOnce({ active: false, version: 0 })
        .mockResolvedValueOnce({ active: false, version: 1 })
        .mockRejectedValueOnce(new Error('Network error during refresh')),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({
        complete: false,
        onHandValueCents: 0,
        inTransitValueCents: 0,
        method: 'ACCRUAL',
        problems: [],
      }),
    };

    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);

    const refreshBtn = await screen.findByRole('button', { name: 'Refresh accounting' });
    fireEvent.click(refreshBtn);
    await waitFor(() => expect(client.getFinancialOpeningPreview).toHaveBeenCalledTimes(2));

    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error during refresh');
    });
  });

  it('displays out-of-balance trial balance, unresolved sources, and un-reconciled inventory carrying values', async () => {
    const client = {
      getFinancialStatus: vi.fn().mockResolvedValue({ active: true, method: 'CASH', version: 1, closedThrough: null }),
      getFinancialTrialBalance: vi.fn().mockResolvedValue({
        isBalanced: false,
        complete: false,
        unresolvedSources: 4,
        accounts: [
          { accountCode: '1000', accountName: 'Cash', balanceCents: 0 },
        ],
      }),
      getFinancialReconciliation: vi.fn().mockResolvedValue({
        isReconciled: false,
        ledgerInventoryCents: 2000,
        ledgerTransitCents: 500,
      }),
    };

    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);

    expect(await screen.findByText('Trial balance: Out of balance. 4 stock sources need accounting review.')).toBeInTheDocument();
    expect(screen.getByText('No nonzero account balances posted.')).toBeInTheDocument();
    expect(screen.getByText(/Inventory reconciliation: Needs review\./)).toBeInTheDocument();
    expect(screen.getByText(/Inventory balance: \$20\.00\. In transit: \$5\.00\./)).toBeInTheDocument();
    expect(screen.getByText(/Closed through: No periods closed\./)).toBeInTheDocument();
  });
});
