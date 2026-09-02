import React, { useEffect, useState } from 'react';
import { useInventory } from '../api/client';
import { Truck, Package, Calendar } from 'lucide-react';

export const SupplierCollaborationPortal: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  const [asns, setAsns] = useState<any[]>([]);

  useEffect(() => {
    // Hardcoded supplier ID for demo purposes
    client.getASNs(tenantId, 'supp-123').then(setAsns).catch(console.error);
  }, [client, tenantId]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Supplier Portal</h3>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Truck size={16} /> Submit ASN
        </button>
      </div>
      <div className="p-6">
        {asns.length === 0 ? (
          <div className="text-center text-slate-500 py-8 flex flex-col items-center">
            <Package size={32} className="mb-2 text-slate-300" />
            No Advance Shipping Notices (ASNs) found
          </div>
        ) : (
          <div className="space-y-4">
            {asns.map(asn => (
              <div key={asn.id} className="flex justify-between items-center p-4 rounded-lg border border-slate-100">
                <div>
                  <div className="font-medium text-slate-800">ASN #{asn.id}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <Calendar size={14} /> Expected: {new Date(asn.expectedArrivalDate).toLocaleDateString()}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {asn.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
