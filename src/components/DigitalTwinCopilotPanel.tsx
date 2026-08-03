import React, { useState } from 'react';

interface DigitalTwinCopilotPanelProps {
  api?: any;
}

export const DigitalTwinCopilotPanel: React.FC<DigitalTwinCopilotPanelProps> = ({ api }) => {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'copilot'>('simulator');

  // Simulator State
  const [warehouseId, setWarehouseId] = useState('WH-MAIN');
  const [orderWaveCount, setOrderWaveCount] = useState(15);
  const [activePickersCount, setActivePickersCount] = useState(8);
  const [simResult, setSimResult] = useState<any>(null);

  // Copilot State
  const [prompt, setPrompt] = useState('What is the current stockout risk across our primary SKUs?');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; data?: any }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Warehouse Copilot. Ask me about stockout risks, shrinkage anomalies, or OTIF scorecards.'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (api && api.runDigitalTwinSimulation) {
        const res = await api.runDigitalTwinSimulation({ warehouseId, orderWaveCount, activePickersCount });
        setSimResult(res);
      } else {
        const response = await fetch('/api/digital-twin/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ warehouseId, orderWaveCount, activePickersCount })
        });
        const data = await response.json();
        setSimResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Error running discrete-event simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim()) return;
    const userMsg = prompt;
    setPrompt('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      let resultData: any;
      if (api && api.queryCopilot) {
        resultData = await api.queryCopilot({ query: userMsg });
      } else {
        const response = await fetch('/api/copilot/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userMsg })
        });
        resultData = await response.json();
      }

      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          text: resultData.insights || 'Analysis complete.',
          data: resultData
        }
      ]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', borderRadius: '12px', minHeight: '600px' }}>
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', margin: 0 }}>
          Warehouse Digital Twin & Conversational AI Copilot
        </h2>
        <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
          Discrete-event scenario simulator for stress-testing fulfillment strategies and LLM-powered natural language assistant.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setActiveSubTab('simulator')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'simulator' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            Discrete-Event Simulator
          </button>
          <button
            onClick={() => setActiveSubTab('copilot')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: activeSubTab === 'copilot' ? '#0284c7' : '#1e293b',
              color: '#ffffff',
            }}
          >
            AI Warehouse Copilot Chat
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#7f1d1d', color: '#fecaca', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {activeSubTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Fulfillment Stress Test Parameters</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Warehouse Facility ID</label>
              <input type="text" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Simulated Order Waves (Count)</label>
              <input type="number" value={orderWaveCount} onChange={(e) => setOrderWaveCount(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Active Picker Concurrency</label>
              <input type="number" value={activePickersCount} onChange={(e) => setActivePickersCount(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>

            <button onClick={handleRunSimulation} disabled={loading} style={{ width: '100%', padding: '10px', background: '#0284c7', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Running Simulation...' : 'Run Discrete-Event Simulation'}
            </button>
          </div>

          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Simulation Results & Bottleneck Analytics</h3>
            {simResult ? (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{simResult.totalOrdersProcessed}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Orders Processed</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>{simResult.throughputPerHour}/hr</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Throughput Rate</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>{simResult.averageFulfillmentTimeMinutes} min</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Avg Fulfillment Time</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>{simResult.bottleneckBinId}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Primary Bottleneck Bin</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  <strong>Congestion Hotspots:</strong> {simResult.congestionHotspots?.join(', ')}
                </div>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Trigger a simulation scenario to view fulfillment throughput and bottleneck predictions.</p>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'copilot' && (
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h3 style={{ marginTop: 0, color: '#f1f5f9', fontSize: '18px' }}>Conversational Natural Language Assistant</h3>
          <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '12px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', maxWidth: '80%', padding: '10px 14px', borderRadius: '8px', background: msg.role === 'user' ? '#0284c7' : '#334155', color: '#ffffff', fontSize: '13px' }}>
                  {msg.text}
                  {msg.data?.suggestedActions && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #475569', fontSize: '11px', color: '#38bdf8' }}>
                      <strong>Suggested Actions:</strong> {msg.data.suggestedActions.join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
              placeholder="Ask Copilot about stock levels, shrinkage, or OTIF scorecards..."
              style={{ flex: 1, padding: '10px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '6px' }}
            />
            <button onClick={handleSendPrompt} disabled={loading} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
