import { useEffect, useRef, useState } from 'react';
import type { PythonRESTAdapter } from '../api/python';

export function PythonIntegrationsPanel({ client, tenantId }: { client: PythonRESTAdapter; tenantId: string }) {
  const [connections, setConnections] = useState<any[] | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState('SHOPIFY');
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('');
  const [location, setLocation] = useState('default');
  const [secretRef, setSecretRef] = useState('');
  const [endpointRef, setEndpointRef] = useState('');
  const [journals, setJournals] = useState(false);
  const pending = useRef<{ intent: string; data: Record<string, unknown> } | null>(null);

  async function refresh() {
    const [stores, jobs, sales] = await Promise.all([client.getConnections(tenantId), client.getIntegrationDeliveries(tenantId), client.getIntegrationOrders(tenantId)]);
    setConnections(stores); setDeliveries(jobs); setOrders(sales);
  }
  useEffect(() => {
    let current = true;
    setConnections(null); setDeliveries([]); setOrders([]); setError(''); setNotice(''); pending.current = null;
    setName(''); setOrigin(''); setSecretRef(''); setEndpointRef('');
    Promise.all([client.getConnections(tenantId), client.getIntegrationDeliveries(tenantId), client.getIntegrationOrders(tenantId)])
      .then(([stores, jobs, sales]) => { if (current) { setConnections(stores); setDeliveries(jobs); setOrders(sales); } })
      .catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [client, tenantId]);

  async function command(action: 'create' | 'toggle' | 'retry' | 'fulfill' | 'cancel', body: Record<string, unknown>, id = '') {
    const intent = JSON.stringify([tenantId, action, id, body]);
    if (!pending.current || pending.current.intent !== intent) pending.current = { intent, data: {
      tenantId, ...body, mutationId: crypto.randomUUID(), reason: 'Reviewed integration ' + action,
    } };
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'create') await client.createIntegrationConnection(pending.current.data);
      else if (action === 'toggle') await client.setIntegrationConnectionActive(id, pending.current.data);
      else if (action === 'retry') await client.retryIntegrationDelivery(id, pending.current.data);
      else await client.completeIntegrationOrder(id, action, pending.current.data);
      pending.current = null;
      setNotice(action === 'retry' ? 'Delivery queued for retry.' : action === 'fulfill' ? 'Shipment recorded.' : action === 'cancel' ? 'Reservation released.' : 'Connection saved.');
      await refresh();
    } catch (failure: any) {
      if ([400, 401, 403, 404, 409, 422].includes(failure.status)) pending.current = null;
      setError(failure.message);
    } finally { setBusy(false); }
  }
  async function send(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await client.dispatchIntegrationConnection(id);
      setNotice(result.delivery ? `Delivery ${result.delivery.status.toLowerCase()}.` : 'No delivery ready.');
      await refresh();
    } catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <section className="glass-panel" aria-labelledby="integration-title">
    <h2 id="integration-title">Retail integrations</h2>
    <div role="status" aria-live="polite">{notice}</div>
    {error && <p role="alert">{error}</p>}
    <p>Signed Shopify and WooCommerce orders reserve stock. Confirm shipment to fulfill the reservation, or cancel to release it. Inventory and journals can be exported to your accounting connector. Direct Amazon, ERP OAuth and shipping label setup remain unavailable.</p>
    <form onSubmit={event => {
      event.preventDefault();
      command('create', { name, provider, locationId: location, secretRef,
        ...(provider === 'EVENT_SINK' ? { endpointRef, topics: journals ? ['StockChanged', 'JournalEntryPosted'] : ['StockChanged'] } : { origin }) });
    }}>
      <label htmlFor="integration-provider">Connection type</label>
      <select id="integration-provider" value={provider} onChange={event => setProvider(event.target.value)}>
        <option value="SHOPIFY">Shopify orders</option><option value="WOOCOMMERCE">WooCommerce orders</option><option value="EVENT_SINK">Inventory/accounting connector</option>
      </select>
      <label htmlFor="integration-name">Connection name</label><input id="integration-name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} />
      {provider !== 'EVENT_SINK' && <><label htmlFor="integration-origin">Canonical shop domain or store URL</label><input id="integration-origin" value={origin} onChange={event => setOrigin(event.target.value)} required maxLength={200} />
        <label htmlFor="integration-location">Fulfillment location</label><input id="integration-location" value={location} onChange={event => setLocation(event.target.value)} required maxLength={100} /></>}
      <p>Use the signing-key and endpoint setting names assigned to your store by the operator.</p>
      <label htmlFor="integration-secret">Signing-key setting name</label><input id="integration-secret" value={secretRef} onChange={event => setSecretRef(event.target.value)} required placeholder="INTEGRATION_STORE_KEY" />
      {provider === 'EVENT_SINK' && <><label htmlFor="integration-endpoint">Connector endpoint setting name</label><input id="integration-endpoint" value={endpointRef} onChange={event => setEndpointRef(event.target.value)} required placeholder="INTEGRATION_CONNECTOR_URL" />
        <label><input type="checkbox" checked={journals} onChange={event => setJournals(event.target.checked)} /> Include financial journals</label></>}
      <button type="submit" disabled={busy}>Register connection</button>
    </form>
    <h3>Online orders</h3>
    {connections === null ? <p>Order history unavailable.</p> : orders.length === 0 ? <p>No online orders recorded.</p> : orders.map(row => <div key={row.id}>
      <strong>{row.externalOrderId}</strong> — {row.status}
      {row.status === 'RESERVED' && <>
        <button disabled={busy} onClick={() => { if (window.confirm('Confirm this order has physically shipped?')) command('fulfill', { expectedVersion: row.version }, row.id); }}>Confirm shipment for {row.externalOrderId}</button>
        <button disabled={busy} onClick={() => command('cancel', { expectedVersion: row.version }, row.id)}>Cancel reservation for {row.externalOrderId}</button>
      </>}
    </div>)}
    <h3>Connections</h3>
    {connections === null ? <p>{error ? 'Connections unavailable.' : 'Loading connections…'}</p> : connections.length === 0 ? <p>No connections registered. Register a signed store webhook or connector above.</p> : connections.map(row => <div key={row.id}>
      <strong>{row.name}</strong> — {row.provider}, {row.active ? 'Enabled' : 'Paused'}
      {row.webhookPath && <p>Webhook path: <code>{row.webhookPath}</code></p>}
      <button disabled={busy} onClick={() => command('toggle', { active: !row.active, expectedVersion: row.version }, row.id)}>{row.active ? 'Pause' : 'Enable'} {row.name}</button>
      {row.provider === 'EVENT_SINK' && <button disabled={busy || !row.active} onClick={() => send(row.id)}>Send next delivery for {row.name}</button>}
    </div>)}
    <table><caption>Connector delivery history</caption><thead><tr><th scope="col">Sequence</th><th scope="col">Event</th><th scope="col">Status</th><th scope="col">Remote reference/error</th><th scope="col">Action</th></tr></thead>
      <tbody>{deliveries.map(row => <tr key={row.id}><th scope="row">{row.number}</th><td>{row.type}</td><td>{row.status}</td><td>{row.externalId || row.lastError || 'Awaiting acknowledgement'}</td>
        <td>{row.status === 'FAILED' && <button disabled={busy} onClick={() => command('retry', { expectedVersion: row.version }, row.id)}>Retry delivery {row.number}</button>}</td></tr>)}
        {deliveries.length === 0 && <tr><td colSpan={5}>{connections === null ? 'Delivery history unavailable.' : 'No deliveries recorded.'}</td></tr>}</tbody></table>
    <button disabled={busy} onClick={() => refresh().catch(failure => setError(failure.message))}>Refresh integrations</button>
  </section>;
}
