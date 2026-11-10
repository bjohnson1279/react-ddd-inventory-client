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

  it('displays error when getFinancialOpeningPreview fails on inactive ledger', async () => {
    const client = { getFinancialStatus: vi.fn().mockResolvedValue({ active: false, version: 0 }),
      getFinancialOpeningPreview: vi.fn().mockRejectedValue(new Error('Failed to load opening preview')) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Failed to load opening preview');
  });

  it('displays error when getFinancialTrialBalance fails on active ledger', async () => {
    const client = { getFinancialStatus: vi.fn().mockResolvedValue({ active: true, version: 1 }),
      getFinancialTrialBalance: vi.fn().mockRejectedValue(new Error('Trial balance calculation failed')),
      getFinancialReconciliation: vi.fn().mockResolvedValue({ isReconciled: true, ledgerInventoryCents: 0, ledgerTransitCents: 0 }) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Trial balance calculation failed');
  });

  it('displays error and resets pending action when activateFinancialAccounting fails with conflict status', async () => {
    const conflictError = Object.assign(new Error('Concurrent modification detected'), { status: 409 });
    const client = { getFinancialStatus: vi.fn().mockResolvedValue({ active: false, version: 0 }),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({ complete: true, onHandValueCents: 5000, inTransitValueCents: 0, method: 'ACCRUAL', problems: [] }),
      activateFinancialAccounting: vi.fn().mockRejectedValue(conflictError) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    const activateButton = await screen.findByRole('button', { name: 'Start financial accounting' });
    fireEvent.click(activateButton);
    expect((await screen.findByRole('alert')).textContent).toContain('Concurrent modification detected');
    expect((screen.getByRole('button', { name: 'Start financial accounting' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('displays error when refresh accounting button is clicked and API fails', async () => {
    const client = { getFinancialStatus: vi.fn().mockResolvedValueOnce({ active: false, version: 0 })
      .mockRejectedValueOnce(new Error('Network disconnected during refresh')),
      getFinancialOpeningPreview: vi.fn().mockResolvedValue({ complete: false, onHandValueCents: 0, inTransitValueCents: 0, method: 'ACCRUAL', problems: [] }) };
    render(<FinancialAccountingPanel client={client as unknown as PythonRESTAdapter} tenantId="store" onPosted={vi.fn()} />);
    const refreshButton = await screen.findByRole('button', { name: 'Refresh accounting' });
    fireEvent.click(refreshButton);
    expect((await screen.findByRole('alert')).textContent).toContain('Network disconnected during refresh');
  });
});
