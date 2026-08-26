import React, { useState, useEffect } from 'react';
import { Spinner } from './Panels';

interface ConformanceDashboardPanelProps {
  tenantId: string;
}

const CONFORMANCE_RESULTS = [

const conformanceResults = [
  { module: 'Inventory CRUD', graphql: { pass: 24, fail: 0, skip: 0 }, express: { pass: 24, fail: 0, skip: 0 }, php: { pass: 23, fail: 1, skip: 0 } },
  { module: 'Accounting Ledger', graphql: { pass: 15, fail: 0, skip: 0 }, express: { pass: 15, fail: 0, skip: 0 }, php: { pass: 15, fail: 0, skip: 0 } },
  { module: 'Compliance Rules', graphql: { pass: 10, fail: 0, skip: 0 }, express: { pass: 10, fail: 0, skip: 0 }, php: { pass: 9, fail: 0, skip: 1 } },
];

// ⚡ Bolt: Hoist the static totalStats calculation completely outside the component to guarantee it runs only once per module load, avoiding any per-instance render overhead.
const TOTAL_STATS = CONFORMANCE_RESULTS.reduce(
const totalStats = conformanceResults.reduce(
  (acc, cur) => {
    acc.total += 3 * (cur.graphql.pass + cur.graphql.fail + cur.graphql.skip);
    acc.pass += cur.graphql.pass + cur.express.pass + cur.php.pass;
    acc.fail += cur.graphql.fail + cur.express.fail + cur.php.fail;
    acc.skip += cur.graphql.skip + cur.express.skip + cur.php.skip;
    return acc;
  },
  { total: 0, pass: 0, fail: 0, skip: 0 }
);

export const ConformanceDashboardPanel: React.FC<ConformanceDashboardPanelProps> = ({ tenantId }) => {
  // --- Section A: Live Backend Health Monitor ---
  const [healthData, setHealthData] = useState([
    { name: 'GraphQL', port: 4000, status: 'Checking', latency: 0, lastChecked: Date.now() },
    { name: 'Express REST', port: 5000, status: 'Checking', latency: 0, lastChecked: Date.now() },
    { name: 'PHP REST', port: 8000, status: 'Checking', latency: 0, lastChecked: Date.now() }
  ]);
  const [pollingInterval, setPollingInterval] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    const endpoints = [
      { name: 'GraphQL', url: 'http://localhost:4000' },
      { name: 'Express REST', url: 'http://localhost:5000' },
      { name: 'PHP REST', url: 'http://localhost:8000' }
    ];

    const results = await Promise.all(
      endpoints.map(async (ep) => {
        const start = performance.now();
        try {
          // Pinging the root or a dummy endpoint to check if the server is up
          await fetch(ep.url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
          const end = performance.now();
          return { name: ep.name, status: 'Online', latency: Math.round(end - start), lastChecked: Date.now() };
        } catch (e) {
          return { name: ep.name, status: 'Offline', latency: 0, lastChecked: Date.now() };
        }
      })
    );

    setHealthData((prev) =>
      prev.map((h) => {
        const result = results.find((r) => r.name === h.name);
        return result ? { ...h, ...result } : h;
      })
    );
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkHealth();
    let intervalId: any;
    if (pollingInterval > 0) {
      intervalId = setInterval(checkHealth, pollingInterval * 1000);
    }
    return () => clearInterval(intervalId);
  }, [pollingInterval]);


  // --- Section B: Conformance Test Results Viewer ---

  const parityPercentage = ((TOTAL_STATS.pass / TOTAL_STATS.total) * 100).toFixed(1);
  // ⚡ Bolt: Use pre-calculated static totalStats outside of the render function to prevent reduction on every render


  const parityPercentage = ((totalStats.pass / totalStats.total) * 100).toFixed(1);

  // --- Section C: API Response Comparison Tool ---
  const [selectedOperation, setSelectedOperation] = useState('inventory');
  const [comparisonResults, setComparisonResults] = useState<{ graphql?: any, express?: any, php?: any } | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const handleCompare = async () => {
    setIsComparing(true);
    setComparisonResults(null);
    try {
      const paths = {
        inventory: {
          graphql: { query: 'query { inventoryItems { id sku quantity } }' },
          rest: '/api/inventory'
        },
        compliance: {
          graphql: { query: 'query { complianceLedger { id status } }' },
          rest: '/api/compliance/ledger'
        }
      };

      const op = paths[selectedOperation as keyof typeof paths];
      
      const fetchApi = async (url: string, isGraphql: boolean = false) => {
        try {
          if (isGraphql) {
            const res = await fetch(`${url}/graphql`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(op.graphql)
            });
            if(!res.ok) throw new Error('Failed');
            return await res.json();
          } else {
            const res = await fetch(`${url}${op.rest}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', 'tenant-id': tenantId }
            });
            if(!res.ok) throw new Error('Failed');
            return await res.json();
          }
        } catch(e: any) {
          return { error: e.message || 'Connection Refused' };
        }
      };

      const [graphqlRes, expressRes, phpRes] = await Promise.all([
        fetchApi('http://localhost:4000', true),
        fetchApi('http://localhost:5000', false),
        fetchApi('http://localhost:8000', false)
      ]);

      setComparisonResults({ graphql: graphqlRes, express: expressRes, php: phpRes });
    } catch(e) {
      console.error(e);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="conformance-dashboard">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 700 }}>Cross-Backend Conformance</h2>
          <p style={{ color: 'var(--text-muted)' }}>Monitor health and parity across GraphQL, Express, and PHP backends</p>
        </div>
      </div>

      {/* Section A */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="flex-between">
          <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>Live Backend Health</h3>
          <div className="flex-gap-1">
            <select value={pollingInterval} onChange={(e) => setPollingInterval(Number(e.target.value))} style={{ width: 'auto' }}>
              <option value="0">Polling Off</option>
              <option value="5">Every 5s</option>
              <option value="15">Every 15s</option>
              <option value="30">Every 30s</option>
            </select>
            <button className="btn btn-secondary" onClick={checkHealth} disabled={isRefreshing} aria-busy={isRefreshing}>
              {isRefreshing ? <Spinner /> : 'Refresh'}
            </button>
          </div>
        </div>
        
        <div className="grid-cols-3" style={{ marginTop: '1.5rem' }}>
          {healthData.map((node) => (
            <div className={`stat-card ${node.status === 'Online' ? 'success-accent' : node.status === 'Offline' ? 'error-accent' : ''}`} key={node.name}>
              <span className="stat-title">{node.name} (:{node.port})</span>
              <span className="stat-value">
                {node.status === 'Online' ? '🟢 Online' : node.status === 'Offline' ? '🔴 Offline' : '🟡 Checking'}
              </span>
              <div className="flex-between" style={{ marginTop: '0.5rem' }}>
                <span className="stat-desc">Latency: {node.latency}ms</span>
                <span className="stat-desc">Checked: {new Date(node.lastChecked).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section B */}
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div className="flex-between">
          <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>Conformance Test Parity</h3>
          <div>
            <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>Total: {TOTAL_STATS.total}</span>
            <span className="badge badge-success" style={{ marginRight: '0.5rem' }}>Pass: {TOTAL_STATS.pass}</span>
            <span className="badge badge-error" style={{ marginRight: '0.5rem' }}>Fail: {TOTAL_STATS.fail}</span>
            <span className="badge badge-warning">Skip: {TOTAL_STATS.skip}</span>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '0.5rem' }}>
          Overall Parity: <strong style={{ color: parityPercentage === '100.0' ? 'var(--success)' : 'var(--warning)' }}>{parityPercentage}%</strong>
        </p>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Test Module</th>
                <th>GraphQL (4000)</th>
                <th>Express REST (5000)</th>
                <th>PHP REST (8000)</th>
              </tr>
            </thead>
            <tbody>
              {CONFORMANCE_RESULTS.map((row, idx) => (
                <tr key={idx}>
                  <td><strong>{row.module}</strong></td>
                  <td>
                    <span style={{ color: 'var(--success)' }}>✅ {row.graphql.pass}</span>{' '}
                    {row.graphql.fail > 0 && <span style={{ color: 'var(--error)' }}>❌ {row.graphql.fail}</span>}{' '}
                    {row.graphql.skip > 0 && <span style={{ color: 'var(--warning)' }}>⏭️ {row.graphql.skip}</span>}
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)' }}>✅ {row.express.pass}</span>{' '}
                    {row.express.fail > 0 && <span style={{ color: 'var(--error)' }}>❌ {row.express.fail}</span>}{' '}
                    {row.express.skip > 0 && <span style={{ color: 'var(--warning)' }}>⏭️ {row.express.skip}</span>}
                  </td>
                  <td>
                    <span style={{ color: 'var(--success)' }}>✅ {row.php.pass}</span>{' '}
                    {row.php.fail > 0 && <span style={{ color: 'var(--error)' }}>❌ {row.php.fail}</span>}{' '}
                    {row.php.skip > 0 && <span style={{ color: 'var(--warning)' }}>⏭️ {row.php.skip}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section C */}
      <div className="glass-panel">
        <h3 className="form-section-title">API Response Comparison</h3>
        <div className="flex-gap-1" style={{ marginBottom: '1.5rem' }}>
          <select value={selectedOperation} onChange={(e) => setSelectedOperation(e.target.value)} style={{ width: '300px' }}>
            <option value="inventory">Get Inventory Items</option>
            <option value="compliance">Get Compliance Ledger</option>
          </select>
          <button className="btn btn-primary" onClick={handleCompare} disabled={isComparing} aria-busy={isComparing}>
            {isComparing ? <Spinner /> : 'Compare Across Backends'}
          </button>
        </div>

        {comparisonResults && (
          <div className="grid-cols-3">
            <div className="response-box">
              <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>GraphQL (Port 4000)</h4>
              <pre><code>{JSON.stringify(comparisonResults.graphql, null, 2)}</code></pre>
            </div>
            <div className="response-box">
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Express (Port 5000)</h4>
              <pre><code>{JSON.stringify(comparisonResults.express, null, 2)}</code></pre>
            </div>
            <div className="response-box">
              <h4 style={{ color: 'var(--info)', marginBottom: '0.5rem' }}>PHP (Port 8000)</h4>
              <pre><code>{JSON.stringify(comparisonResults.php, null, 2)}</code></pre>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .success-accent::before { background: var(--success); }
        .error-accent::before { background: var(--error); }
        .response-box {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--panel-border);
          border-radius: var(--radius-sm);
          padding: 1rem;
          overflow: auto;
          max-height: 400px;
        }
        .response-box pre {
          margin: 0;
          font-family: monospace;
          font-size: 0.85rem;
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
};
