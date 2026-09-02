import React, { useEffect, useState } from 'react';
import { useInventory } from '../api/client';
import { PlayCircle, CheckCircle, Clock } from 'lucide-react';

export const CycleCountDashboardPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  const [counts, setCounts] = useState<any[]>([]);

  useEffect(() => {
    client.getCycleCounts(tenantId).then(setCounts).catch(console.error);
  }, [client, tenantId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Cycle Counting</h3>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <PlayCircle size={16} /> Start Count
        </button>
      </div>
      <div className="p-6">
        {counts.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No active cycle counts</div>
        ) : (
          <div className="space-y-4">
            {counts.map(count => (
              <div key={count.id} className="flex justify-between items-center p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-medium text-slate-800">{count.name}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <Clock size={14} /> {count.status}
                  </div>
                </div>
                <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1">
                  <CheckCircle size={16} /> Submit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
