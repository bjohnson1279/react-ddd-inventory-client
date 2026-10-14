import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PythonWorkforcePanel } from './PythonWorkforcePanel';
afterEach(cleanup);
function api() {
  return { getMyWorkforce: vi.fn().mockResolvedValue({ profile: null, metrics: { recordedPickTasks: 0, picksPerReportedHour: null, countAccuracyPercent: null, traversalDistanceMeters: null }, shifts: [] }),
    getWorkforceShifts: vi.fn().mockResolvedValue([]), getWorkforceOperators: vi.fn().mockResolvedValue([{ userId: 'worker/id', name: 'Worker', profile: { id: 'profile', version: 2, targetPicksPerHour: 60, maxConsecutiveHours: 8, certifications: [] } }]),
    getStaffingPlans: vi.fn().mockResolvedValue([]), workforceCommand: vi.fn().mockResolvedValue({}), getWorkforceSources: vi.fn().mockResolvedValue([]) };
}
it('shows unknown measurements without fabricated scores and restricts operator controls', async () => {
  const client = api(); render(<PythonWorkforcePanel client={client as any} tenantId="store" role="warehouse_operator" />);
  await screen.findByText('Reviewed count accuracy');
  expect(screen.getAllByText('Not measured')).toHaveLength(2);
  expect(screen.queryByText('Save operator profile')).not.toBeInTheDocument();
  expect(client.getWorkforceOperators).not.toHaveBeenCalled();
  expect(screen.queryByText('99.8%')).not.toBeInTheDocument();
});
it('preserves profile version and command identity through uncertain retries', async () => {
  const client = api(); client.workforceCommand.mockRejectedValueOnce(new Error('Connection lost'));
  render(<PythonWorkforcePanel client={client as any} tenantId="store" role="manager" />);
  await screen.findByRole('option', { name: 'Worker' });
  fireEvent.change(screen.getByLabelText('Operator'), { target: { value: 'worker/id' } });
  fireEvent.click(screen.getByText('Save operator profile'));
  await screen.findByRole('alert');
  const first = client.workforceCommand.mock.calls[0];
  expect(first).toEqual(['profiles', expect.objectContaining({ tenantId: 'store', expectedVersion: 2, targetPicksPerHour: 60, mutationId: expect.any(String) }), 'worker/id', undefined]);
  fireEvent.click(screen.getByText('Save operator profile'));
  await waitFor(() => expect(client.workforceCommand).toHaveBeenCalledTimes(2));
  expect(client.workforceCommand.mock.calls[1]).toEqual(first);
});
it('records a selected real source with unknown distance', async () => {
  const client = api();
  client.getWorkforceShifts.mockResolvedValue([{ id: 'shift', status: 'ACTIVE', version: 1, locationId: 'store', startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T16:00:00Z' }]);
  client.getWorkforceSources.mockResolvedValue([{ id: 'movement', kind: 'PICK', label: 'A dispatch' }]);
  render(<PythonWorkforcePanel client={client as any} tenantId="store" role="warehouse_operator" />);
  await screen.findByText('Record completed activity');
  fireEvent.change(screen.getByLabelText('Activity shift'), { target: { value: 'shift' } });
  await screen.findByRole('option', { name: 'A dispatch' });
  fireEvent.change(screen.getByLabelText('Completed source'), { target: { value: 'movement' } });
  fireEvent.click(screen.getByText('Record activity'));
  await waitFor(() => expect(client.workforceCommand).toHaveBeenCalledWith('shifts', expect.objectContaining({ sourceId: 'movement', traversalDistanceMeters: null, durationSeconds: 60 }), 'shift', 'activities'));
});
it('shows explicit fetch failure instead of an empty healthy dashboard', async () => {
  const client = api(); client.getMyWorkforce.mockRejectedValue(new Error('HTTP 403'));
  render(<PythonWorkforcePanel client={client as any} tenantId="store" role="manager" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Workforce unavailable: HTTP 403');
  expect(screen.queryByText('No recorded shifts.')).not.toBeInTheDocument();
});
