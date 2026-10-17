import { useEffect, useRef, useState, useMemo } from 'react';
import type { PythonRESTAdapter } from '../api/python';

function money(value: number | null | undefined) {
  if (value == null) return 'Unpriced';
  const amount = BigInt(Math.abs(value));
  return `${value < 0 ? '-' : ''}$${(amount / 100n).toLocaleString()}.${(amount % 100n).toString().padStart(2, '0')}`;
}

export function FinancialAccountingPanel({ client, tenantId, onPosted }: { client: PythonRESTAdapter; tenantId: string; onPosted: () => void }) {
  const [status, setStatus] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [trial, setTrial] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cutoff, setCutoff] = useState('');
  const [reason, setReason] = useState('');
  const pending = useRef<{ action: string; intent: string; payload: any } | null>(null);

  async function refresh() {
    const current = await client.getFinancialStatus(tenantId);
    setStatus(current);
    if (current.active) {
      const [balance, stock] = await Promise.all([client.getFinancialTrialBalance(tenantId), client.getFinancialReconciliation(tenantId)]);
      setTrial(balance);
      setReconciliation(stock);
    } else setPreview(await client.getFinancialOpeningPreview(tenantId));
  }

  useEffect(() => {
    let current = true;
    setStatus(null); setTrial(null); setPreview(null); setReconciliation(null); setError(''); setNotice(''); pending.current = null;
    (async () => {
      try {
        const state = await client.getFinancialStatus(tenantId);
        if (!current) return;
        setStatus(state);
        if (state.active) {
          const [balance, stock] = await Promise.all([client.getFinancialTrialBalance(tenantId), client.getFinancialReconciliation(tenantId)]);
          if (current) { setTrial(balance); setReconciliation(stock); }
        } else {
          const opening = await client.getFinancialOpeningPreview(tenantId);
          if (current) setPreview(opening);
        }
      } catch (failure: any) { if (current) setError(failure.message); }
    })();
    return () => { current = false; };
  }, [client, tenantId]);

  // ⚡ Bolt: Use a single-pass reduce inside useMemo to eliminate redundant O(N) traversals and intermediate array allocations
  const activeAccounts = useMemo(() => {
    if (!trial?.accounts) return [];
    return trial.accounts.reduce((acc: any[], account: any) => {
      if (account.balanceCents !== 0) acc.push(account);
      return acc;
    }, []);
  }, [trial?.accounts]);

  async function command(action: 'activate' | 'close') {
    const intent = JSON.stringify([tenantId, action, action === 'close' ? cutoff : '', action === 'close' ? reason : 'Reviewed opening inventory balances']);
    if (!pending.current || pending.current.intent !== intent) pending.current = { action, intent, payload: {
      tenantId, expectedVersion: status.version, mutationId: crypto.randomUUID(),
      reason: action === 'close' ? reason : 'Reviewed opening inventory balances', ...(action === 'close' ? { closedThrough: cutoff } : {}) } };
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'activate') await client.activateFinancialAccounting(pending.current.payload);
      else await client.closeFinancialPeriod(pending.current.payload);
      pending.current = null;
      setNotice(action === 'activate' ? 'Financial accounting started.' : 'Accounting period closed.');
      await refresh(); onPosted();
    } catch (failure: any) {
      if ([400, 401, 403, 404, 409, 422].includes(failure.status)) pending.current = null;
      setError(failure.message);
    } finally { setBusy(false); }
  }

  return <section className="glass-panel" style={{ gridColumn: '1 / -1' }} aria-labelledby="financial-title">
    <h3 id="financial-title">Financial accounting</h3>
    <div role="status" aria-live="polite">{notice}</div>
    {error && <div role="alert">{error}</div>}
    {!status ? <p>Loading financial accounting…</p> : !status.active ? <>
      <p>Start accounting with a reviewed opening inventory balance. Existing cash, receivables and payables require separate opening entries.</p>
      {preview && <>
        <p>On hand: <strong>{money(preview.onHandValueCents)}</strong>. In transit: <strong>{money(preview.inTransitValueCents)}</strong>. Method: {preview.method}.</p>
        {preview.problems.map((problem: any, index: number) => <p key={index}>{problem.sku}: {problem.reason}</p>)}
        <button className="btn btn-primary" disabled={busy || !preview.complete} onClick={() => command('activate')}>Start financial accounting</button>
      </>}
    </> : <>
      <p>Method: {status.method}. Closed through: {status.closedThrough || 'No periods closed'}.</p>
      {trial && <>
        <p>Trial balance: {trial.isBalanced ? 'Balanced' : 'Out of balance'}. {trial.complete ? 'All stock sources resolved.' : `${trial.unresolvedSources} stock sources need accounting review.`}</p>
        <div className="table-wrapper"><table>
          <caption>Account balances in USD</caption>
          <thead><tr><th scope="col">Account</th><th scope="col">Debit balance</th><th scope="col">Credit balance</th></tr></thead>
          <tbody>{activeAccounts.map((account: any) => <tr key={account.accountCode}>
            <th scope="row">{account.accountCode} {account.accountName}</th><td>{money(Math.max(account.balanceCents, 0))}</td><td>{money(Math.max(-account.balanceCents, 0))}</td>
          </tr>)}{activeAccounts.length === 0 && <tr><td colSpan={3}>No nonzero account balances posted.</td></tr>}</tbody>
        </table></div>
      </>}
      {reconciliation && <p>Inventory reconciliation: {reconciliation.isReconciled ? 'Matches stock carrying values.' : 'Needs review.'}
        {' '}Inventory balance: {money(reconciliation.ledgerInventoryCents)}. In transit: {money(reconciliation.ledgerTransitCents)}.</p>}
      <form onSubmit={event => { event.preventDefault(); command('close'); }}>
        <label htmlFor="financial-cutoff">Close through (UTC date)</label>
        <input id="financial-cutoff" type="date" value={cutoff} onChange={event => setCutoff(event.target.value)} required />
        <label htmlFor="financial-close-reason">Review reason</label>
        <input id="financial-close-reason" value={reason} onChange={event => setReason(event.target.value)} required maxLength={500} />
        <button className="btn btn-primary" type="submit" disabled={busy || !reason.trim()}>Close completed period</button>
      </form>
    </>}
    <button className="btn btn-secondary" disabled={busy} onClick={() => { setError(''); refresh().catch(failure => setError(failure.message)); }}>Refresh accounting</button>
  </section>;
}
