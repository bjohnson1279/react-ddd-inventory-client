import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ApprovalWorkflowPanel } from './ApprovalWorkflowPanel';

describe('ApprovalWorkflowPanel', () => {
  it('renders with mocked API', async () => {
    const mockApi = {
      getApprovalWorkflows: vi.fn().mockResolvedValue([
        {
          id: 'wf_1',
          triggerEvent: 'PO_CREATED',
          isActive: true,
          steps: [{ roleId: 'manager', minApprovals: 1, timeoutHours: 24 }]
        }
      ]),
      toggleApprovalWorkflow: vi.fn().mockResolvedValue({})
    };

    render(<ApprovalWorkflowPanel api={mockApi} />);
    
    await waitFor(() => {
      expect(screen.getByText('Approval Workflow Configuration')).toBeInTheDocument();
      expect(screen.getByText('PO_CREATED')).toBeInTheDocument();
    });
  });
});
