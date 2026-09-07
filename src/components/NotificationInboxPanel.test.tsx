import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationInboxPanel } from './NotificationInboxPanel';

// Mock the useInventory hook
const mockGetNotifications = vi.fn();
const mockMarkNotificationRead = vi.fn();

vi.mock('../api/client', () => ({
  useInventory: () => ({
    client: {
      getNotifications: mockGetNotifications,
      markNotificationRead: mockMarkNotificationRead
    }
  })
}));

describe('NotificationInboxPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders empty state correctly', async () => {
    mockGetNotifications.mockResolvedValue([]);

    render(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
      expect(screen.getByText('0 New')).toBeInTheDocument();
    });

    expect(mockGetNotifications).toHaveBeenCalledWith('test-tenant', 'user-123');
  });

  it('renders notifications and calculates unread count', async () => {
    mockGetNotifications.mockResolvedValue([
      { id: '1', message: 'Test message 1', isRead: false, createdAt: '2023-01-01T12:00:00Z' },
      { id: '2', message: 'Test message 2', isRead: true, createdAt: '2023-01-02T12:00:00Z' }
    ]);

    render(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Test message 1')).toBeInTheDocument();
      expect(screen.getByText('Test message 2')).toBeInTheDocument();
      expect(screen.getByText('1 New')).toBeInTheDocument();
    });
  });

  it('handles mark as read click', async () => {
    const user = userEvent.setup();
    mockGetNotifications.mockResolvedValue([
      { id: '1', message: 'Test message 1', isRead: false, createdAt: '2023-01-01T12:00:00Z' }
    ]);

    render(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Test message 1')).toBeInTheDocument();
    });

    const markReadBtn = screen.getByLabelText('Mark notification 1 as read');
    await user.click(markReadBtn);

    expect(mockMarkNotificationRead).toHaveBeenCalledWith('1');
  });

  it('handles API error without crashing', async () => {
    mockGetNotifications.mockRejectedValue(new Error('Network Error'));

    render(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });
  });
});
