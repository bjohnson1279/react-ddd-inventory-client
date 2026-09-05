import React, { useState, useEffect } from 'react';
import { InventoryClient, ReportDefinition, DashboardWidget } from '../api/client';

interface Props {
  client: InventoryClient;
  tenantId: string;
}

export const ReportingDashboardPanel: React.FC<Props> = ({ client, tenantId }) => {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('INVENTORY_VALUATION');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await client.getReportDefinitions(tenantId);
      setReports(data || []);
      const wData = await client.getDashboardWidgets(tenantId);
      setWidgets(wData || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [client, tenantId]);

  const handleCreateReport = async () => {
    try {
      if (!reportName) return alert('Name required');
      await client.createReportDefinition(tenantId, { name: reportName, type: reportType, filters: {}, grouping: {} });
      setReportName('');
      fetchReports();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleScheduleReport = async (id: string) => {
    try {
      await client.scheduleReport(tenantId, id, '0 0 * * *', 'EMAIL');
      alert('Report scheduled successfully');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecuteReport = async (id: string) => {
    try {
      await client.executeReport(tenantId, id, 'pdf');
      alert('Report queued for execution');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Reporting & Dashboarding (Item 13)</h2>
      {error && (
        <div role="alert" aria-live="assertive" className="bg-red-50 text-red-700 p-4 rounded mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="text-red-700 hover:text-red-900 font-bold ml-2">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Create Report Definition</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Report Name" 
              className="border p-2 rounded flex-1"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
            />
            <select 
              className="border p-2 rounded" 
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="INVENTORY_VALUATION">Inventory Valuation</option>
              <option value="STOCK_MOVEMENT">Stock Movement</option>
              <option value="AUDIT_DISCREPANCY">Audit Discrepancy</option>
            </select>
            <button 
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
              onClick={handleCreateReport}
            >
              Create
            </button>
          </div>

          <h3 className="text-lg font-medium text-gray-700 mb-2">Saved Reports</h3>
          {loading ? (
            <div className="text-gray-500">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-gray-500">No reports defined.</div>
          ) : (
            <ul className="space-y-2">
              {reports.map(r => (
                <li key={r.id} className="border p-3 rounded bg-gray-50 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-sm text-gray-500">{r.type}</div>
                  </div>
                  <div className="space-x-2">
                    <button 
                      className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded"
                      onClick={() => handleExecuteReport(r.id)}
                    >
                      Run Now
                    </button>
                    <button 
                      className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      onClick={() => handleScheduleReport(r.id)}
                    >
                      Schedule
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Dashboard Widgets</h3>
          <p className="text-sm text-gray-500 mb-4">Drag-and-drop dashboard widgets configuration preview.</p>
          {widgets.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-8 rounded-lg text-center text-gray-400">
              No widgets configured.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {widgets.map(w => (
                <div key={w.id} className={`border p-4 rounded shadow-sm bg-white ${w.width > 1 ? 'col-span-2' : ''}`}>
                  <div className="font-medium text-gray-700">{w.type}</div>
                  <div className="text-xs text-gray-400 mt-2">Config: {JSON.stringify(w.config)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
