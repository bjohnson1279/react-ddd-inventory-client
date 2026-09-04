import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { OnboardingPanel } from '../../src/components/Panels';

describe('OnboardingPanel', () => {
  const defaultProps = {
    onboardings: [],
    selectedOnboarding: null,
    setSelectedOnboarding: vi.fn(),
    onboardingItems: [],
    setOnboardingItems: vi.fn(),
    handleCreateOnboarding: vi.fn(),
    handleSubmitOnboarding: vi.fn(),
    loading: false,
  };

  it('renders empty states when no onboardings are provided', () => {
    render(<OnboardingPanel {...defaultProps} />);

    expect(screen.getByText('No onboarding sheets registered.')).toBeInTheDocument();
    expect(screen.getByText('Select an onboarding sheet on the left to edit or post ledger items.')).toBeInTheDocument();
  });

  it('renders a list of onboardings', () => {
    const onboardings = [
      { id: 'sheet-1', locationId: 'loc-1', asOfDate: '2024-01-01T00:00:00Z', status: 'draft' },
      { id: 'sheet-2', locationId: 'loc-2', asOfDate: '2024-01-02T00:00:00Z', status: 'submitted' },
    ];
    render(<OnboardingPanel {...defaultProps} onboardings={onboardings} />);

    expect(screen.getByText('sheet-1')).toBeInTheDocument();
    expect(screen.getByText('sheet-2')).toBeInTheDocument();
  });

  it('allows selecting an onboarding sheet', async () => {
    const user = userEvent.setup();
    const setSelectedOnboarding = vi.fn();
    const onboardings = [
      { id: 'sheet-1', locationId: 'loc-1', asOfDate: '2024-01-01T00:00:00Z', status: 'draft' },
    ];
    render(<OnboardingPanel {...defaultProps} onboardings={onboardings} setSelectedOnboarding={setSelectedOnboarding} />);

    const sheetRow = screen.getByText('sheet-1').closest('tr');
    await act(async () => {
      await user.click(sheetRow!);
    });

    expect(setSelectedOnboarding).toHaveBeenCalledWith(onboardings[0]);
  });

  it('calls handleCreateOnboarding when the create button is clicked', async () => {
    const user = userEvent.setup();
    const handleCreateOnboarding = vi.fn();
    render(<OnboardingPanel {...defaultProps} handleCreateOnboarding={handleCreateOnboarding} />);

    const createButton = screen.getByRole('button', { name: '+ Create Draft Sheet' });
    await act(async () => {
      await user.click(createButton);
    });

    expect(handleCreateOnboarding).toHaveBeenCalled();
  });

  it('renders selected onboarding details and items', () => {
    const selectedOnboarding = {
      id: 'sheet-1',
      status: 'submitted',
      items: [
        { variantId: 'var-1', quantity: 10, unitCostCents: 500 },
        { variantId: 'var-2', quantity: 5, unitCostCents: 1500 },
      ]
    };
    render(<OnboardingPanel {...defaultProps} selectedOnboarding={selectedOnboarding} />);

    expect(screen.getByText('sheet-1')).toBeInTheDocument();
    expect(screen.getByText('submitted')).toBeInTheDocument();
    expect(screen.getByText('var-1')).toBeInTheDocument();
    expect(screen.getByText('10 units')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('var-2')).toBeInTheDocument();
    expect(screen.getByText('5 units')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('renders a submit button for draft onboardings and calls handleSubmitOnboarding', async () => {
    const user = userEvent.setup();
    const handleSubmitOnboarding = vi.fn();
    const selectedOnboarding = {
      id: 'sheet-1',
      status: 'draft',
      items: []
    };
    render(<OnboardingPanel {...defaultProps} selectedOnboarding={selectedOnboarding} handleSubmitOnboarding={handleSubmitOnboarding} />);

    const submitBtn = screen.getByRole('button', { name: 'Lock & Post Sheet' });
    expect(submitBtn).toBeInTheDocument();

    await act(async () => {
      await user.click(submitBtn);
    });

    expect(handleSubmitOnboarding).toHaveBeenCalledWith('sheet-1');
  });

  it('disables buttons when loading is true', () => {
    const selectedOnboarding = {
      id: 'sheet-1',
      status: 'draft',
      items: []
    };
    render(<OnboardingPanel {...defaultProps} loading={true} selectedOnboarding={selectedOnboarding} />);

    const createButton = screen.getByRole('button', { name: '+ Create Draft Sheet' });
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveAttribute('aria-busy', 'true');

    const submitBtn = screen.getByRole('button', { name: 'Initializing...' });
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveAttribute('aria-busy', 'true');
  });
});
