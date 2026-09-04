import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LedgerPanel } from './Panels';

describe('LedgerPanel', () => {
  const defaultProps = {
    journals: [],
    newJournalDesc: '',
    setNewJournalDesc: vi.fn(),
    newJournalMethod: 'accrual' as const,
    setNewJournalMethod: vi.fn(),
    newJournalLines: [
      { accountCode: '', amountCents: 0, type: 'debit' as const, memo: '' },
      { accountCode: '', amountCents: 0, type: 'credit' as const, memo: '' }
    ],
    setNewJournalLines: vi.fn(),
    handlePostJournal: vi.fn((e) => e.preventDefault()),
    loading: false
  };

  it('renders correctly with empty journals', () => {
    render(<LedgerPanel {...defaultProps} />);
    expect(screen.getByText('Manual Ledger Entry (Journal)')).toBeInTheDocument();
    expect(screen.getByText('No journal entries posted yet.')).toBeInTheDocument();
  });

  it('renders correctly with journals', () => {
    const journals = [{
      id: 'j1',
      date: '2023-01-01T00:00:00.000Z',
      description: 'Test Journal',
      referenceId: 'REF1',
      method: 'accrual',
      lines: [
        { accountCode: '1000', amountCents: 10000, type: 'debit' as const },
        { accountCode: '2000', amountCents: 10000, type: 'credit' as const }
      ]
    }];
    render(<LedgerPanel {...defaultProps} journals={journals} />);
    expect(screen.getByText('Test Journal')).toBeInTheDocument();
    expect(screen.getByText('Ref: REF1')).toBeInTheDocument();
    expect(screen.getByText('ACCRUAL')).toBeInTheDocument();
  });

  it('handles form inputs and submission', async () => {
    const user = userEvent.setup();
    const Wrapper = () => {
      const mockHandle = (e) => { e.preventDefault(); defaultProps.handlePostJournal(e); };
      const [desc, setDesc] = React.useState('Initial Desc');
      return <LedgerPanel {...defaultProps} newJournalDesc={desc} setNewJournalDesc={(v) => { setDesc(v); defaultProps.setNewJournalDesc(v); }} handlePostJournal={mockHandle} />;
    };
    render(<Wrapper />);

    const descInput = screen.getByPlaceholderText('e.g. Month-end adjustments');
    await user.clear(descInput);
    await user.type(descInput, 'New Entry');
    expect(defaultProps.setNewJournalDesc).toHaveBeenCalledWith('New Entry');

    const submitBtn = screen.getByText('Post General Ledger Entry');
    fireEvent.submit(screen.getByText('Post General Ledger Entry').closest('form')!);
    expect(defaultProps.handlePostJournal).toHaveBeenCalled();
  });

  it('can add a new line row', async () => {
    const user = userEvent.setup();
    render(<LedgerPanel {...defaultProps} />);

    const addBtn = screen.getByText('+ Add Line row');
    await user.click(addBtn);
    expect(defaultProps.setNewJournalLines).toHaveBeenCalledWith([
      ...defaultProps.newJournalLines,
      { accountCode: '', amountCents: 0, type: 'credit' as const, memo: '' }
    ]);
  });

  it('disables button when loading', () => {
    const { container } = render(<LedgerPanel {...defaultProps} loading={true} />);
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
  });
});
