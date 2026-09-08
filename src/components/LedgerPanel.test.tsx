import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { LedgerPanel } from './Panels';
import React from 'react';
import { JournalLine } from '../api/client';

const TestWrapper = ({ initialJournals = [], initialLoading = false, onSubmitSpy }: any) => {
  const [journals] = React.useState<any[]>(initialJournals);
  const [newJournalDesc, setNewJournalDesc] = React.useState('');
  const [newJournalMethod, setNewJournalMethod] = React.useState<'cash' | 'accrual'>('accrual');
  const [newJournalLines, setNewJournalLines] = React.useState<JournalLine[]>([
    { accountCode: '', amountCents: 0, type: 'credit', memo: '' }
  ]);
  const [loading] = React.useState(initialLoading);

  const handlePostJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmitSpy) onSubmitSpy({ newJournalDesc, newJournalMethod, newJournalLines });
  };

  return (
    <LedgerPanel
      journals={journals}
      newJournalDesc={newJournalDesc}
      setNewJournalDesc={setNewJournalDesc}
      newJournalMethod={newJournalMethod}
      setNewJournalMethod={setNewJournalMethod}
      newJournalLines={newJournalLines}
      setNewJournalLines={setNewJournalLines}
      handlePostJournal={handlePostJournal}
      loading={loading}
    />
  );
};

describe('LedgerPanel', () => {
  it('renders correctly with empty state', () => {
    render(<TestWrapper />);
    expect(screen.getByText('Manual Ledger Entry (Journal)')).toBeInTheDocument();
    expect(screen.getByText('No journal entries posted yet.')).toBeInTheDocument();
  });

  it('updates form inputs correctly', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const descInput = screen.getByPlaceholderText('e.g. Month-end adjustments');
    await user.type(descInput, 'Test Journal');
    expect(descInput).toHaveValue('Test Journal');

    const methodSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(methodSelect, 'cash');
    expect(methodSelect).toHaveValue('cash');

    const accountInput = screen.getByPlaceholderText('Account (e.g. 1000)');
    await user.type(accountInput, '1234');
    expect(accountInput).toHaveValue('1234');

    const amountInput = screen.getByPlaceholderText('Amount (Cents)');
    await user.type(amountInput, '5000');
    expect(amountInput).toHaveValue(5000);
  });

  it('adds a new journal line row', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const addLineBtn = screen.getByRole('button', { name: /\+ Add Line row/i });
    await user.click(addLineBtn);

    const accountInputs = screen.getAllByPlaceholderText('Account (e.g. 1000)');
    expect(accountInputs).toHaveLength(2);
  });

  it('calls handlePostJournal on form submission', async () => {
    const user = userEvent.setup();
    const onSubmitSpy = vi.fn();
    render(<TestWrapper onSubmitSpy={onSubmitSpy} />);

    const descInput = screen.getByPlaceholderText('e.g. Month-end adjustments');
    await user.type(descInput, 'Submit Test');

    const accountInput = screen.getByPlaceholderText('Account (e.g. 1000)');
    await user.type(accountInput, '1234');

    const amountInput = screen.getByPlaceholderText('Amount (Cents)');
    await user.type(amountInput, '5000');

    const submitBtn = screen.getByRole('button', { name: /Post General Ledger Entry/i });
    await user.click(submitBtn);

    expect(onSubmitSpy).toHaveBeenCalledWith(expect.objectContaining({
      newJournalDesc: 'Submit Test'
    }));
  });

  it('displays existing journals', () => {
    const mockJournals = [
      {
        id: 'j1',
        createdAt: '2025-01-01T00:00:00Z',
        description: 'Initial balance',
        method: 'accrual',
        lines: [
          { accountCode: '1000', amountCents: 10000, type: 'debit' },
          { accountCode: '2000', amountCents: 10000, type: 'credit' }
        ]
      }
    ];
    render(<TestWrapper initialJournals={mockJournals} />);

    expect(screen.getByText('Initial balance')).toBeInTheDocument();
    expect(screen.getByText('ACCRUAL')).toBeInTheDocument();

    expect(screen.getAllByText(/DR/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/100\.00/)[0]).toBeInTheDocument();
  });

  it('disables submit button and shows loading state', () => {
    render(<TestWrapper initialLoading={true} />);

    // When loading is true, the button just renders the Spinner component without the text
    const submitBtn = screen.getByRole('button', { name: '' });
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
    expect(submitBtn).toBeDisabled();
  });
});
