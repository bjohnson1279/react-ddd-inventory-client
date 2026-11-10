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

  it('displays an error alert when activating financial accounting fails and clears busy state', async () => {
    const error = Object.assign(new Error('Version mismatch or activation conflict'), { status: 409 });
    const client = {
      getFinancialStatus: vi.fn().mockResolvedValue({ active: false, version: 1 }),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({
        complete: true, onHandValueCents: 5000, inTransitValueCents: 0, method: 'ACCRUAL', problems: [],
      }),
      activateFinancialAccounting: vi.fn().mockRejectedValue(error),
    };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    const activateButton = await screen.findByRole('button', { name: 'Start financial accounting' });
    fireEvent.click(activateButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Version mismatch or activation conflict');
    expect((activateButton as HTMLButtonElement).disabled).toBe(false);
    expect(activateButton.getAttribute('aria-busy')).toBe('false');
  });

  it('displays an error alert when closing financial period fails and clears busy state', async () => {
    const error = Object.assign(new Error('Cannot close period with unposted transactions'), { status: 422 });
    const client = {
      getFinancialStatus: vi.fn().mockResolvedValue({
        active: true, method: 'ACCRUAL', version: 1, closedThrough: '2025-01-31',
      }),
      getFinancialTrialBalance: vi.fn().mockResolvedValue({ isBalanced: true, complete: true, accounts: [] }),
      getFinancialReconciliation: vi.fn().mockResolvedValue({ isReconciled: true, ledgerInventoryCents: 5000, ledgerTransitCents: 0 }),
      closeFinancialPeriod: vi.fn().mockRejectedValue(error),
    };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);

    const cutoffInput = await screen.findByLabelText('Close through (UTC date)');
    const reasonInput = screen.getByLabelText('Review reason');
    const submitButton = screen.getByRole('button', { name: 'Close completed period' });

    fireEvent.change(cutoffInput, { target: { value: '2025-02-28' } });
    fireEvent.change(reasonInput, { target: { value: 'Monthly period closing' } });
    fireEvent.click(submitButton);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Cannot close period with unposted transactions');
    expect((submitButton as HTMLButtonElement).disabled).toBe(false);
    expect(submitButton.getAttribute('aria-busy')).toBe('false');
  });
});
