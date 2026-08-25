import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalInboxPanel } from './ApprovalInboxPanel';

describe('ApprovalInboxPanel', () => {
  it('renders with mocked API', async () => {
    const mockApi = {
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
      submitDecision: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalInboxPanel api={mockApi} />);

    await waitFor(() => {
      expect(screen.getByText('Approval Inbox')).toBeInTheDocument();
      expect(screen.getByText('INVENTORY_WRITEOFF')).toBeInTheDocument();
      expect(screen.getByText('user_1')).toBeInTheDocument();
    });
  });
});
