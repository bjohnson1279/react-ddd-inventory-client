import React, { useState } from 'react';

interface ThermalPrintingArPanelProps {
  api?: any;
}

export const ThermalPrintingArPanel: React.FC<ThermalPrintingArPanelProps> = ({ api }) => {
  const [activeSubTab, setActiveSubTab] = useState<'thermal' | 'ar'>('thermal');

  // Thermal Printing State
  const [printerName, setPrinterName] = useState('Zebra-ZT411-DockA');
  const [labelType, setLabelType] = useState<'BIN' | 'LOT' | 'SERIAL' | 'RMA'>('BIN');
  const [barcodeValue, setBarcodeValue] = useState('BIN-A-102-RACK4');
  const [subtitle, setSubtitle] = useState('High Velocity Storage Zone');
  const [printResult, setPrintResult] = useState<any>(null);

  // AR Guidance State
  const [targetBin, setTargetBin] = useState('BIN-A-102');
  const [pickSku, setPickSku] = useState('SKU-1002');
  const [pickQuantity, setPickQuantity] = useState(5);
  const [arActive, setArActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrintLabel = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.printZplThermalLabel) {
        const res = await api.printZplThermalLabel({ printerName, labelType, barcodeValue, subtitle });
        setPrintResult(res);
      } else {
        const response = await fetch('/api/hardware/print-thermal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ printerName, labelType, barcodeValue, subtitle })
        });
        const data = await response.json();
        setPrintResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error spooling ZPL thermal label job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', minHeight: '600px' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: 0 }}>
          Thermal Printing & WebXR AR-Guided Operations
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
          Direct ZPL/TSPL thermal barcode print engine for bin/lot tags and WebXR camera pick-and-pack visual guidance.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setActiveSubTab('thermal')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'thermal' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            ZPL Thermal Printing Spooler
          </button>
          <button
            onClick={() => setActiveSubTab('ar')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'ar' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            WebXR AR Pick & Pack Viewport
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {activeSubTab === 'thermal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Spool ZPL/TSPL Thermal Print Job</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Target Printer Name</label>
              <input type="text" value={printerName} onChange={(e) => setPrinterName(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Label Category</label>
              <select value={labelType} onChange={(e: any) => setLabelType(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                <option value="BIN">BIN Tag Label</option>
                <option value="LOT">LOT Batch Tag</option>
                <option value="SERIAL">SERIAL Item Tag</option>
                <option value="RMA">RMA Return Label</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Barcode / QR Value</label>
              <input type="text" value={barcodeValue} onChange={(e) => setBarcodeValue(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Subtitle / Header Text</label>
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>

            <button onClick={handlePrintLabel} disabled={loading} style={{ width: '100%', padding: '10px', background: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Spooling ZPL Job...' : 'Send ZPL Print Command'}
            </button>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Generated ZPL II Code Output</h3>
            {printResult ? (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', fontSize: '13px' }}>
                <p><strong style={{ color: '#38bdf8' }}>Job Spooled:</strong> {printResult.jobId}</p>
                <p><strong>Printer:</strong> {printResult.printerName}</p>
                <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Native Zebra ZPL Stream:</label>
                <pre style={{ background: '#020617', color: '#34d399', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto' }}>
                  {printResult.zplCode}
                </pre>
                <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>Sent at: {printResult.sentAt}</p>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Configure label parameters and click print to view native ZPL code stream.</p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'ar' && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>WebXR Visual AR Spatial Guidance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Target Location Bin</label>
                <input type="text" value={targetBin} onChange={(e) => setTargetBin(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Pick SKU</label>
                <input type="text" value={pickSku} onChange={(e) => setPickSku(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Required Quantity</label>
                <input type="number" value={pickQuantity} onChange={(e) => setPickQuantity(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
              </div>

              <button
                onClick={() => setArActive(!arActive)}
                style={{ width: '100%', padding: '10px', background: arActive ? '#ef4444' : '#8b5cf6', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                {arActive ? 'Close AR Viewport' : 'Launch AR Overlay Guidance'}
              </button>
            </div>

            <div style={{ background: '#020617', borderRadius: '8px', height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: arActive ? '2px solid #8b5cf6' : '1px solid #334155' }}>
              {arActive ? (
                <>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(139,92,246,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    AR LIVE CAMERA FEED
                  </div>
                  {/* Simulated 3D Bounding Box Overlay */}
                  <div style={{ width: '160px', height: '120px', border: '3px dashed #34d399', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(52,211,153,0.1)', animation: 'pulse 2s infinite' }}>
                    <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>TARGET: {targetBin}</div>
                    <div style={{ color: '#f8fafc', fontSize: '12px' }}>Pick {pickQuantity}x {pickSku}</div>
                  </div>
                  <div style={{ marginTop: '16px', color: '#a78bfa', fontSize: '12px' }}>
                    Waypoint Navigation: Follow green corridor arrow to Shelf 4, Tier B
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👓</div>
                  <p style={{ margin: 0 }}>Click "Launch AR Overlay Guidance" to activate WebXR spatial camera overlay.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
