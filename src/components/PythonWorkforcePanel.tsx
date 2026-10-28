import { useEffect, useRef, useState, useMemo } from 'react';
import type { PythonRESTAdapter } from '../api/python';

export function PythonWorkforcePanel({ client, tenantId, role, sessionKey }: { client: PythonRESTAdapter; tenantId: string; role: string; sessionKey?: string | null }) {
  const managing = ['admin', 'manager'].includes(role.toLowerCase());
  const allowed = managing || role.toLowerCase() === 'warehouse_operator';
  const [me, setMe] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [operator, setOperator] = useState('');
  const [target, setTarget] = useState('60');
  const [hours, setHours] = useState('8');
  const [certs, setCerts] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('default');
  const [date, setDate] = useState('');
  const [inbound, setInbound] = useState('0');
  const [outbound, setOutbound] = useState('0');
  const [kind, setKind] = useState('PICK');
  const [source, setSource] = useState('');
  const [activityShift, setActivityShift] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [duration, setDuration] = useState('60');
  const [distance, setDistance] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const scope = useRef(0);
  const pending = useRef<{ key: string; mutationId: string } | null>(null);
  const selected = operators.find(o => o.userId === operator);
  // ⚡ Bolt: Replace consecutive .map() and .filter() calls with a single-pass reduce to eliminate redundant iterations and callback overhead
  const certifications = useMemo(() => {
    return certs.split(',').reduce((acc, s) => {
      const trimmed = s.trim();
      if (trimmed) acc.push(trimmed);
      return acc;
    }, [] as string[]);
  }, [certs]);
  async function load(generation = scope.current) {
    const rows = await Promise.all([client.getMyWorkforce(tenantId), client.getWorkforceShifts(tenantId),
      managing ? client.getWorkforceOperators(tenantId) : Promise.resolve([]), managing ? client.getStaffingPlans(tenantId) : Promise.resolve([])]);
    if (generation !== scope.current) return;
    setMe(rows[0]); setShifts(rows[1]); setOperators(rows[2]); setPlans(rows[3]);
  }
  useEffect(() => {
    const generation = ++scope.current;
    setMe(null); setOperators([]); setShifts([]); setPlans([]); setMetrics(null); setOperator(''); setSource(''); setSources([]); setActivityShift(''); setError(''); setBusy(false); pending.current = null;
    setTarget('60'); setHours('8'); setCerts(''); setStart(''); setEnd(''); setLocation('default'); setDate(''); setInbound('0'); setOutbound('0'); setDuration('60'); setDistance('');
    if (allowed) load(generation).catch(e => { if (scope.current === generation) setError(e.message); });
    return () => { scope.current++; };
  }, [client, tenantId, role, sessionKey]);
  useEffect(() => {
    let cancelled = false;
    setSources([]); setSource('');
    if (activityShift && shifts.some(s => s.id === activityShift && s.status === 'ACTIVE')) {
      client.getWorkforceSources(tenantId, activityShift).then(rows => { if (!cancelled) setSources(rows); }).catch(e => { if (!cancelled) setError(e.message); });
    }
    return () => { cancelled = true; };
  }, [client, tenantId, sessionKey, activityShift, shifts]);
  async function send(resource: 'profiles' | 'shifts' | 'plans', body: any, id?: string, action?: 'start' | 'complete' | 'cancel' | 'activities' | 'publish') {
    const generation = scope.current;
    const data = { tenantId, reason: 'Reviewed workforce operation', ...body };
    const key = JSON.stringify([resource, id, action, data]);
    if (pending.current?.key !== key) pending.current = { key, mutationId: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      await client.workforceCommand(resource, { ...data, mutationId: pending.current.mutationId }, id, action);
      if (generation !== scope.current) return;
      pending.current = null;
      await load(generation);
    } catch (e: any) { if (generation === scope.current) setError(e.message); }
    finally { if (generation === scope.current) setBusy(false); }
  }
  async function refresh() { setError(''); try { await load(); } catch (e: any) { setError(e.message); } }
  async function viewMetrics() {
    const generation = scope.current; setMetrics(null);
    try { const value = await client.getOperatorMetrics(tenantId, selected.profile.id); if (generation === scope.current) setMetrics(value); }
    catch (e: any) { if (generation === scope.current) setError(e.message); }
  }
  const metric = metrics || me?.metrics;
  if (!allowed) return null;
  return <section className="glass-panel" aria-label="Workforce">
    <h3>Workforce</h3>
    <p>UTC daily activity. Picks count recorded dispatch tasks; timing and distance are operator-reported. Staffing uses explicit workload inputs.</p>
    {error && <p role="alert">Workforce unavailable: {error}</p>}
    <button type="button" disabled={busy} onClick={refresh}>Refresh workforce</button>
    {metric && <dl><dt>Recorded pick tasks</dt><dd>{metric.recordedPickTasks}</dd><dt>Picks per reported hour</dt><dd>{metric.picksPerReportedHour == null ? 'Not measured' : metric.picksPerReportedHour.toFixed(2)}</dd>
      <dt>Reviewed count accuracy</dt><dd>{metric.countAccuracyPercent == null ? 'Not measured' : `${metric.countAccuracyPercent.toFixed(2)}% (${metric.countLines} lines)`}</dd>
      <dt>Reported traversal distance</dt><dd>{metric.traversalDistanceMeters == null ? 'Incomplete or not measured' : `${metric.traversalDistanceMeters} m`}</dd></dl>}
    {!managing && me && !me.profile && <p>No operator profile. Ask your manager to configure it before assigning a shift.</p>}
    {managing && <>
      <h4>Operator profile and shift assignment</h4>
      <label>Operator <select value={operator} onChange={e => { const value = operators.find(o => o.userId === e.target.value); setOperator(e.target.value); setMetrics(null); setTarget(String(value?.profile?.targetPicksPerHour ?? 60)); setHours(String(value?.profile?.maxConsecutiveHours ?? 8)); setCerts(value?.profile?.certifications?.join(', ') || ''); }}>
        <option value="">Choose an operator</option>{operators.map(o => <option key={o.userId} value={o.userId}>{o.name || o.userId}</option>)}</select></label>
      <label>Target pick tasks per hour <input type="number" min="1" max="10000" value={target} onChange={e => setTarget(e.target.value)} /></label>
      <label>Maximum consecutive hours <input type="number" min="1" max="16" value={hours} onChange={e => setHours(e.target.value)} /></label>
      <label>Certifications (comma separated) <input value={certs} onChange={e => setCerts(e.target.value)} /></label>
      <button disabled={busy || !operator} onClick={() => send('profiles', { expectedVersion: selected?.profile?.version || 0, targetPicksPerHour: Number(target), maxConsecutiveHours: Number(hours), certifications }, operator)}>Save operator profile</button>
      <button disabled={busy || !selected?.profile} onClick={viewMetrics}>View operator metrics</button>
      <label>Shift start (local time) <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Shift end (local time) <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label>Location <input value={location} onChange={e => setLocation(e.target.value)} /></label>
      <button disabled={busy || !selected?.profile || !start || !end || !location} onClick={() => send('shifts', { operatorId: selected.profile.id, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(), locationId: location, requiredCertifications: certifications })}>Assign shift</button>
    </>}
    <h4>{managing ? 'Operator shifts' : 'My shifts'}</h4>
    {me && shifts.length === 0 && <p>No recorded shifts.</p>}
    <ul>{shifts.map(s => <li key={s.id}>{s.locationId}: {new Date(s.startTime).toLocaleString()} – {new Date(s.endTime).toLocaleString()} · {s.status}
      {s.status === 'PLANNED' && <><button disabled={busy} onClick={() => send('shifts', { expectedVersion: s.version }, s.id, 'start')}>Start shift</button>{managing && <button disabled={busy} onClick={() => send('shifts', { expectedVersion: s.version }, s.id, 'cancel')}>Cancel shift</button>}</>}
      {s.status === 'ACTIVE' && <button disabled={busy} onClick={() => send('shifts', { expectedVersion: s.version }, s.id, 'complete')}>Complete shift</button>}
    </li>)}</ul>
    {shifts.some(s => s.status === 'ACTIVE') && <>
      <h4>Record completed activity</h4>
      <p>Use the dispatch movement ID or reviewed count ID. Each source can be recorded once.</p>
      <label>Activity shift <select value={activityShift} onChange={e => setActivityShift(e.target.value)}><option value="">Choose active shift</option>{
        // ⚡ Bolt: Replace O(N) chained .filter().map() inside render with a single-pass reduce to prevent redundant intermediate array allocations
        shifts.reduce((acc, s) => {
          if (s.status === 'ACTIVE') acc.push(<option key={s.id} value={s.id}>{s.locationId} · {s.id}</option>);
          return acc;
        }, [] as React.ReactNode[])
      }</select></label>
      <label>Activity kind <select value={kind} onChange={e => setKind(e.target.value)}><option value="PICK">Dispatch pick task</option><option value="COUNT">Reviewed count</option></select></label>
      <label>Completed source <select value={source} onChange={e => setSource(e.target.value)}><option value="">Choose recorded source</option>{
        // ⚡ Bolt: Replace O(N) chained .filter().map() inside render with a single-pass reduce to prevent redundant intermediate array allocations
        sources.reduce((acc, s) => {
          if (s.kind === kind) acc.push(<option key={s.id} value={s.id}>{s.label}</option>);
          return acc;
        }, [] as React.ReactNode[])
      }</select></label>
      <label>Reported duration (seconds) <input type="number" min="1" max="57600" value={duration} onChange={e => setDuration(e.target.value)} /></label>
      <label>Reported distance (meters, optional) <input type="number" min="0" value={distance} onChange={e => setDistance(e.target.value)} /></label>
      <button disabled={busy || !source || !activityShift} onClick={() => send('shifts', { kind, sourceId: source, durationSeconds: Number(duration), traversalDistanceMeters: distance === '' ? null : Number(distance) }, activityShift, 'activities')}>Record activity</button>
    </>}
    {managing && <>
      <h4>Staffing plans</h4><p>Published plans retain their workload assumptions. Eligible operator counts are capability counts, not confirmed availability or assigned shifts.</p>
      <label>Staffing date <input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <label>Projected inbound tasks <input type="number" min="0" value={inbound} onChange={e => setInbound(e.target.value)} /></label>
      <label>Projected outbound tasks <input type="number" min="0" value={outbound} onChange={e => setOutbound(e.target.value)} /></label>
      <p>Uses the displayed target, maximum hours and certifications above.</p>
      <button disabled={busy || !date} onClick={() => send('plans', { targetDate: date, projectedInboundVolume: Number(inbound), projectedOutboundVolume: Number(outbound), averageOperatorTargetPicks: Number(target), shiftDurationHours: Number(hours), requiredCertifications: certifications })}>Create staffing draft</button>
      <ul>{plans.map(p => <li key={p.id}>{p.targetDate} · {p.status} · Recommended {p.recommendedHeadcount}, eligible {p.eligibleOperatorCount}, shortfall {p.shortfall}.
        {p.status === 'DRAFT' && <button disabled={busy} onClick={() => send('plans', { expectedVersion: p.version }, p.id, 'publish')}>Publish staffing plan</button>}</li>)}</ul>
    </>}
  </section>;
}
