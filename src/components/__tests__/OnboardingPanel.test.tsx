import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingPanel } from '../Panels';
import '@testing-library/jest-dom';

describe('OnboardingPanel', () => {
  const getDefaultProps = () => ({
    onboardings: [],
    selectedOnboarding: null,
    setSelectedOnboarding: vi.fn(),
    onboardingItems: [],
    setOnboardingItems: vi.fn(),
    handleCreateOnboarding: vi.fn(),
    handleSubmitOnboarding: vi.fn(),
    loading: false,
  });

  it('renders "No onboarding sheets registered." when onboardings is empty', () => {
    render(<OnboardingPanel {...getDefaultProps()} />);
    expect(screen.getByText('No onboarding sheets registered.')).toBeInTheDocument();
  });

  it('renders onboardings list', () => {
    const props = getDefaultProps();
    props.onboardings = [
      { id: 'ob-1', locationId: 'loc-1', asOfDate: '2023-01-01T00:00:00.000Z', status: 'submitted' },
      { id: 'ob-2', locationId: 'loc-2', asOfDate: '2023-01-02T00:00:00.000Z', status: 'draft' }
    ];
    render(<OnboardingPanel {...props} />);
    expect(screen.getByText('ob-1')).toBeInTheDocument();
    expect(screen.getByText('loc-1')).toBeInTheDocument();
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
    expect(screen.getByText('ob-2')).toBeInTheDocument();
    expect(screen.getByText('loc-2')).toBeInTheDocument();
    expect(screen.getByText('DRAFT')).toBeInTheDocument();
  });

  it('calls setSelectedOnboarding when a row is clicked', () => {
    const props = getDefaultProps();
    props.onboardings = [{ id: 'ob-1', locationId: 'loc-1', asOfDate: '2023-01-01', status: 'draft' }];
    render(<OnboardingPanel {...props} />);
    fireEvent.click(screen.getByText('ob-1'));
    expect(props.setSelectedOnboarding).toHaveBeenCalledWith(props.onboardings[0]);
  });

  it('calls handleCreateOnboarding when "+ Create Draft Sheet" is clicked', () => {
    const props = getDefaultProps();
    render(<OnboardingPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ Create Draft Sheet/i }));
    expect(props.handleCreateOnboarding).toHaveBeenCalled();
  });

  it('shows "Select an onboarding sheet on the left to edit or post ledger items." when no sheet is selected', () => {
    render(<OnboardingPanel {...getDefaultProps()} />);
    expect(screen.getByText('Select an onboarding sheet on the left to edit or post ledger items.')).toBeInTheDocument();
  });

  it('shows "No items." when selectedOnboarding has no items', () => {
    const props = getDefaultProps();
    props.selectedOnboarding = { id: 'ob-1', status: 'draft', items: [] };
    render(<OnboardingPanel {...props} />);
    expect(screen.getByText('No items.')).toBeInTheDocument();
  });

  it('renders items when selectedOnboarding has items', () => {
    const props = getDefaultProps();
    props.selectedOnboarding = {
      id: 'ob-1',
      status: 'draft',
      items: [{ variantId: 'var-1', quantity: 10, unitCostCents: 1500 }]
    };
    render(<OnboardingPanel {...props} />);
    expect(screen.getByText('var-1')).toBeInTheDocument();
    expect(screen.getByText('10 units')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('calls handleSubmitOnboarding when "Lock & Post Sheet" is clicked for draft status', () => {
    const props = getDefaultProps();
    props.selectedOnboarding = { id: 'ob-1', status: 'draft', items: [] };
    render(<OnboardingPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Lock & Post Sheet/i }));
    expect(props.handleSubmitOnboarding).toHaveBeenCalledWith('ob-1');
  });

  it('does not show "Lock & Post Sheet" button for submitted status', () => {
    const props = getDefaultProps();
    props.selectedOnboarding = { id: 'ob-1', status: 'submitted', items: [] };
    render(<OnboardingPanel {...props} />);
    expect(screen.queryByRole('button', { name: /Lock & Post Sheet/i })).not.toBeInTheDocument();
  });

  it('disables buttons and updates text when loading is true', () => {
    const props = getDefaultProps();
    props.loading = true;
    props.selectedOnboarding = { id: 'ob-1', status: 'draft', items: [] };
    render(<OnboardingPanel {...props} />);

    const createBtn = screen.getByRole('button', { name: /\+ Create Draft Sheet/i });
    expect(createBtn).toBeDisabled();

    const submitBtn = screen.getByRole('button', { name: /Initializing\.\.\./i });
    expect(submitBtn).toBeDisabled();
  });
});
