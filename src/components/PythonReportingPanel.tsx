import { useEffect, useRef, useState } from 'react';
import type { PythonRESTAdapter } from '../api/python';
import { PythonNotificationInbox } from './PythonNotificationInbox';

export function PythonReportingPanel({ client, tenantId, role, sessionKey }: { client: PythonRESTAdapter; tenantId: string; role: string; sessionKey?: string | null }) {
  const [reports, setReports] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('STOCK');
  const [sku, setSku] = useState('');
  const [location, setLocation] = useState('');
  const [format, setFormat] = useState('json');
  const [cron, setCron] = useState('0 9 * * *');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [asOf, setAsOf] = useState('');
  const [draftRules, setDraftRules] = useState({ lowStock: false, expiry: false, expiryDays: 7 });
  const pending = useRef<{ intent: string; data: Record<string, unknown> } | null>(null);
  const reportsAllowed = !['warehouse_operator', 'supplier_user'].includes(role.toLowerCase());
  const manageReports = ['admin', 'manager', 'accountant'].includes(role.toLowerCase());
  const manageAlerts = ['admin', 'manager'].includes(role.toLowerCase());
  const financial = ['TRIAL_BALANCE', 'INCOME_STATEMENT', 'BALANCE_SHEET'].includes(type);
  const types = ['STOCK', 'INVENTORY_VALUATION', 'INVENTORY_AGING', 'MOVEMENTS', 'REPLENISHMENT',
    ...(['admin', 'manager', 'accountant'].includes(role.toLowerCase()) ? ['TRIAL_BALANCE', 'INCOME_STATEMENT', 'BALANCE_SHEET'] : [])];
  const typeLabels: Record<string, string> = { STOCK: 'Stock on hand', INVENTORY_VALUATION: 'Stock valuation', INVENTORY_AGING: 'Stock aging', MOVEMENTS: 'Movement history', REPLENISHMENT: 'Replenishment', TRIAL_BALANCE: 'Trial balance', INCOME_STATEMENT: 'Income statement', BALANCE_SHEET: 'Balance sheet' };
  async function data() {
    return Promise.all([reportsAllowed ? client.getReportDefinitions(tenantId) : [], reportsAllowed ? client.getReportExecutions(tenantId) : [],
      reportsAllowed ? client.getReportSchedules(tenantId) : [], client.getRetailAlerts(), client.getRetailAlertConfig()]);
  }
  function apply([definitions, executions, plans, conditions, settings]: any[]) {
    setReports(definitions); setJobs(executions); setSchedules(plans); setAlerts(conditions); setConfig(settings);
    setDraftRules({ lowStock: settings.lowStock, expiry: settings.expiry, expiryDays: settings.expiryDays });
  }
  async function refresh() { apply(await data()); }
  useEffect(() => {
    let current = true;
    setConfig(null); setReports([]); setJobs([]); setSchedules([]); setAlerts([]); setError(''); setNotice(''); pending.current = null;
    data().then(result => { if (current) apply(result); }).catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [client, tenantId, role, sessionKey]);
  async function command(path: string, body: Record<string, unknown>) {
    const intent = JSON.stringify([tenantId, path, body]);
    if (!pending.current || pending.current.intent !== intent) pending.current = { intent, data: {
      ...body, tenantId, mutationId: crypto.randomUUID(), reason: 'Reviewed reporting/alert command',
    } };
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.reportCommand(path, pending.current.data);
      pending.current = null;
      setNotice(result.executionId ? 'Report queued. Its export becomes available after generation.' : 'Configuration saved.');
      await refresh();
    } catch (failure: any) {
      if ([400, 401, 403, 404, 409, 422].includes(failure.status)) pending.current = null;
      setError(failure.message);
    } finally { setBusy(false); }
  }
  async function process(id: string) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await client.processReportExecution(id); setNotice(`Report ${result.status.toLowerCase()}.`); await refresh(); }
    catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function download(job: any) {
    setBusy(true); setError('');
    try {
      const blob = await client.downloadReportExecution(job.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `report.${job.format}`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div>
    <section className="glass-panel" aria-labelledby="python-report-title">
      <h2 id="python-report-title">Reports and retail alerts</h2>
      <div role="status" aria-live="polite">{notice}</div>{error && <p role="alert">{error}</p>}
      {!config && <p>{error ? 'Reporting data unavailable.' : 'Loading reporting data…'}</p>}
      {manageReports && <form onSubmit={event => { event.preventDefault(); command('/reports', {
        name, type, filters: { ...(!financial ? { ...(sku ? { sku } : {}), ...(location ? { locationId: location } : {}) } : {}),
          ...(['MOVEMENTS', 'INCOME_STATEMENT'].includes(type) ? { ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) } : {}),
          ...(['TRIAL_BALANCE', 'BALANCE_SHEET'].includes(type) && asOf ? { asOf } : {}) },
      }); }}>
        <label htmlFor="report-name">Report name</label><input id="report-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} />
        <label htmlFor="report-type">Report type</label><select id="report-type" value={type} onChange={event => setType(event.target.value)}>{types.map(kind => <option key={kind} value={kind}>{typeLabels[kind]}</option>)}</select>
        {!financial && <><label htmlFor="report-sku">SKU filter (optional)</label><input id="report-sku" value={sku} onChange={event => setSku(event.target.value)} />
          <label htmlFor="report-location">Location filter (optional)</label><input id="report-location" value={location} onChange={event => setLocation(event.target.value)} /></>}
        {['MOVEMENTS', 'INCOME_STATEMENT'].includes(type) && <><label htmlFor="report-from">From UTC date (optional)</label><input id="report-from" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
          <label htmlFor="report-through">Through UTC date (optional)</label><input id="report-through" type="date" value={toDate} onChange={event => setToDate(event.target.value)} /></>}
        {['TRIAL_BALANCE', 'BALANCE_SHEET'].includes(type) && <><label htmlFor="report-asof">As of UTC date (optional)</label><input id="report-asof" type="date" value={asOf} onChange={event => setAsOf(event.target.value)} /></>}
        <button disabled={busy}>Create report</button>
      </form>}
      {reportsAllowed && <>
        <label htmlFor="report-format">Export format</label><select id="report-format" value={format} onChange={event => setFormat(event.target.value)}><option value="json">JSON</option><option value="csv">CSV</option></select>
        <label htmlFor="report-cron">Schedule in UTC (minute hour * * weekday, or * for daily)</label><input id="report-cron" value={cron} onChange={event => setCron(event.target.value)} />
        {reports.length === 0 && config && <p>No report definitions. Create a stock or financial report above.</p>}
        {reports.map(row => <div key={row.id}><strong>{row.name}</strong> — {typeLabels[row.type] || row.type}
          <button disabled={busy} onClick={() => command(`/reports/${encodeURIComponent(row.id)}/execute`, { format })}>Queue {row.name}</button>
          {manageReports && <button disabled={busy} onClick={() => command(`/reports/${encodeURIComponent(row.id)}/schedule`, { cronExpression: cron, format, deliveryMethod: 'INTERNAL' })}>Schedule {row.name}</button>}
        </div>)}
        <table><caption>Report execution history</caption><thead><tr><th scope="col">Execution</th><th scope="col">Status</th><th scope="col">Error</th><th scope="col">Actions</th></tr></thead><tbody>
          {jobs.map(job => <tr key={job.id}><th scope="row">{job.name || job.id}</th><td>{job.status}{job.complete === false && ' — Data needs review'}</td><td>{job.error || ''}</td><td>
            {manageReports && job.status === 'QUEUED' && <button disabled={busy} onClick={() => process(job.id)}>Generate {job.id}</button>}
            {manageReports && job.status === 'FAILED' && <button disabled={busy} onClick={() => command(`/reports/executions/${encodeURIComponent(job.id)}/retry`, { expectedVersion: job.version })}>Retry {job.id}</button>}
            {job.status === 'COMPLETED' && <button disabled={busy} onClick={() => download(job)}>Download {job.id}</button>}
          </td></tr>)}{jobs.length === 0 && <tr><td colSpan={4}>{config ? 'No executions recorded.' : 'Execution history unavailable.'}</td></tr>}
        </tbody></table>
        {schedules.map(row => <div key={row.id}>{row.cronExpression} UTC — {row.active ? `Next run: ${row.nextRunAt}` : 'Paused'} {row.error}
          {manageReports && <button disabled={busy} onClick={() => command(`/reports/schedules/${encodeURIComponent(row.id)}/active`, { active: !row.active, expectedVersion: row.version })}>{row.active ? 'Pause' : 'Enable'} schedule {row.id}</button>}
        </div>)}
      </>}
      {config && <><h3>Retail alert monitoring</h3><p>Low stock: {config.lowStock ? 'Enabled' : 'Disabled'}. Expiry: {config.expiry ? `Enabled (${config.expiryDays} days)` : 'Disabled'}.</p>
        {manageAlerts && <form onSubmit={event => { event.preventDefault(); command('/alerts/config', { ...draftRules, expectedVersion: config.version }); }}>
          <label><input type="checkbox" checked={draftRules.lowStock} onChange={event => setDraftRules({ ...draftRules, lowStock: event.target.checked })} /> Monitor low stock</label>
          <label><input type="checkbox" checked={draftRules.expiry} onChange={event => setDraftRules({ ...draftRules, expiry: event.target.checked })} /> Monitor expiring lots</label>
          <label htmlFor="alert-expiry-days">Days before expiry</label><input id="alert-expiry-days" type="number" min={0} max={90} step={1} required value={draftRules.expiryDays} onChange={event => setDraftRules({ ...draftRules, expiryDays: Number(event.target.value) })} />
          <button disabled={busy}>Save alert monitoring</button>
        </form>}
        {alerts.length === 0 ? <p>No active retail alert conditions.</p> : <ul>{alerts.map(row => <li key={row.id}>{row.kind}: {row.facts.sku} at {row.facts.locationId}, episode {row.episode}</li>)}</ul>}
      </>}
      <button disabled={busy} onClick={() => { setError(''); refresh().catch(failure => setError(failure.message)); }}>Refresh reports and alerts</button>
    </section>
    <PythonNotificationInbox client={client} tenantId={tenantId} sessionKey={sessionKey} />
  </div>;
}
