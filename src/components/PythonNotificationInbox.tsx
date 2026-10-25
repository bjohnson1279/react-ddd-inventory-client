import { useEffect, useState } from 'react';
import type { PythonRESTAdapter } from '../api/python';

export function PythonNotificationInbox({ client, tenantId, onOpenReports, sessionKey }: { client: PythonRESTAdapter; tenantId: string; onOpenReports?: () => void; sessionKey?: string | null }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [manager, setManager] = useState('');
  async function refresh() {
    const [notifications, count, directory] = await Promise.all([client.getOwnNotifications(tenantId), client.getOwnUnreadCount(), client.getNotificationManagers()]);
    setRows(notifications); setUnread(count.unread_count);
    setManagers(directory);
  }
  useEffect(() => {
    let current = true;
    setRows(null); setUnread(null); setManagers([]); setManager(''); setError('');
    const load = () => Promise.all([client.getOwnNotifications(tenantId), client.getOwnUnreadCount(), client.getNotificationManagers()])
      .then(([notifications, count, directory]) => { if (current) { setRows(notifications); setUnread(count.unread_count); setManagers(directory); setError(''); } })
      .catch(failure => { if (current) setError(failure.message); });
    load();
    const timer = setInterval(load, 30000);
    return () => { current = false; clearInterval(timer); };
  }, [client, tenantId, sessionKey]);
  async function action(id: string, mode: 'read' | 'snooze' | 'escalate' = 'read') {
    setBusy(true); setError('');
    try {
      if (mode === 'snooze') await client.snoozeOwnNotification(id, 1);
      else if (mode === 'escalate') await client.escalateOwnNotification(id, manager);
      else await client.markNotificationRead(id);
      await refresh();
    } catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="glass-panel" aria-labelledby="python-inbox-title">
    <h3 id="python-inbox-title">Your notifications</h3>
    <div role="status" aria-live="polite">{unread === null ? 'Unread count unavailable.' : `${unread} unread`}</div>
    {error && <p role="alert">{error}</p>}
    {managers.length > 0 && <><label htmlFor="notification-manager">Escalation manager</label><select id="notification-manager" value={manager} onChange={event => setManager(event.target.value)}>
      <option value="">Choose a manager</option>{managers.map(row => <option key={row.id} value={row.id}>{row.name || row.role}</option>)}
    </select></>}
    {rows === null ? <p role="status" aria-live="polite">{error ? 'Inbox unavailable.' : 'Loading inbox…'}</p> : rows.length === 0 ? <p>No current notifications.</p> : <ul>{rows.map(row => <li key={row.id}>
      <p>{row.message}</p><p>{row.status} · {new Date(row.createdAt).toLocaleString()}</p>
      {row.status === 'UNREAD' && <><button disabled={busy} onClick={() => action(row.id)}>Mark {row.id} read</button>
        <button disabled={busy} onClick={() => action(row.id, 'snooze')}>Snooze {row.id} for one hour</button>
        {manager && <button disabled={busy} onClick={() => action(row.id, 'escalate')}>Escalate {row.id}</button>}</>}
      {row.link?.startsWith('/reports/executions/') && onOpenReports && <button onClick={onOpenReports}>View reports</button>}
    </li>)}</ul>}
    <button disabled={busy} onClick={() => { setError(''); refresh().catch(failure => setError(failure.message)); }}>Refresh inbox</button>
  </section>;
}
