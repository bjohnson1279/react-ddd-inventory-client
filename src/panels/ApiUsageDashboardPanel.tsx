import React, { useEffect, useState, useMemo } from 'react';
import { useInventory } from '../api/client';
import { Activity, Zap } from 'lucide-react';

export const ApiUsageDashboardPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    client.getApiUsageMetrics(tenantId).then(setMetrics).catch(console.error);
  }, [client, tenantId]);

  const { totalCalls, totalErrors, avgLatency } = useMemo(() => {
    let calls = 0;
    let errs = 0;
    let latSum = 0;
    metrics.forEach(m => {
      calls += m.calls || 0;
      errs += m.errors || 0;
      latSum += (m.averageLatencyMs || 0) * (m.calls || 0);
    });
    const avgLatency = calls > 0 ? (latSum / calls).toFixed(1) : 0;
    return { totalCalls: calls, totalErrors: errs, avgLatency };
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <Activity className="text-blue-500 mb-2" size={24} />
          <div className="text-3xl font-bold text-slate-800">{totalCalls}</div>
          <div className="text-sm text-slate-500 mt-1">Total API Calls</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">{totalErrors}</div>
          <div className="text-sm text-slate-500 mt-1">Total Errors</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <Zap className="text-amber-500 mb-2" size={24} />
          <div className="text-3xl font-bold text-slate-800">{avgLatency} ms</div>
          <div className="text-sm text-slate-500 mt-1">Avg Latency</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-800">Daily API Usage Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-6 font-medium">Date</th>
                <th className="py-3 px-6 font-medium">Endpoint</th>
                <th className="py-3 px-6 font-medium text-right">Calls</th>
                <th className="py-3 px-6 font-medium text-right">Errors</th>
                <th className="py-3 px-6 font-medium text-right">Avg Latency (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-6 text-slate-700">{m.date}</td>
                  <td className="py-3 px-6 text-slate-700 font-mono text-xs">{m.endpoint}</td>
                  <td className="py-3 px-6 text-right font-medium">{m.calls}</td>
                  <td className="py-3 px-6 text-right text-red-600">{m.errors}</td>
                  <td className="py-3 px-6 text-right">{m.averageLatencyMs}</td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No metrics available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
