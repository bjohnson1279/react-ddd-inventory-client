import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationInboxPanel } from '../../src/components/NotificationInboxPanel';
import { InventoryClientContext } from '../../src/api/client';

describe('NotificationInboxPanel', () => {
  const mockMarkNotificationRead = vi.fn().mockResolvedValue(undefined);
  const mockGetNotifications = vi.fn();

  const mockClient = {
    getNotifications: mockGetNotifications,
    markNotificationRead: mockMarkNotificationRead,
  };

  const renderWithProvider = (component: React.ReactNode) => {
    return render(
      <InventoryClientContext.Provider value={{ client: mockClient as any, backendType: 'express', setBackendType: vi.fn() }}>
        {component}
      </InventoryClientContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue([]);

    renderWithProvider(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });

    expect(mockGetNotifications).toHaveBeenCalledWith('test-tenant', 'user-123');
    expect(screen.getByText('0 New')).toBeInTheDocument();
  });

  it('renders notifications and displays unread count correctly', async () => {
    const notifications = [
      { id: '1', message: 'First notification', isRead: false, createdAt: '2023-10-01T10:00:00Z' },
      { id: '2', message: 'Second notification', isRead: true, createdAt: '2023-10-02T10:00:00Z' }
    ];
    mockGetNotifications.mockResolvedValue(notifications);

    renderWithProvider(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('First notification')).toBeInTheDocument();
      expect(screen.getByText('Second notification')).toBeInTheDocument();
    });

    expect(screen.getByText('1 New')).toBeInTheDocument();
  });

  it('calls markNotificationRead when the check button is clicked', async () => {
    const notifications = [
      { id: '1', message: 'Unread notification', isRead: false, createdAt: '2023-10-01T10:00:00Z' }
    ];
    mockGetNotifications.mockResolvedValue(notifications);

    renderWithProvider(<NotificationInboxPanel tenantId="test-tenant" />);

    await waitFor(() => {
      expect(screen.getByText('Unread notification')).toBeInTheDocument();
    });

    const markAsReadButton = screen.getByRole('button', { name: 'Mark notification 1 as read' });
    fireEvent.click(markAsReadButton);

    expect(mockMarkNotificationRead).toHaveBeenCalledWith('1');
  });
});
