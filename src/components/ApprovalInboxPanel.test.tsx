import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalInboxPanel } from './ApprovalInboxPanel';

describe('ApprovalInboxPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    localStorage.setItem('auth_token', 'mock_token');
  });

  it('renders with mocked API', async () => {
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockResolvedValue([
        {
          id: 'req_1',
          triggerEvent: 'INVENTORY_WRITEOFF',
          status: 'PENDING',
          requesterId: 'user_1',
          createdAt: new Date().toISOString(),
          payload: { sku: 'TEST-1', qty: 10 }
        }
      ]),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Approval Inbox')).toBeInTheDocument();
      expect(screen.getByText('INVENTORY_WRITEOFF')).toBeInTheDocument();
      expect(screen.getByText('user_1')).toBeInTheDocument();
    });
  });

  it('renders empty state when there are no requests', async () => {
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockResolvedValue([]),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
      expect(screen.getByText('No pending approvals require your attention.')).toBeInTheDocument();
    });
  });

  it('renders loading state initially', async () => {
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100))),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    expect(screen.getByText('Loading inbox...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Loading inbox...')).not.toBeInTheDocument();
    });
  });

  it('shows error state when API fails to fetch', async () => {
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockRejectedValue(new Error('Network error')),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('handles approve action with mock api', async () => {
    const user = userEvent.setup();
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockResolvedValue([
        {
          id: 'req_1',
          triggerEvent: 'INVENTORY_WRITEOFF',
          status: 'PENDING',
          requesterId: 'user_1',
          createdAt: new Date().toISOString(),
          payload: { sku: 'TEST-1', qty: 10 }
        }
      ]),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('INVENTORY_WRITEOFF')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    await user.click(approveButton);

    expect(mockApi.submitApprovalDecision).toHaveBeenCalledWith('req_1', 'APPROVED', 'Reviewed via UI');
    expect(mockApi.getPendingApprovals).toHaveBeenCalledTimes(2);
  });

  it('dismisses error message', async () => {
    const user = userEvent.setup();
    const mockApi = {
      subscribeBarcodeScans: vi.fn(),
      getProducts: vi.fn(),
      getInventoryItems: vi.fn(),
      getPendingApprovals: vi.fn().mockRejectedValue(new Error('Network error')),
      submitApprovalDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi as any} tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText('Dismiss error');
    await user.click(dismissButton);

    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
  });
});
