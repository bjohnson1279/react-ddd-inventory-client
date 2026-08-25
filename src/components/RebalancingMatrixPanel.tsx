import React, { useState, useEffect } from 'react';
import { InventoryClient } from '../api/client';
import { Spinner } from './Panels';

interface RebalancingMatrixPanelProps {
  api: InventoryClient;
}

export const RebalancingMatrixPanel: React.FC<RebalancingMatrixPanelProps> = ({ api }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getRebalanceMatrix('default-tenant');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  return (
    <div className="rebalance-panel">
      <div className="ai-panel-header">
        <h2 className="ai-panel-title">
          <span>⚖️</span> Rebalancing Matrix
        </h2>
        <button
          className="ai-panel-action-btn"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate Matrix'}
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="alert-box alert-error flex-between" style={{ marginBottom: '24px' }}>
          <span>{error}</span>
          <button className="btn btn-secondary" onClick={fetchData}>Retry</button>
        </div>
      )}

      {loading && !data && (
        <div className="ai-skeleton" style={{ height: '400px', width: '100%' }}></div>
      )}

      {data && (
        <>
          <div className="warehouse-health-cards">
            {data.summary?.warehouses?.map((wh: any, idx: number) => {
              const statusClass = wh.healthStatus === 'HEALTHY' ? 'healthy' : wh.healthStatus === 'ATTENTION' ? 'attention' : 'critical';
              return (
                <div className="warehouse-card" key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div className="wh-name">{wh.warehouseId}</div>
                      <div className="wh-region">{wh.region || 'Region'}</div>
                    </div>
                    <div className={`status-ring ${statusClass}`}>
                      {statusClass === 'healthy' ? '✓' : statusClass === 'attention' ? '!' : '×'}
                    </div>
                  </div>
                  <div className="wh-stats">
                    <div className="wh-stat-item">
                      <div>Total SKUs</div>
                      <div className="wh-stat-value">{wh.totalSkus || 0}</div>
                    </div>
                    <div className="wh-stat-item">
                      <div>Avg DOC</div>
                      <div className="wh-stat-value">{wh.avgDoc || 0}d</div>
                    </div>
                    <div className="wh-stat-item">
                      <div>Surplus SKUs</div>
                      <div className="wh-stat-value" style={{ color: '#93c5fd' }}>{wh.surplusCount || 0}</div>
                    </div>
                    <div className="wh-stat-item">
                      <div>Deficit SKUs</div>
                      <div className="wh-stat-value" style={{ color: '#fca5a5' }}>{wh.deficitCount || 0}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid-cols-2" style={{ gap: '24px' }}>
            <div>
              <div className="anomaly-section-title">
                <span>📊</span> Cost-Benefit Summary
              </div>
              <div className="cost-benefit-grid">
                <div className="cost-benefit-card">
                  <div className="cost-benefit-value">{data.recommendations?.length || 0}</div>
                  <div className="cost-benefit-label">Total Transfers</div>
                </div>
                <div className="cost-benefit-card">
                  <div className="cost-benefit-value">${data.summary?.totalEstimatedShippingCost || 0}</div>
                  <div className="cost-benefit-label">Est. Cost</div>
                </div>
                <div className="cost-benefit-card">
                  <div className="cost-benefit-value">{data.summary?.skusImproved || 0}</div>
                  <div className="cost-benefit-label">SKUs Improved</div>
                </div>
                <div className="cost-benefit-card">
                  <div className="cost-benefit-value">{data.summary?.avgDocImprovement || 0}d</div>
                  <div className="cost-benefit-label">Avg DOC Imp.</div>
                </div>
              </div>

              <div className="anomaly-section-title" style={{ marginTop: '24px' }}>
                <span>📦</span> Transfer Recommendations
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                {data.recommendations?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                    No transfers recommended at this time.
                  </div>
                ) : (
                  data.recommendations?.map((rec: any, idx: number) => (
                    <div className="transfer-card" key={idx}>
                      <div>
                        <div className="transfer-flow">
                          <span className="transfer-warehouse">{rec.sourceWarehouseId}</span>
                          <span className="transfer-arrow">→</span>
                          <span className="transfer-warehouse">{rec.destWarehouseId}</span>
                          <span className={`priority-badge ${rec.priority?.toLowerCase() || 'medium'}`}>{rec.priority || 'MEDIUM'}</span>
                        </div>
                        <div className="transfer-details">
                          <div className="transfer-detail-item">
                            SKU: <strong>{rec.sku}</strong>
                          </div>
                          <div className="transfer-detail-item">
                            Qty: <strong>{rec.quantity}</strong>
                          </div>
                          <div className="transfer-detail-item">
                            Cost: <strong>${rec.estimatedShippingCost}</strong>
                          </div>
                        </div>
                        <div className="transfer-details" style={{ marginTop: '8px' }}>
                          <div className="transfer-detail-item doc-improvement">
                            DOC: <span>{rec.destCurrentDoc}d</span> <span className="improvement-arrow">→</span> <span>{rec.destProjectedDoc}d</span>
                          </div>
                          <div className="transfer-detail-item" style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }}>
                            {rec.urgencyReason}
                          </div>
                        </div>
                      </div>
                      <button className="transfer-execute-btn" onClick={() => alert(`Executing transfer for ${rec.sku}`)}>
                        Execute Transfer
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="anomaly-section" style={{ margin: 0 }}>
              <div className="anomaly-section-title">
                <span>🧮</span> Matrix Grid (DOC)
              </div>
              <div className="matrix-grid-container">
                <table className="matrix-grid">
                  <thead>
                    <tr>
                      <th className="matrix-sku-label">SKU</th>
                      {data.matrix?.warehouses?.map((wh: string, i: number) => (
                        <th key={i}>{wh}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.matrix?.rows?.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="matrix-sku-label">{row.sku}</td>
                        {row.cells?.map((cell: any, j: number) => {
                          let cellClass = 'balanced';
                          if (cell.doc < 7) cellClass = 'deficit';
                          else if (cell.doc < 14) cellClass = 'low-deficit';
                          else if (cell.doc > 42) cellClass = 'surplus';

                          return (
                            <td className={`matrix-cell ${cellClass}`} key={j} title={`On Hand: ${cell.onHand} | Velocity: ${cell.velocity}`}>
                              {cell.doc}d
                              <span className="cell-status-badge">
                                {cellClass.replace('-', ' ')}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
