import React, { useState } from 'react';

export interface AutonomousRecommendation {
  sku: string;
  name: string;
  currentStock: number;
  predictedDaysUntilStockout: number;
  recommendedOrderQuantity: number;
  totalEstimatedCost: number;
  urgency: 'CRITICAL' | 'WARNING' | 'OPTIONAL';
  status: 'DRAFT_PO_CREATED' | 'AUTO_ISSUED' | 'MONITORING';
}

export const AutonomousInventoryDashboard: React.FC = () => {
  const [autonomyMode, setAutonomyMode] = useState<'HUMAN_IN_THE_LOOP' | 'FULLY_AUTONOMOUS'>('HUMAN_IN_THE_LOOP');
  const [recommendations, setRecommendations] = useState<AutonomousRecommendation[]>([
    {
      sku: 'SKU-ELEC-001',
      name: 'Microcontroller Board v2',
      currentStock: 12,
      predictedDaysUntilStockout: 1.8,
      recommendedOrderQuantity: 150,
      totalEstimatedCost: 4498.50,
      urgency: 'CRITICAL',
      status: 'DRAFT_PO_CREATED',
    },
    {
      sku: 'SKU-MECH-002',
      name: 'Industrial Servo Motor',
      currentStock: 5,
      predictedDaysUntilStockout: 3.2,
      recommendedOrderQuantity: 30,
      totalEstimatedCost: 5685.00,
      urgency: 'WARNING',
      status: 'DRAFT_PO_CREATED',
    },
    {
      sku: 'SKU-SENS-009',
      name: 'Optical Laser Distance Sensor',
      currentStock: 18,
      predictedDaysUntilStockout: 6.5,
      recommendedOrderQuantity: 50,
      totalEstimatedCost: 2250.00,
      urgency: 'OPTIONAL',
      status: 'DRAFT_PO_CREATED',
    },
  ]);

  const [crdtNodes, setCrdtNodes] = useState([
    { region: 'us-east-1 (Primary)', status: 'HEALTHY', latencyMs: 14, vectorClock: 14209, synced: true },
    { region: 'eu-central-1 (Secondary)', status: 'HEALTHY', latencyMs: 82, vectorClock: 14209, synced: true },
    { region: 'ap-east-1 (Edge)', status: 'RECONCILING', latencyMs: 145, vectorClock: 14205, synced: false },
  ]);

  const handleApprovePO = (sku: string) => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.sku === sku ? { ...rec, status: 'AUTO_ISSUED' } : rec))
    );
  };

  const handleTriggerAutonomyRun = () => {
    alert(`Autonomous evaluation triggered in ${autonomyMode} mode.`);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#38bdf8' }}>
            Autonomous Inventory & High-Scale Cloud Engine
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            AI-driven rebalancing, predictive stockouts, multi-region CRDT replication & dynamic SaaS provisioning
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#1e293b', padding: '8px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Autonomy Mode:</span>
          <button
            onClick={() => setAutonomyMode('HUMAN_IN_THE_LOOP')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: autonomyMode === 'HUMAN_IN_THE_LOOP' ? '#0284c7' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Human-in-the-Loop
          </button>
          <button
            onClick={() => setAutonomyMode('FULLY_AUTONOMOUS')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: autonomyMode === 'FULLY_AUTONOMOUS' ? '#10b981' : 'transparent',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fully Autonomous
          </button>
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Predicted Stockouts (7 Days)</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f43f5e', marginTop: '8px' }}>2 SKUs</div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>Auto-PO Drafts Ready</div>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multi-Region CRDT Sync</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginTop: '8px' }}>Active-Active</div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>3 Clusters Reconciled</div>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI 3D Slotting Optimization</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a855f7', marginTop: '8px' }}>18.4% Savings</div>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>2 Optimal Bin Swaps Suggested</div>
        </div>
      </div>

      {/* Autonomous Purchase Order Recommendations */}
      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
            Autonomous Reorder & Stockout Prevention Queue
          </h3>
          <button
            onClick={handleTriggerAutonomyRun}
            style={{
              padding: '8px 16px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Run Agent Evaluation
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>SKU & Name</th>
              <th style={{ padding: '12px' }}>Current Stock</th>
              <th style={{ padding: '12px' }}>Stockout Forecast</th>
              <th style={{ padding: '12px' }}>Order Qty</th>
              <th style={{ padding: '12px' }}>Est. Cost</th>
              <th style={{ padding: '12px' }}>Urgency</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec) => (
              <tr key={rec.sku} style={{ borderBottom: '1px solid #334155', fontSize: '0.95rem' }}>
                <td style={{ padding: '14px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>{rec.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{rec.sku}</div>
                </td>
                <td style={{ padding: '14px 12px', color: rec.currentStock < 15 ? '#f43f5e' : '#f8fafc', fontWeight: 600 }}>
                  {rec.currentStock} units
                </td>
                <td style={{ padding: '14px 12px', color: rec.predictedDaysUntilStockout < 2 ? '#f43f5e' : '#fbbf24' }}>
                  {rec.predictedDaysUntilStockout} days
                </td>
                <td style={{ padding: '14px 12px' }}>{rec.recommendedOrderQuantity} units</td>
                <td style={{ padding: '14px 12px', color: '#38bdf8' }}>${rec.totalEstimatedCost.toLocaleString()}</td>
                <td style={{ padding: '14px 12px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background:
                        rec.urgency === 'CRITICAL'
                          ? 'rgba(244, 63, 94, 0.2)'
                          : rec.urgency === 'WARNING'
                          ? 'rgba(251, 191, 36, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                      color:
                        rec.urgency === 'CRITICAL'
                          ? '#f43f5e'
                          : rec.urgency === 'WARNING'
                          ? '#fbbf24'
                          : '#10b981',
                    }}
                  >
                    {rec.urgency}
                  </span>
                </td>
                <td style={{ padding: '14px 12px' }}>
                  {rec.status === 'AUTO_ISSUED' ? (
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>✓ PO Issued</span>
                  ) : (
                    <button
                      onClick={() => handleApprovePO(rec.sku)}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Issue PO
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Multi-Region Active-Active CRDT Cluster Status */}
      <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px', color: '#f8fafc' }}>
          Multi-Region Active-Active Replication (PN-Counter CRDTs)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {crdtNodes.map((node) => (
            <div key={node.region} style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{node.region}</span>
                <span style={{ fontSize: '0.75rem', color: node.synced ? '#10b981' : '#fbbf24', fontWeight: 700 }}>
                  {node.status}
                </span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#94a3b8' }}>
                <div>Latency: <strong style={{ color: '#f8fafc' }}>{node.latencyMs} ms</strong></div>
                <div>Vector Clock: <strong style={{ color: '#38bdf8' }}>#{node.vectorClock}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
