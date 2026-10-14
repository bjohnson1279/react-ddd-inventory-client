import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PythonReportingPanel } from './PythonReportingPanel';
import { PythonNotificationInbox } from './PythonNotificationInbox';
import { PythonAgingPanel } from './PythonAgingPanel';
afterEach(cleanup);
function api() {
  return { getReportDefinitions: vi.fn().mockResolvedValue([{ id: 'report', name: 'Stock', type: 'STOCK' }]),
    getReportExecutions: vi.fn().mockResolvedValue([]), getReportSchedules: vi.fn().mockResolvedValue([]),
    getRetailAlerts: vi.fn().mockResolvedValue([]), getRetailAlertConfig: vi.fn().mockResolvedValue({ lowStock: false, expiry: false, expiryDays: 7, version: 0 }),
    getOwnNotifications: vi.fn().mockResolvedValue([]), getOwnUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
    getNotificationManagers: vi.fn().mockResolvedValue([]), escalateOwnNotification: vi.fn().mockResolvedValue({}),
    reportCommand: vi.fn().mockResolvedValue({ executionId: 'job' }), markNotificationRead: vi.fn().mockResolvedValue(undefined),
    snoozeOwnNotification: vi.fn().mockResolvedValue(undefined) };
}
describe('Python reporting and alerts', () => {
  it('queues a report without presenting a completed export and preserves a lost-response command', async () => {
    const client = api();
    client.reportCommand.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValue({ executionId: 'job' });
    render(<PythonReportingPanel client={client as any} tenantId="store" role="admin" />);
    const queue = await screen.findByRole('button', { name: 'Queue Stock' });
    fireEvent.click(queue);
    await screen.findByRole('alert');
    fireEvent.click(queue);
    await waitFor(() => expect(client.reportCommand).toHaveBeenCalledTimes(2));
    expect(client.reportCommand.mock.calls[1]).toEqual(client.reportCommand.mock.calls[0]);
    expect(client.reportCommand.mock.calls[0][1]).toMatchObject({ format: 'json', tenantId: 'store' });
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });
  it('saves independent versioned monitoring choices and an expiry horizon', async () => {
    const client = api();
    render(<PythonReportingPanel client={client as any} tenantId="store" role="manager" />);
    fireEvent.click(await screen.findByLabelText('Monitor low stock'));
    fireEvent.change(screen.getByLabelText('Days before expiry'), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save alert monitoring' }));
    await waitFor(() => expect(client.reportCommand).toHaveBeenCalledOnce());
    expect(client.reportCommand.mock.calls[0]).toEqual(['/alerts/config', expect.objectContaining({ lowStock: true, expiry: false, expiryDays: 14, expectedVersion: 0 })]);
  });
  it('surfaces reporting failures without an invented empty report list', async () => {
    const client = api(); client.getReportDefinitions.mockRejectedValue(new Error('Reports unavailable'));
    render(<PythonReportingPanel client={client as any} tenantId="store" role="admin" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Reports unavailable');
    expect(screen.queryByText(/No report definitions/)).not.toBeInTheDocument();
  });
  it('loads the authenticated inbox and refreshes state after acknowledgement', async () => {
    const client = api();
    client.getOwnNotifications.mockResolvedValueOnce([{ id: 'notice', message: 'Low stock', status: 'UNREAD', createdAt: '2026-10-13T10:00:00Z' }]).mockResolvedValue([]);
    client.getOwnUnreadCount.mockResolvedValueOnce({ unread_count: 1 }).mockResolvedValue({ unread_count: 0 });
    render(<PythonNotificationInbox client={client as any} tenantId="store" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark notice read' }));
    await waitFor(() => expect(client.markNotificationRead).toHaveBeenCalledWith('notice'));
    await screen.findByText('No current notifications.');
    expect(client.getOwnNotifications).toHaveBeenCalledWith('store');
    expect(screen.getByText('0 unread')).toBeInTheDocument();
  });
  it('forwards an alert only to the selected tenant manager', async () => {
    const client = api();
    client.getOwnNotifications.mockResolvedValue([{ id: 'notice', message: 'Low stock', status: 'UNREAD', createdAt: '2026-10-13T10:00:00Z' }]);
    client.getNotificationManagers.mockResolvedValue([{ id: 'manager', name: 'Manager' }]);
    render(<PythonNotificationInbox client={client as any} tenantId="store" />);
    fireEvent.change(await screen.findByLabelText('Escalation manager'), { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Escalate notice' }));
    await waitFor(() => expect(client.escalateOwnNotification).toHaveBeenCalledWith('notice', 'manager'));
  });
  it('renders actual remaining aging rows without claiming empty data means healthy turnover', async () => {
    const client = { generateAgingReport: vi.fn().mockResolvedValue({ generatedAt: '2026-10-13T10:00:00Z', complete: true,
      rows: [{ sku: 'AGED', locationId: 'default', baseUnit: 'g', age0To30: 0, age31To60: 0, age61To90: 0, ageOver90: 1500, unknownAgeQuantity: 0 }] }) };
    render(<PythonAgingPanel client={client as any} tenantId="store" />);
    await screen.findByText('AGED');
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('default / g')).toBeInTheDocument();
    expect(screen.queryByText(/turning over healthily/)).not.toBeInTheDocument();
  });
});
