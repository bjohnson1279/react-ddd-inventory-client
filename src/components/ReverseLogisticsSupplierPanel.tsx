import React, { useState } from 'react';

interface ReverseLogisticsSupplierPanelProps {
  api?: any;
}

export const ReverseLogisticsSupplierPanel: React.FC<ReverseLogisticsSupplierPanelProps> = ({ api }) => {
  const [activeSubTab, setActiveSubTab] = useState<'rma' | 'supplier'>('rma');

  // RMA State
  const [rmaNumber, setRmaNumber] = useState('RMA-8001');
  const [sku, setSku] = useState('SKU-1002');
  const [disposition, setDisposition] = useState<'RESTOCK' | 'REFURBISH' | 'SCRAP'>('RESTOCK');
  const [inspectionNotes, setInspectionNotes] = useState('Item undamaged in original packaging');
  const [rmaResult, setRmaResult] = useState<any>(null);

  // Supplier State
  const [asnNumber, setAsnNumber] = useState('ASN-409');
  const [supplierId, setSupplierId] = useState('SUP-101');
  const [expectedDelivery, setExpectedDelivery] = useState('2026-08-10');
  const [asnResult, setAsnResult] = useState<any>(null);

  const [otifSupplierId, setOtifSupplierId] = useState('SUP-101');
  const [scorecard, setScorecard] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInspectRMA = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.inspectRMAItem) {
        const res = await api.inspectRMAItem({ rmaNumber, sku, disposition, notes: inspectionNotes });
        setRmaResult(res);
      } else {
        const response = await fetch('/api/rma/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rmaNumber, sku, disposition, notes: inspectionNotes })
        });
        const data = await response.json();
        setRmaResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error completing RMA inspection');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitASN = async () => {
    setLoading(true);
    setError(null);
    try {
      const lineItemsJson = JSON.stringify([{ sku: 'SKU-1001', quantity: 100 }]);
      if (api && api.submitSupplierASN) {
        const res = await api.submitSupplierASN({ asnNumber, supplierId, expectedDelivery, lineItemsJson });
        setAsnResult(res);
      } else {
        const response = await fetch('/api/supplier/asn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asnNumber, supplierId, expectedDelivery, lineItemsJson })
        });
        const data = await response.json();
        setAsnResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting ASN');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchScorecard = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.getSupplierOTIFScorecard) {
        const res = await api.getSupplierOTIFScorecard({ supplierId: otifSupplierId });
        setScorecard(res);
      } else {
        const response = await fetch(`/api/supplier/otif-scorecard?supplierId=${otifSupplierId}`);
        const data = await response.json();
        setScorecard(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching supplier scorecard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', minHeight: '600px' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: 0 }}>
          Reverse Logistics & Supplier Portal Workflow
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
          Customer RMA returns inspection with grading dispositions (Restock, Refurbish, Scrap) and Supplier ASN / OTIF scorecard portal.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setActiveSubTab('rma')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'rma' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            RMA Returns Inspection
          </button>
          <button
            onClick={() => setActiveSubTab('supplier')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'supplier' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            Supplier ASN & OTIF Scorecard
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ padding: '12px', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {activeSubTab === 'rma' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>RMA Returns Inspection & Grading</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>RMA Number</label>
              <input
                type="text"
                value={rmaNumber}
                onChange={(e) => setRmaNumber(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Target SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Quality Grading Disposition</label>
              <select
                value={disposition}
                onChange={(e: any) => setDisposition(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              >
                <option value="RESTOCK">RESTOCK (Return to Sellable Inventory Bin)</option>
                <option value="REFURBISH">REFURBISH (Move to Quarantine Repair Location)</option>
                <option value="SCRAP">SCRAP (Inventory Write-Off & Scrap Ledger Entry)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Inspection Notes</label>
              <textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <button
              onClick={handleInspectRMA}
              disabled={loading}
              style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {loading ? 'Processing Disposition...' : 'Complete RMA Inspection'}
            </button>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Inspection Outcome & Ledger Sync</h3>
            {rmaResult ? (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', fontSize: '13px' }}>
                <p><strong style={{ color: '#34d399' }}>Status:</strong> Inspection Processed</p>
                <p><strong>RMA Number:</strong> {rmaResult.rmaNumber}</p>
                <p><strong>SKU:</strong> {rmaResult.sku}</p>
                <p><strong>Disposition:</strong> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{rmaResult.disposition}</span></p>
                <p><strong>Action Taken:</strong> {rmaResult.actionTaken}</p>
                <p><strong>Notes:</strong> {rmaResult.notes}</p>
                <p style={{ color: '#64748b', fontSize: '11px' }}>Processed at: {rmaResult.processedAt}</p>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Submit an RMA inspection to view the stock disposition result.</p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'supplier' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Submit Inbound Supplier ASN</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>ASN Number</label>
              <input type="text" value={asnNumber} onChange={(e) => setAsnNumber(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Supplier ID</label>
              <input type="text" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Expected Delivery Date</label>
              <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <button onClick={handleSubmitASN} disabled={loading} style={{ width: '100%', padding: '10px', background: '#0284c7', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Submitting...' : 'Submit Supplier ASN'}
            </button>

            {asnResult && (
              <div style={{ marginTop: '16px', background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                <p style={{ margin: 0, color: '#38bdf8' }}>ASN Submitted: {asnResult.asnNumber} (Status: {asnResult.status})</p>
              </div>
            )}
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Supplier OTIF Performance Scorecard</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" value={otifSupplierId} onChange={(e) => setOtifSupplierId(e.target.value)} placeholder="Supplier ID" style={{ flex: 1, padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              <button onClick={handleFetchScorecard} disabled={loading} style={{ padding: '8px 16px', background: '#8b5cf6', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Fetch Scorecard
              </button>
            </div>

            {scorecard ? (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>{scorecard.otifScore}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Overall OTIF Score</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{scorecard.onTimeRate}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>On-Time Delivery Rate</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{scorecard.inFullRate}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>In-Full Fulfillment Rate</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>{scorecard.defectRate}%</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Defect / Damage Rate</div>
                  </div>
                </div>
                <p style={{ color: '#64748b', fontSize: '11px', marginTop: '12px', marginBottom: 0, textAlign: 'center' }}>Evaluated across {scorecard.totalShipments} historical PO shipments</p>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Enter a Supplier ID to evaluate OTIF performance metrics.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
