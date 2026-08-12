import React, { useState, useEffect } from 'react';

interface EsgEmissionsPanelProps {
  api?: any;
}

export const EsgEmissionsPanel: React.FC<EsgEmissionsPanelProps> = ({ api }) => {
  const [tenantId, setTenantId] = useState('tenant-1');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmissionsReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.getEsgEmissionsReport) {
        const res = await api.getEsgEmissionsReport({ tenantId });
        setReport(res);
      } else {
        const response = await fetch(`/api/sustainability/emissions-report?tenantId=${tenantId}`);
        const data = await response.json();
        setReport(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching ESG carbon emissions report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmissionsReport();
  }, []);

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', minHeight: '600px' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399', margin: 0 }}>
            ESG Carbon Footprint & Scope 1-3 Emissions Tracking
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
            Transport mode and warehouse facility energy carbon emissions calculator for regulatory ESG sustainability reporting.
          </p>
        </div>
        <button
          onClick={fetchEmissionsReport}
          disabled={loading}
          style={{ padding: '8px 16px', background: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {loading ? 'Refreshing...' : 'Refresh ESG Metrics'}
        </button>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" style={{ padding: '12px', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #34d399' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>{report.totalEmissionsCo2eKg?.toLocaleString()} kg</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Total CO2e Emissions</div>
            </div>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>{report.transportEmissionsCo2eKg?.toLocaleString()} kg</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Scope 3 Transport Freight</div>
            </div>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #fbbf24' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>{report.facilityEmissionsCo2eKg?.toLocaleString()} kg</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Scope 1 & 2 Facility Energy</div>
            </div>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #a78bfa' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a78bfa' }}>{report.emissionsIntensityPerOrder} kg</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Emissions Intensity / Order</div>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Scope 3 Freight Emissions Mode Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '14px' }}>Air Freight</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{report.breakdownByMode?.air?.toLocaleString()} kg CO2e</div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>500g CO2e / tkm factor</div>
              </div>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>Ground Express</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{report.breakdownByMode?.groundExpress?.toLocaleString()} kg CO2e</div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>150g CO2e / tkm factor</div>
              </div>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                <div style={{ color: '#34d399', fontWeight: 'bold', fontSize: '14px' }}>LTL Trucking</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>{report.breakdownByMode?.ltl?.toLocaleString()} kg CO2e</div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>62g CO2e / tkm factor</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
