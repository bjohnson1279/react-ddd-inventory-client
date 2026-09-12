import React, { useState } from 'react';

interface LiquidationRule {
  id: string;
  daysToExpiration: number;
  markdownPercentage: number;
  isActive: boolean;
}

interface MarkdownEvent {
  id: string;
  variantId: string;
  originalPriceCents: number;
  newPriceCents: number;
  reason: string;
  createdAt: string;
}

export const YieldManagementDashboard: React.FC = () => {
  const [rules, setRules] = useState<LiquidationRule[]>([
    { id: '1', daysToExpiration: 30, markdownPercentage: 15, isActive: true },
    { id: '2', daysToExpiration: 15, markdownPercentage: 30, isActive: true },
    { id: '3', daysToExpiration: 5, markdownPercentage: 70, isActive: false },
  ]);

  const [events, setEvents] = useState<MarkdownEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const runYieldOptimization = async () => {
    setLoading(true);
    // Mocking an API call to GraphQL mutation runYieldOptimization
    setTimeout(() => {
      setEvents([
        {
          id: 'ev1',
          variantId: 'var_88x',
          originalPriceCents: 1500,
          newPriceCents: 1275,
          reason: 'FEFO Proximity: 28 days until expiration (Rule: 15% off)',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ev2',
          variantId: 'var_99y',
          originalPriceCents: 2000,
          newPriceCents: 1400,
          reason: 'FEFO Proximity: 12 days until expiration (Rule: 30% off)',
          createdAt: new Date().toISOString()
        }
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yield Management & Dynamic Pricing</h1>
          <p className="text-gray-500">Maximize capital recovery on aging stock via FEFO markdown automation.</p>
        </div>
        <button
          onClick={runYieldOptimization}
          disabled={loading}
          className={`px-4 py-2 text-white font-medium rounded shadow ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Optimizing Yield...' : 'Run Optimization'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Active Liquidation Rules</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-2 font-medium text-gray-600 text-sm">Threshold (Days)</th>
                <th className="p-2 font-medium text-gray-600 text-sm">Markdown (%)</th>
                <th className="p-2 font-medium text-gray-600 text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                  <td className="p-2">{'<= '}{rule.daysToExpiration}</td>
                  <td className="p-2">{rule.markdownPercentage}%</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Markdown Event Log</h2>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No markdowns have been executed recently.</p>
          ) : (
            <div className="space-y-4">
              {events.map(ev => (
                <div key={ev.id} className="p-3 border rounded border-l-4 border-l-blue-500 bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-800">Variant {ev.variantId}</span>
                    <span className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{ev.reason}</div>
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="line-through text-red-400">${(ev.originalPriceCents / 100).toFixed(2)}</span>
                    <span className="text-green-600">${(ev.newPriceCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
