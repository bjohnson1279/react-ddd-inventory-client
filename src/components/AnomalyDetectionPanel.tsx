import React, { useState, useEffect } from 'react';
import { InventoryClient } from '../api/client';
import { Spinner } from './Panels';

interface AnomalyDetectionPanelProps {
  api: InventoryClient;
}

export const AnomalyDetectionPanel: React.FC<AnomalyDetectionPanelProps> = ({ api }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeInventoryAnomalies('default-tenant');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch anomaly data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  // ⚡ Bolt: Memoize filtered alerts to prevent O(N) array filtering on every render
  const filteredAlerts = React.useMemo(() => {
    return data?.alerts?.filter((alert: any) =>
      filter === 'All' || alert.severity.toLowerCase() === filter.toLowerCase()
    ) || [];
  }, [data?.alerts, filter]);

  return (
    <div className="anomaly-panel">
      <div className="ai-panel-header">
        <h2 className="ai-panel-title">
          <span>🔍</span> Anomaly Detection
        </h2>
        <button
          className="ai-panel-action-btn"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Now'}
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
          <div className="anomaly-summary-cards">
            <div className="anomaly-summary-card critical">
              <div className="severity-label">Critical</div>
              <div className="severity-count critical">{data.totalCritical || 0}</div>
              <div className="severity-label">Alerts</div>
            </div>
            <div className="anomaly-summary-card high">
              <div className="severity-label">High</div>
              <div className="severity-count high">{data.totalHigh || 0}</div>
              <div className="severity-label">Alerts</div>
            </div>
            <div className="anomaly-summary-card medium">
              <div className="severity-label">Medium</div>
              <div className="severity-count medium">{data.totalMedium || 0}</div>
              <div className="severity-label">Alerts</div>
            </div>
            <div className="anomaly-summary-card low">
              <div className="severity-label">Low</div>
              <div className="severity-count low">{data.totalLow || 0}</div>
              <div className="severity-label">Alerts</div>
            </div>
            <div className="anomaly-summary-card risk-gauge">
              <div className="severity-label">Overall Risk</div>
              <div className="risk-gauge-ring" style={{ border: `4px solid rgba(139,92,246,${data.overallRiskScore / 100})`, color: '#a78bfa' }}>
                {data.overallRiskScore || 0}
              </div>
              <div className="severity-label">Score</div>
            </div>
          </div>

          <div className="grid-cols-2" style={{ gap: '20px', marginBottom: '24px' }}>
            <div className="anomaly-section">
              <div className="anomaly-section-title">
                <span>⚠️</span> Anomaly Alert Feed
              </div>
              <div className="alert-filters">
                {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
                  <button
                    key={f}
                    className={`alert-filter-btn ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                {filteredAlerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                    No alerts found for this filter.
                  </div>
                ) : (
                  filteredAlerts.map((alert: any, idx: number) => (
                    <AlertCard key={idx} alert={alert} />
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="anomaly-section" style={{ flex: 1 }}>
                <div className="anomaly-section-title">
                  <span>👤</span> Actor Risk Heatmap
                </div>
                <div style={{ marginTop: '16px' }}>
                  {data.actorRisks?.length ? (
                    data.actorRisks.map((actor: any, idx: number) => (
                      <div className="actor-risk-bar" key={idx}>
                        <div className="actor-risk-label" title={actor.actorId}>{actor.actorId}</div>
                        <div className="actor-risk-track">
                          <div
                            className="actor-risk-fill"
                            style={{
                              width: `${actor.riskScore}%`,
                              background: `linear-gradient(90deg, rgba(34,197,94,0.8), rgba(239,68,68,0.8))`
                            }}
                          ></div>
                        </div>
                        <div className="actor-risk-score">{actor.riskScore}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)' }}>
                      No actor risk data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="anomaly-section" style={{ flex: 1 }}>
                <div className="anomaly-section-title">
                  <span>⏱️</span> Temporal Pattern Timeline
                </div>
                <div className="temporal-timeline">
                  {data.alerts?.map((alert: any, idx: number) => {
                    const time = new Date(alert.detectedAt).getHours();
                    const left = `${(time / 24) * 100}%`;
                    const top = `${20 + Math.random() * 60}%`;
                    const color = alert.severity === 'CRITICAL' ? '#ef4444' : alert.severity === 'HIGH' ? '#f97316' : alert.severity === 'MEDIUM' ? '#eab308' : '#3b82f6';
                    return (
                      <div
                        key={idx}
                        className="timeline-dot"
                        style={{ left, top, background: color, boxShadow: `0 0 8px ${color}` }}
                        title={`${alert.title} at ${new Date(alert.detectedAt).toLocaleTimeString()}`}
                      ></div>
                    );
                  })}
                  <div className="timeline-axis" style={{ position: 'absolute', bottom: 0, width: '100%' }}>
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AlertCard: React.FC<{ alert: any }> = ({ alert }) => {
  const [expanded, setExpanded] = useState(false);
  const severityClass = alert.severity.toLowerCase();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`alert-card ${severityClass}`}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <div className="alert-header">
        <span className={`severity-badge ${severityClass}`}>{alert.severity}</span>
        <span className="alert-title">{alert.title}</span>
      </div>
      <div className="alert-description">{alert.description}</div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        SKU: {alert.sku} | Loc: {alert.locationId} | Actor: {alert.actorId}
      </div>
      <div className="confidence-bar">
        <div
          className="confidence-bar-fill"
          style={{ width: `${alert.confidence}%`, background: `linear-gradient(90deg, transparent, ${severityClass === 'critical' ? '#ef4444' : severityClass === 'high' ? '#f97316' : severityClass === 'medium' ? '#eab308' : '#3b82f6'})` }}
        ></div>
      </div>
      {expanded && alert.evidence && (
        <div className="alert-evidence">
          {alert.evidence}
        </div>
      )}
    </div>
  );
};
