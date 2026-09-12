import React, { useEffect, useState } from 'react';
import { useInventory } from '../api/client';
import { Building2, ArrowRightLeft, Plus } from 'lucide-react';

export const IntercompanyPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { client } = useInventory();
  
  const [entities, setEntities] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  
  const [name, setName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [taxIdentifier, setTaxIdentifier] = useState('');
  
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [duty, setDuty] = useState(0);

  const loadData = async () => {
    try {
      const e = await client.getLegalEntities(tenantId);
      setEntities(e);
      const t = await client.getIntercompanyTransfers(tenantId);
      setTransfers(t);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [client, tenantId]);

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.createLegalEntity(tenantId, name, baseCurrency, taxIdentifier);
      setName('');
      setTaxIdentifier('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await client.executeIntercompanyTransfer({
        tenantId,
        fromEntityId,
        toEntityId,
        sku,
        quantity,
        unitCostCents: unitCost * 100,
        markupPercentage: markup,
        dutyCents: duty * 100
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Building2 className="text-slate-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Legal Entities</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreateEntity} className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Entity Name" value={name} onChange={e => setName(e.target.value)} className="input-field" required />
                <input type="text" placeholder="Base Currency (e.g. USD)" value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className="input-field" required />
                <input type="text" placeholder="Tax Identifier" value={taxIdentifier} onChange={e => setTaxIdentifier(e.target.value)} className="input-field" />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Plus size={16} /> Create Legal Entity
              </button>
            </form>
            <div className="space-y-2">
              {entities.map(ent => (
                <div key={ent.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
                  <span className="font-medium text-slate-700">{ent.name}</span>
                  <span className="text-sm text-slate-500">{ent.baseCurrency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <ArrowRightLeft className="text-slate-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Intercompany Transfer</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <select value={fromEntityId} onChange={e => setFromEntityId(e.target.value)} className="input-field" required>
                  <option value="">From Entity...</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={toEntityId} onChange={e => setToEntityId(e.target.value)} className="input-field" required>
                  <option value="">To Entity...</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input type="text" placeholder="SKU" value={sku} onChange={e => setSku(e.target.value)} className="input-field" required />
                <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input-field" required min="1" />
                <input type="number" placeholder="Unit Cost ($)" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} className="input-field" required min="0" step="0.01" />
                <input type="number" placeholder="Markup %" value={markup} onChange={e => setMarkup(Number(e.target.value))} className="input-field" required min="0" />
                <input type="number" placeholder="Duty ($)" value={duty} onChange={e => setDuty(Number(e.target.value))} className="input-field" min="0" step="0.01" />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <ArrowRightLeft size={16} /> Execute Transfer
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-800">Transfer History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-6 font-medium">Date</th>
                <th className="py-3 px-6 font-medium">From</th>
                <th className="py-3 px-6 font-medium">To</th>
                <th className="py-3 px-6 font-medium">SKU</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-6 text-slate-700">{new Date(t.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td className="py-3 px-6 text-slate-700">{entities.find(e => e.id === t.fromEntityId)?.name || t.fromEntityId}</td>
                  <td className="py-3 px-6 text-slate-700">{entities.find(e => e.id === t.toEntityId)?.name || t.toEntityId}</td>
                  <td className="py-3 px-6 text-slate-700">{t.sku} (x{t.quantity})</td>
                  <td className="py-3 px-6">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {t.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <a href="#" className="text-blue-600 hover:underline text-xs">View Journal</a>
                  </td>
                </tr>
              ))}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">No transfers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
