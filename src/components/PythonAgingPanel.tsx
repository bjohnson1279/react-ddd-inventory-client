import { useEffect, useState } from 'react';
import type { PythonRESTAdapter } from '../api/python';

export function PythonAgingPanel({ client, tenantId, sessionKey }: { client: PythonRESTAdapter; tenantId: string; sessionKey?: string | null }) {
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setReport(null); setError('');
    client.generateAgingReport(tenantId).then(result => { if (current) setReport(result); }).catch(failure => { if (current) setError(failure.message); });
    return () => { current = false; };
  }, [client, tenantId, sessionKey]);
  return <section className="glass-panel" aria-labelledby="python-aging-title">
    <h3 id="python-aging-title">Stock aging</h3>{error && <p role="alert">{error}</p>}
    {!report ? <p>{error ? 'Aging data unavailable.' : 'Loading stock aging…'}</p> : <>
      <p>Age uses recorded receipt dates for stock still on hand. Generated: {new Date(report.generatedAt).toLocaleString()}.</p>
      {!report.complete && <p role="status">Some layer quantities need review.</p>}
      <table><caption>Remaining quantities by recorded age</caption><thead><tr><th scope="col">SKU</th><th scope="col">Location/unit</th><th scope="col">0–30 days</th><th scope="col">31–60 days</th><th scope="col">61–90 days</th><th scope="col">Over 90 days</th><th scope="col">Unknown age</th></tr></thead>
        <tbody>{report.rows.slice(0, 100).map((row: any) => <tr key={JSON.stringify([row.sku, row.locationId])}><th scope="row">{row.sku}</th><td>{row.locationId} / {row.baseUnit || 'units'}</td><td>{row.age0To30}</td><td>{row.age31To60}</td><td>{row.age61To90}</td><td>{row.ageOver90}</td><td>{row.unknownAgeQuantity}</td></tr>)}
          {report.rows.length === 0 && <tr><td colSpan={7}>No recorded stock to age.</td></tr>}</tbody></table>
      {report.rows.length > 100 && <p>Showing the first 100 rows. Export the full aging report in Reports.</p>}
    </>}
  </section>;
}
