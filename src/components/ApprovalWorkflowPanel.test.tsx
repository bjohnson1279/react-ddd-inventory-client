
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalWorkflowPanel } from './ApprovalWorkflowPanel';
import { InventoryClient } from '../api/client';

describe('ApprovalWorkflowPanel', () => {
  const mockWorkflows = [
    {
      id: 'wf_1',
      triggerEvent: 'PO_CREATED',
      isActive: true,
      steps: [{ roleId: 'manager', minApprovals: 1, timeoutHours: 24 }],
    },
    {
      id: 'wf_2',
      triggerEvent: 'INVENTORY_WRITEOFF',
      isActive: false,
      steps: [],
    },
  ];

  it('renders loading state initially', () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
    } as unknown as InventoryClient;

    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);
    expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
  });

  it('renders empty state when no workflows exist', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([]),
    } as unknown as InventoryClient;

    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('No approval workflows configured yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('Create New Workflow')).toBeInTheDocument();
  });

  it('fetches and displays workflows using the api prop', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue(mockWorkflows),
    } as unknown as InventoryClient;

    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('PO_CREATED')).toBeInTheDocument();
      expect(screen.getByText('INVENTORY_WRITEOFF')).toBeInTheDocument();
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText(/Requires:\s*1 approval\(s\)/)).toBeInTheDocument();
    expect(screen.getByText('No steps configured.')).toBeInTheDocument();

    expect(mockApi.getApprovalWorkflows).toHaveBeenCalledTimes(1);
  });

  it('handles and displays errors when fetching fails', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockRejectedValue(new Error('API error')),
    } as unknown as InventoryClient;

    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('toggles workflows via the api prop', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue(mockWorkflows),
      toggleApprovalWorkflow: vi.fn().mockResolvedValue({}),
    } as unknown as InventoryClient;

    const user = userEvent.setup();
    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('PO_CREATED')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Active');
    await user.click(toggleButton);

    expect(mockApi.toggleApprovalWorkflow).toHaveBeenCalledWith('wf_1');
    expect(mockApi.getApprovalWorkflows).toHaveBeenCalledTimes(2);
  });

  it('handles errors when toggling fails and allows dismissing', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue(mockWorkflows),
      toggleApprovalWorkflow: vi.fn().mockRejectedValue(new Error('Toggle error')),
    } as unknown as InventoryClient;

    const user = userEvent.setup();
    render(<ApprovalWorkflowPanel api={mockApi} tenantId="tenant-1" />);

    await waitFor(() => {
      expect(screen.getByText('PO_CREATED')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Active');
    await user.click(toggleButton);

    await waitFor(() => {
       expect(screen.getByText('Toggle error')).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText('Dismiss error');
    await user.click(dismissButton);

    expect(screen.queryByText('Toggle error')).not.toBeInTheDocument();
  });
});
