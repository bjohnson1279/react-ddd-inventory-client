import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { ApprovalHistoryTimeline } from '../../src/components/ApprovalHistoryTimeline';

describe('ApprovalHistoryTimeline', () => {
  it('renders empty state when no decisions', () => {
    render(<ApprovalHistoryTimeline decisions={[]} />);
    expect(screen.getByText('No decisions recorded yet.')).toBeInTheDocument();
  });

  it('renders chronological decision entries with step numbers', () => {
    const decisions = [
      { id: '1', stepIndex: 0, deciderId: 'User 1', decision: 'APPROVED' as const, decidedAt: '2023-01-01T10:00:00Z' },
      { id: '2', stepIndex: 1, deciderId: 'User 2', decision: 'REJECTED' as const, decidedAt: '2023-01-01T11:00:00Z' }
    ];
    render(<ApprovalHistoryTimeline decisions={decisions} />);

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
  });

  it('shows APPROVED decisions in green styling and REJECTED in red styling', () => {
    const decisions = [
      { id: '1', stepIndex: 0, deciderId: 'User 1', decision: 'APPROVED' as const, decidedAt: '2023-01-01T10:00:00Z' },
      { id: '2', stepIndex: 1, deciderId: 'User 2', decision: 'REJECTED' as const, decidedAt: '2023-01-01T11:00:00Z' }
    ];
    render(<ApprovalHistoryTimeline decisions={decisions} />);

    const approvedText = screen.getByText('APPROVED');
    expect(approvedText).toHaveStyle({ color: '#10b981' });

    const rejectedText = screen.getByText('REJECTED');
    expect(rejectedText).toHaveStyle({ color: '#ef4444' });
  });

  it('displays notes when provided', () => {
    const decisions = [
      { id: '1', stepIndex: 0, deciderId: 'User 1', decision: 'APPROVED' as const, notes: 'Looks good', decidedAt: '2023-01-01T10:00:00Z' }
    ];
    render(<ApprovalHistoryTimeline decisions={decisions} />);
    expect(screen.getByText(/"Looks good"/)).toBeInTheDocument();
  });

  it('handles missing/undefined decidedAt gracefully', () => {
    const decisions = [
      { id: '1', stepIndex: 0, deciderId: 'User 1', decision: 'APPROVED' as const, decidedAt: undefined as any }
    ];
    render(<ApprovalHistoryTimeline decisions={decisions} />);
    expect(screen.getByText('Invalid Date')).toBeInTheDocument();
  });
});
