import React, { useState } from 'react';

export const RFIDBulkScannerView: React.FC = () => {
  const [scanCount, setScanCount] = useState<number>(1000);
  const [ingestionResult, setIngestionResult] = useState<{
    totalScanned: number;
    uniqueProcessed: number;
    duplicatesDiscarded: number;
    batchId: string;
    processingTimeMs: number;
  } | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const handleSimulateBulkScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const unique = Math.floor(scanCount * 0.94);
      const duplicates = scanCount - unique;
      setIngestionResult({
        totalScanned: scanCount,
        uniqueProcessed: unique,
        duplicatesDiscarded: duplicates,
        batchId: `rfid-batch-${Date.now()}`,
        processingTimeMs: Math.round(12 + Math.random() * 18),
      });
      setIsScanning(false);
    }, 400);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f8fafc' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#38bdf8' }}>
          RFID Bulk Scanning & IoT Ingestion Pipeline
        </h2>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
          High-throughput IoT serial scan ingestion with sliding-window deduplication and zero UI thread latency
        </p>
      </div>

      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px', color: '#f8fafc' }}>
          Simulate IoT Antenna Bulk Batch Ingest
        </h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.95rem', color: '#cbd5e1' }}>Batch Tag Count:</label>
          <select
            value={scanCount}
            onChange={(e) => setScanCount(Number(e.target.value))}
            style={{
              padding: '8px 16px',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            <option value={500}>500 Tags</option>
            <option value={1000}>1,000 Tags</option>
            <option value={5000}>5,000 Tags</option>
            <option value={10000}>10,000 Tags</option>
          </select>

          <button
            onClick={handleSimulateBulkScan}
            disabled={isScanning}
            style={{
              padding: '10px 24px',
              background: isScanning ? '#64748b' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: isScanning ? 'not-allowed' : 'pointer',
            }}
          >
            {isScanning ? 'Processing Ingest...' : 'Execute Bulk RFID Ingest'}
          </button>
        </div>

        {ingestionResult && (
          <div style={{ marginTop: '24px', background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h4 style={{ margin: '0 0 12px', color: '#10b981', fontSize: '1.1rem' }}>✓ Batch Successfully Processed</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Scanned</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{ingestionResult.totalScanned.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Unique EPC Tags</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{ingestionResult.uniqueProcessed.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Duplicates Deduplicated</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24' }}>{ingestionResult.duplicatesDiscarded.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Execution Latency</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>{ingestionResult.processingTimeMs} ms</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
