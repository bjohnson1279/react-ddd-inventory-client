import React, { useEffect, useState } from 'react';
import { useInventory } from '../api/client';
import { BarChart3 } from 'lucide-react';

export const InventoryAgingPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    client.generateAgingReport(tenantId).then(setReport).catch(console.error);
  }, [client, tenantId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-500" /> Inventory Aging
        </h3>
      </div>
      <div className="p-6">
        {!report ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-20 bg-slate-100 rounded w-full"></div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Generated at: {new Date(report.generatedAt).toLocaleString()}
            </p>
            {report.buckets && report.buckets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {report.buckets.map((b: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{b.bucket}</div>
                    <div className="text-2xl font-bold text-slate-800">{b.quantity} items</div>
                    <div className="text-sm text-emerald-600 mt-2">${(b.value / 100).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-4 border-2 border-dashed border-slate-200 rounded-lg">
                No aging data available. Your inventory is turning over healthily!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
