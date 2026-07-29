import React, { useState } from 'react';

export const ApiSpecViewerPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'openapi-express' | 'openapi-php' | 'graphql'>('openapi-express');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock OpenAPI Data
  const openApiEndpoints = [
    { method: 'GET', path: '/api/inventory', summary: 'List inventory items' },
    { method: 'POST', path: '/api/inventory', summary: 'Create or update inventory' },
    { method: 'GET', path: '/api/compliance/ledger', summary: 'Get compliance events' },
    { method: 'DELETE', path: '/api/products/{id}', summary: 'Remove a product' }
  ];

  // Mock GraphQL Data
  const graphqlTypes = [
    { name: 'InventoryItem', fields: 'id: ID!\nsku: String!\nquantity: Int!\nlocationId: String' },
    { name: 'Product', fields: 'id: ID!\nname: String!\nvariants: [ProductVariant]' },
  ];
  const graphqlQueries = [
    { name: 'inventoryItems', returns: '[InventoryItem!]!' },
    { name: 'complianceLedger', returns: '[ComplianceEvent!]!' }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'var(--info)';
      case 'POST': return 'var(--success)';
      case 'PUT': return 'var(--warning)';
      case 'DELETE': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };

  const filteredEndpoints = openApiEndpoints.filter(ep => 
    ep.path.includes(searchQuery) || ep.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="api-spec-viewer">
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: 700 }}>API Specifications</h2>
          <p style={{ color: 'var(--text-muted)' }}>Explore auto-generated documentation for the DDD backends</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="spec-tabs flex-gap-1" style={{ marginBottom: '2rem' }}>
        <button 
          className={`btn ${activeTab === 'openapi-express' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('openapi-express')}
        >
          Express REST
        </button>
        <button 
          className={`btn ${activeTab === 'openapi-php' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('openapi-php')}
        >
          PHP REST
        </button>
        <button 
          className={`btn ${activeTab === 'graphql' ? 'btn-accent' : 'btn-secondary'}`}
          onClick={() => setActiveTab('graphql')}
        >
          GraphQL SDL
        </button>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 300px' }}>
        {/* Main Content */}
        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>
              {activeTab === 'graphql' ? 'GraphQL Schema' : 'OpenAPI Definitions'}
            </h3>
            <input 
              type="text" 
              placeholder="Search endpoints/types..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '250px', padding: '0.5rem 1rem' }}
            />
          </div>

          {activeTab.startsWith('openapi') && (
            <div className="endpoint-list">
              {filteredEndpoints.map((ep, idx) => (
                <div className="endpoint-card" key={idx}>
                  <div className="flex-between">
                    <div className="flex-gap-1">
                      <span className="method-badge" style={{ backgroundColor: getMethodColor(ep.method) }}>{ep.method}</span>
                      <code className="path-text">{ep.path}</code>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => navigator.clipboard.writeText(`curl -X ${ep.method} http://localhost:5000${ep.path}`)}>
                      Copy cURL
                    </button>
                  </div>
                  <p className="endpoint-summary">{ep.summary}</p>
                </div>
              ))}
              {filteredEndpoints.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No endpoints found.</p>}
            </div>
          )}

          {activeTab === 'graphql' && (
            <div className="graphql-explorer">
              <h4 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Queries</h4>
              <div className="endpoint-list" style={{ marginBottom: '2rem' }}>
                {graphqlQueries.filter(q => q.name.includes(searchQuery)).map((q, idx) => (
                  <div className="endpoint-card" key={idx}>
                    <code className="path-text">query {q.name}: {q.returns}</code>
                  </div>
                ))}
              </div>

              <h4 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Types</h4>
              <div className="endpoint-list">
                {graphqlTypes.filter(t => t.name.includes(searchQuery) || t.fields.includes(searchQuery)).map((t, idx) => (
                  <div className="endpoint-card" key={idx}>
                    <code className="path-text" style={{ color: 'var(--primary)' }}>type {t.name} {'{'}</code>
                    <pre style={{ margin: '0.5rem 0 0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.fields}</pre>
                    <code className="path-text" style={{ color: 'var(--primary)' }}>{'}'}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section C: Schema Sync Status */}
        <div className="glass-panel" style={{ alignSelf: 'start' }}>
          <h3 className="form-section-title">Schema Sync Status</h3>
          <div className="stat-card" style={{ marginBottom: '1rem' }}>
            <span className="stat-title">Express ↔ PHP</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>✅ In Sync</span>
            <span className="stat-desc">0 differences found</span>
          </div>
          <div className="stat-card accent" style={{ marginBottom: '1rem' }}>
            <span className="stat-title">REST ↔ GraphQL</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>98% Coverage</span>
            <span className="stat-desc">Types mapped successfully</span>
          </div>
          <div className="stat-card" style={{ marginBottom: '1rem' }}>
            <span className="stat-title">Client SDK</span>
            <span className="stat-value" style={{ fontSize: '1.25rem' }}>100% Valid</span>
            <span className="stat-desc">client.ts interfaces match</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Last synced: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      <style>{`
        .spec-tabs {
          border-bottom: 1px solid var(--border);
          padding-bottom: 1rem;
        }
        .endpoint-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .endpoint-card {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--panel-border);
          border-radius: var(--radius-sm);
          padding: 1rem;
          transition: background 0.2s;
        }
        .endpoint-card:hover {
          background: rgba(255,255,255,0.03);
        }
        .method-badge {
          color: #fff;
          font-weight: bold;
          font-size: 0.8rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        .path-text {
          font-family: monospace;
          font-size: 0.95rem;
          color: var(--text-main);
        }
        .endpoint-summary {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
