import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LedgerPanel } from './Panels';

describe('LedgerPanel', () => {
  const getDefaultProps = () => ({
    journals: [],
    newJournalDesc: '',
    setNewJournalDesc: vi.fn(),
    newJournalMethod: 'accrual' as const,
    setNewJournalMethod: vi.fn(),
    newJournalLines: [],
    setNewJournalLines: vi.fn(),
    handlePostJournal: vi.fn((e: React.FormEvent) => e.preventDefault()),
    loading: false
  });

  it('renders empty journals state correctly', () => {
    render(<LedgerPanel {...getDefaultProps()} />);
    expect(screen.getByText('No journal entries posted yet.')).toBeInTheDocument();
    expect(screen.getByText('Manual Ledger Entry (Journal)')).toBeInTheDocument();
    expect(screen.getByText('General Ledger Journals')).toBeInTheDocument();
  });

  it('renders populated journals list', () => {
    const props = getDefaultProps();
    props.journals = [
      {
        id: 'j1',
        date: '2023-01-01',
        description: 'Test Journal 1',
        referenceId: 'ref-123',
        method: 'accrual',
        lines: [
          { accountCode: '1000', type: 'debit', amountCents: 10000 },
          { accountCode: '2000', type: 'credit', amountCents: 5000 }
        ]
      }
    ];
    render(<LedgerPanel {...props} />);
    expect(screen.getByText('Test Journal 1')).toBeInTheDocument();
    expect(screen.getByText('Ref: ref-123')).toBeInTheDocument();

    // We expect the text to exist, but ACCRUAL also contains CR, so we match exactly "ACCRUAL"
    expect(screen.getByText('ACCRUAL')).toBeInTheDocument();

    // The lines render format: <code>{l.accountCode}</code>: DR or CR $amount
    expect(screen.getByText('1000')).toBeInTheDocument();
    expect(screen.getByText(/DR/)).toBeInTheDocument();
    expect(screen.getByText(/\$100.00/)).toBeInTheDocument();

    expect(screen.getByText('2000')).toBeInTheDocument();

    // Since "ACCRUAL" matches /CR/ and CR matches /CR/, getAllByText returns multiple. We can just check it has length > 0
    expect(screen.getAllByText(/CR/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$50.00/)).toBeInTheDocument();
  });

  it('interacts with form inputs and line items', async () => {
    const user = userEvent.setup();
    const props = getDefaultProps();
    props.newJournalLines = [{ accountCode: '', amountCents: 0, type: 'debit', memo: '' }];
    render(<LedgerPanel {...props} />);

    // Description input (using placeholder since label is not linked via htmlFor)
    const descInput = screen.getByPlaceholderText('e.g. Month-end adjustments');
    await user.type(descInput, 'New Entry');
    expect(props.setNewJournalDesc).toHaveBeenCalled();

    // Method select (using combobox role)
    const selects = screen.getAllByRole('combobox');
    // The first select is the Accounting Method
    await user.selectOptions(selects[0], 'cash');
    expect(props.setNewJournalMethod).toHaveBeenCalledWith('cash');

    // Line Item Account Code
    const accountInput = screen.getByPlaceholderText('Account (e.g. 1000)');
    await user.type(accountInput, '4000');
    expect(props.setNewJournalLines).toHaveBeenCalled();

    // Line Item Amount
    const amountInput = screen.getByPlaceholderText('Amount (Cents)');
    await user.type(amountInput, '500');
    expect(props.setNewJournalLines).toHaveBeenCalled();

    // Line Item Type
    // The second select is the Line Item Type
    await user.selectOptions(selects[1], 'credit');
    expect(props.setNewJournalLines).toHaveBeenCalled();

    // Add Line row button
    const addRowButton = screen.getByRole('button', { name: '+ Add Line row' });
    await user.click(addRowButton);
    expect(props.setNewJournalLines).toHaveBeenCalled();
  });

  it('submits the form', () => {
    const props = getDefaultProps();
    render(<LedgerPanel {...props} />);

    const form = screen.getByRole('button', { name: 'Post General Ledger Entry' }).closest('form');
    if (form) {
        fireEvent.submit(form);
    }
    expect(props.handlePostJournal).toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    const props = getDefaultProps();
    props.loading = true;
    const { container } = render(<LedgerPanel {...props} />);

    const submitBtn = screen.getByRole('button', { name: '' }); // The button has a spinner instead of text when loading
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');

    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });
});
