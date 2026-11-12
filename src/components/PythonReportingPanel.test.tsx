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
  it('downloads completed report executions and cleans up DOM elements', async () => {
    const client = api();
    const mockBlob = new Blob(['{"status":"ok"}'], { type: 'application/json' });
    (client as any).downloadReportExecution = vi.fn().mockResolvedValue(mockBlob);
    client.getReportExecutions.mockResolvedValue([
      { id: 'job-123', name: 'Stock Report', status: 'COMPLETED', format: 'json', complete: true },
    ]);

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<PythonReportingPanel client={client as any} tenantId="store" role="admin" />);

    const downloadButton = await screen.findByRole('button', { name: 'Download job-123' });
    fireEvent.click(downloadButton);

    await waitFor(() => expect((client as any).downloadReportExecution).toHaveBeenCalledWith('job-123'));
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
  it('displays error message and resets busy state when command fails with a client error', async () => {
    const client = api();
    client.reportCommand.mockRejectedValueOnce(Object.assign(new Error('Invalid report configuration'), { status: 400 }));
    render(<PythonReportingPanel client={client as any} tenantId="store" role="admin" />);
    const nameInput = await screen.findByLabelText('Report name');
    fireEvent.change(nameInput, { target: { value: 'Monthly Sales' } });
    const createButton = screen.getByRole('button', { name: 'Create report' });
    fireEvent.submit(createButton.closest('form')!);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid report configuration');
    expect(createButton).not.toBeDisabled();
    expect(createButton).toHaveAttribute('aria-busy', 'false');

    client.reportCommand.mockResolvedValueOnce({ executionId: 'job-2' });
    fireEvent.submit(createButton.closest('form')!);
    await waitFor(() => expect(client.reportCommand).toHaveBeenCalledTimes(2));
    const firstCallPayload = client.reportCommand.mock.calls[0][1];
    const secondCallPayload = client.reportCommand.mock.calls[1][1];
    expect(secondCallPayload.mutationId).toBeDefined();
    expect(secondCallPayload.mutationId).not.toEqual(firstCallPayload.mutationId);
  });
  it('handles and displays error state when report execution download fails', async () => {
    const client = { ...api(),
      getReportExecutions: vi.fn().mockResolvedValue([{ id: 'job-1', name: 'Stock Execution', status: 'COMPLETED', format: 'json' }]),
      downloadReportExecution: vi.fn().mockRejectedValue(new Error('Download failed')) };
    render(<PythonReportingPanel client={client as any} tenantId="store" role="admin" />);
    const downloadBtn = await screen.findByRole('button', { name: 'Download job-1' });
    fireEvent.click(downloadBtn);
    expect(await screen.findByRole('alert')).toHaveTextContent('Download failed');
    expect(downloadBtn).not.toBeDisabled();
  });
});
