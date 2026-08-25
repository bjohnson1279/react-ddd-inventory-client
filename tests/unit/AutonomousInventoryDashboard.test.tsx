import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutonomousInventoryDashboard } from '../../src/components/AutonomousInventoryDashboard';

// Mock the useInventory hook to prevent context errors
vi.mock('../../src/api/client', () => ({
  useInventory: () => ({
    client: {},
    backendType: 'EXPRESS'
  })
}));

describe('AutonomousInventoryDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully without crashing', () => {
    render(<AutonomousInventoryDashboard />);
    expect(screen.getByText('Autonomous Inventory & High-Scale Cloud Engine')).toBeInTheDocument();
  });

  it('updates status to "✓ PO Issued" when "Issue PO" is clicked', () => {
    render(<AutonomousInventoryDashboard />);

    // Find the first "Issue PO" button
    const issueButtons = screen.getAllByRole('button', { name: 'Issue PO' });
    expect(issueButtons.length).toBeGreaterThan(0);

    fireEvent.click(issueButtons[0]);

    // Status should update to "✓ PO Issued"
    expect(screen.getByText('✓ PO Issued')).toBeInTheDocument();
  });

  it('displays an alert with the correct autonomy mode when agent evaluation is triggered', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AutonomousInventoryDashboard />);

    const triggerButton = screen.getByRole('button', { name: 'Run Agent Evaluation' });
    fireEvent.click(triggerButton);

    expect(alertMock).toHaveBeenCalledWith('Autonomous evaluation triggered in HUMAN_IN_THE_LOOP mode.');

    alertMock.mockRestore();
  });

  it('allows switching autonomy mode and reflects it in the alert', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AutonomousInventoryDashboard />);

    // Switch to Fully Autonomous
    const fullyAutonomousButton = screen.getByRole('button', { name: 'Fully Autonomous' });
    fireEvent.click(fullyAutonomousButton);

    // Trigger evaluation again
    const triggerButton = screen.getByRole('button', { name: 'Run Agent Evaluation' });
    fireEvent.click(triggerButton);

    expect(alertMock).toHaveBeenCalledWith('Autonomous evaluation triggered in FULLY_AUTONOMOUS mode.');

    alertMock.mockRestore();
  });
});
