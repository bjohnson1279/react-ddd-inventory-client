import { useState, useEffect } from 'react';
import { useInventory, BackendType, Item, JournalLine, Tab } from './api/client';

const Spinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
    <path className="spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

function App() {
  const { client, backendType, setBackendType } = useInventory();
  
  const [activeTab, setActiveTab] = useState<Tab | 'forecasting'>('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [loginTenant, setLoginTenant] = useState('tenant-1');
  const [loginActor, setLoginActor] = useState('admin-user');
  const [loginRole, setLoginRole] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [role, setRole] = useState('admin');

  const [tenantId, setTenantId] = useState('tenant-1');
  const [locationId, setLocationId] = useState('loc-1');
  const [actorId, setActorId] = useState('admin-user');

  // --- Shared Status States ---
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Loaded Data States ---
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [shopifyConns, setShopifyConns] = useState<any[]>([]);
  const [forecastingReport, setForecastingReport] = useState<any[]>([]);

  // --- Selection / Draft States ---
  const [selectedOnboarding, setSelectedOnboarding] = useState<any | null>(null);
  const [onboardingItems, setOnboardingItems] = useState<Item[]>([{ variantId: '', quantity: 0, unitCostCents: 0 }]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // --- Form Inputs ---
  const [newProdName, setNewProdName] = useState('');
  const [newProdId, setNewProdId] = useState('');
  
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarTracking, setNewVarTracking] = useState<'quantity' | 'serial' | 'lot'>('quantity');
  const [newVarAttrs, setNewVarAttrs] = useState<{ name: string; value: string }[]>([{ name: '', value: '' }]);

  const [assignSku, setAssignSku] = useState('');
  const [assignVal, setAssignVal] = useState('');
  const [assignSymbology, setAssignSymbology] = useState('upc_a');
  const [assignSource, setAssignSource] = useState('supplier');
  const [assignPrimary, setAssignPrimary] = useState(true);

  const [scanVal, setScanVal] = useState('');
  const [scanContext, setScanContext] = useState<'pos' | 'receiving' | 'cycle_count'>('pos');
  const [scanAmount, setScanAmount] = useState(1);
  const [scanActualQty, setScanActualQty] = useState(0);
  const [scanHistory, setScanHistory] = useState<{ time: string; scan: string; context: string; status: string }[]>([]);

  const [traceSerialNum, setTraceSerialNum] = useState('');
  const [tracedItem, setTracedItem] = useState<any | null>(null);

  const [newShopifyId, setNewShopifyId] = useState('');
  const [newShopifyDomain, setNewShopifyDomain] = useState('');
  const [newShopifyToken, setNewShopifyToken] = useState('');

  const [newJournalDesc, setNewJournalDesc] = useState('');
  const [newJournalMethod, setNewJournalMethod] = useState<'cash' | 'accrual'>('accrual');
  const [newJournalLines, setNewJournalLines] = useState<JournalLine[]>([
    { accountCode: '1000', amountCents: 0, type: 'debit', memo: '' },
    { accountCode: '2000', amountCents: 0, type: 'credit', memo: '' }
  ]);

  // Decode JWT details to synchronize client parameters
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.tenantId) setTenantId(payload.tenantId);
        if (payload.actorId) setActorId(payload.actorId);
        if (payload.role) setRole(payload.role);
      } catch (err) {
        console.error('Failed to parse token payload:', err);
      }
    }
  }, [token]);

  // Redirect to dashboard if the active tab is not allowed for the role
  useEffect(() => {
    const allowedTabs = ['dashboard'];
    if (role === 'admin') {
      allowedTabs.push('onboarding', 'products', 'scanning', 'ledger', 'serials', 'shopify', 'forecasting');
    } else if (role === 'warehouse_operator') {
      allowedTabs.push('products', 'scanning', 'serials', 'forecasting');
    } else if (role === 'accountant') {
      allowedTabs.push('onboarding', 'products', 'ledger', 'forecasting');
    } else if (role === 'viewer') {
      allowedTabs.push('products', 'serials', 'forecasting');
    }
    
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const jwtToken = await client.login(loginTenant, loginActor, loginRole, loginPassword);
      localStorage.setItem('auth_token', jwtToken);
      setToken(jwtToken);
      setMessage({ type: 'success', text: 'Authentication successful. Secure session started!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Login failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setRole('viewer');
    setMessage({ type: 'success', text: 'Logged out successfully.' });
  };

  // --- Data Loading Functions ---
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const invData = await client.getInventoryItems();
      setInventoryItems(invData || []);

      const prodData = await client.getProducts();
      setProducts(prodData || []);

      const connData = await client.getShopifyConnections(tenantId);
      setShopifyConns(connData || []);

      const glData = await client.getJournalEntries(tenantId);
      setJournals(glData || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to connect to backend server.' });
    } finally {
      setLoading(false);
    }
  };

  const loadOnboardings = async () => {
    setLoading(true);
    try {
      const data = await client.getStockOnboardings(tenantId);
      setOnboardings(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadForecastingReport = async () => {
    setLoading(true);
    try {
      const data = await client.getForecastingReport(locationId);
      setForecastingReport(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load forecasting report.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    setMessage(null);
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'onboarding') {
      loadOnboardings();
    } else if (activeTab === 'products') {
      loadDashboardData();
    } else if (activeTab === 'ledger') {
      loadDashboardData();
    } else if (activeTab === 'shopify') {
      loadDashboardData();
    } else if (activeTab === 'forecasting') {
      loadForecastingReport();
    }
  }, [activeTab, tenantId, token]);

  // Keep selected product synchronized with updated catalog data
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find(p => p.id === selectedProduct.id);
      if (updated) {
        setSelectedProduct(updated);
      }
    }
  }, [products]);

  // Set up real-time barcode scanning subscriptions
  useEffect(() => {
    if (!token) return;

    const unsubscribe = client.subscribeBarcodeScans(tenantId, (scan) => {
      setScanHistory(prev => [
        {
          time: scan.time || new Date().toLocaleTimeString(),
          scan: scan.scanValue,
          context: scan.context,
          status: scan.status
        },
        ...prev
      ]);
      setMessage({
        type: scan.status.toLowerCase().includes('error') ? 'error' : 'success',
        text: `Live scan received: ${scan.scanValue} [${scan.context.toUpperCase()}] -> ${scan.status}`
      });
    });

    return () => {
      unsubscribe();
    };
  }, [token, tenantId, client]);

  // --- Mutation Responders ---

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.createProduct(newProdId, newProdName);
      setMessage({ type: 'success', text: `Product ${newProdName} created.` });
      setNewProdId('');
      setNewProdName('');
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const attributes = newVarAttrs.filter(a => a.name !== '' && a.value !== '');
      await client.addProductVariant(selectedProduct.id, newVarSku, newVarTracking, attributes);
      setMessage({ type: 'success', text: `Variant ${newVarSku} added.` });
      setNewVarSku('');
      setNewVarAttrs([{ name: '', value: '' }]);
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.assignBarcode(assignSku, assignVal, assignSymbology, assignSource, assignPrimary);
      setMessage({ type: 'success', text: 'Barcode successfully assigned.' });
      setAssignSku('');
      setAssignVal('');
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBarcode = async (sku: string) => {
    setLoading(true);
    try {
      const generated = await client.generateInternalBarcode(sku, tenantId);
      setMessage({ type: 'success', text: `Generated barcode: ${generated}` });
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOnboarding = async () => {
    setLoading(true);
    try {
      await client.createStockOnboarding(tenantId, locationId, new Date().toISOString(), []);
      setMessage({ type: 'success', text: `Draft onboarding sheet created.` });
      loadOnboardings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOnboarding = async (onbId: string) => {
    if (!window.confirm('Are you sure you want to lock and post this onboarding sheet? This will permanently post to the General Ledger and cannot be reversed.')) {
      return;
    }
    try {
      await client.submitStockOnboarding(onbId);
      setMessage({ type: 'success', text: 'Onboarding items posted to General Ledger and lock completed.' });
      loadOnboardings();
      setSelectedOnboarding(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.scanBarcode(scanVal, scanContext, Number(scanAmount), Number(scanActualQty), tenantId, locationId, actorId);
      setScanHistory(prev => [
        { time: new Date().toLocaleTimeString(), scan: scanVal, context: scanContext, status: 'Success' },
        ...prev
      ]);
      setScanVal('');
      setMessage({ type: 'success', text: 'Scan successfully routed to workflow context.' });
    } catch (err: any) {
      setScanHistory(prev => [
        { time: new Date().toLocaleTimeString(), scan: scanVal, context: scanContext, status: `Error: ${err.message}` },
        ...prev
      ]);
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTraceSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    setTracedItem(null);
    setLoading(true);
    try {
      const data = await client.traceSerialHistory(traceSerialNum);
      if (!data) {
        throw new Error(`No serialized item found for serial number ${traceSerialNum}`);
      }
      setTracedItem(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.connectShopify(tenantId, newShopifyDomain, newShopifyToken);
      setMessage({ type: 'success', text: 'Shopify Connection added successfully.' });
      setNewShopifyDomain('');
      setNewShopifyToken('');
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to post this journal entry? This will permanently post to the General Ledger and cannot be reversed.')) {
      return;
    }
    setLoading(true);
    try {
      await client.createJournalEntry(tenantId, newJournalDesc, newJournalMethod, newJournalLines);
      setMessage({ type: 'success', text: 'Double-entry general ledger journal posted successfully!' });
      setNewJournalDesc('');
      setNewJournalLines([
        { accountCode: '1000', amountCents: 0, type: 'debit', memo: '' },
        { accountCode: '2000', amountCents: 0, type: 'credit', memo: '' }
      ]);
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Auth View ---
  if (!token) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', padding: '2rem' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%' }}>
          <div className="brand-section" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="brand-icon">📦</div>
            <div className="brand-name">INVENTORY CLIENT</div>
          </div>
          
          <div className="control-item" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
            <label>Backend API Node:</label>
            <select 
              value={backendType} 
              onChange={(e) => setBackendType(e.target.value as BackendType)}
              style={{ padding: '0.4rem 1rem', marginLeft: '0.5rem' }}
            >
              <option value="graphql">GraphQL API (Port 4000)</option>
              <option value="express">Express REST API (Port 5000)</option>
              <option value="laravel">Laravel REST API (Port 8000)</option>
            </select>
          </div>

          <h2 className="form-section-title" style={{ textAlign: 'center' }}>System Authentication</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Tenant ID</label>
              <input type="text" value={loginTenant} onChange={(e) => setLoginTenant(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Actor ID / Email</label>
              <input type="text" value={loginActor} onChange={(e) => setLoginActor(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Assigned Role</label>
              <select value={loginRole} onChange={(e) => setLoginRole(e.target.value)}>
                <option value="admin">Administrator</option>
                <option value="warehouse_operator">Warehouse Operator</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">System Observer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Secure Key / Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••" />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? <Spinner /> : 'Authenticate Credentials'}
            </button>
          </form>

          {message && (
            <div className={`alert-box alert-${message.type}`} style={{ textAlign: 'center' }}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main Dashboard Layout ---
  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div>
          <div className="brand-section">
            <div className="brand-icon">📦</div>
            <div className="brand-name">DDD CONTROL</div>
          </div>
          <div className="nav-links">
            <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              🏠 Operations Dashboard
            </div>
            {role === 'admin' && (
              <div className={`nav-link ${activeTab === 'shopify' ? 'active' : ''}`} onClick={() => setActiveTab('shopify')}>
                🔌 Shopify Platform
              </div>
            )}
            {(role === 'admin' || role === 'warehouse_operator' || role === 'viewer') && (
              <div className={`nav-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                📁 Product Catalog
              </div>
            )}
            {(role === 'admin' || role === 'warehouse_operator') && (
              <div className={`nav-link ${activeTab === 'scanning' ? 'active' : ''}`} onClick={() => setActiveTab('scanning')}>
                🎯 Barcode Workflows
              </div>
            )}
            {(role === 'admin' || role === 'accountant') && (
              <div className={`nav-link ${activeTab === 'onboarding' ? 'active' : ''}`} onClick={() => setActiveTab('onboarding')}>
                📥 Stock Onboarding
              </div>
            )}
            {(role === 'admin' || role === 'accountant') && (
              <div className={`nav-link ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
                🧾 General Ledger
              </div>
            )}
            {(role === 'admin' || role === 'warehouse_operator' || role === 'viewer') && (
              <div className={`nav-link ${activeTab === 'serials' ? 'active' : ''}`} onClick={() => setActiveTab('serials')}>
                🔍 Serial Number Trace
              </div>
            )}
            <div className={`nav-link ${activeTab === 'forecasting' ? 'active' : ''}`} onClick={() => setActiveTab('forecasting')}>
              📊 Demand Forecasting
            </div>
          </div>
        </div>
        <div>
          <div className="sidebar-footer">
            <div style={{ marginBottom: '0.5rem' }}>Tenant: <code>{tenantId}</code></div>
            <div style={{ marginBottom: '1rem' }}>User: <code>{actorId}</code></div>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem' }} onClick={handleLogout}>
              Logout Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        <div className="top-header">
          <div className="header-title">
            <h1>Unified Control Center</h1>
            <p>Evaluating domain state parity and data synchronization.</p>
          </div>
          
          <div className="header-controls">
            <div className="control-item">
              <label>API Node:</label>
              <select value={backendType} onChange={(e) => setBackendType(e.target.value as BackendType)}>
                <option value="graphql">GraphQL API (Port 4000)</option>
                <option value="express">Express REST API (Port 5000)</option>
                <option value="laravel">Laravel REST API (Port 8000)</option>
              </select>
            </div>
            <div className="control-item">
              <label>Location:</label>
              <input type="text" value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ width: '90px' }} />
            </div>
          </div>
        </div>

        {message && (
          <div className={`alert-box alert-${message.type} flex-between`}>
            <span>{message.text}</span>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setMessage(null)}>
              Dismiss
            </button>
          </div>
        )}

        {/* Dynamic Tab Contents */}

        {activeTab === 'dashboard' && (
          <>
            <div className="grid-cols-4">
              <div className="stat-card">
                <span className="stat-title">Catalog Inventory</span>
                <span className="stat-value">{products.length}</span>
                <span className="stat-desc">Unique Products Registered</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-title">Low Stock SKUs</span>
                <span className="stat-value">
                  {inventoryItems.filter(item => item.quantity < 10).length}
                </span>
                <span className="stat-desc">SKUs below safety threshold (10)</span>
              </div>
              <div className="stat-card">
                <span className="stat-title">Platform Integrations</span>
                <span className="stat-value">{shopifyConns.filter(c => c.isActive).length}</span>
                <span className="stat-desc">Active Shopify Connections</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-title">Double-Entry Ledger</span>
                <span className="stat-value">{journals.length}</span>
                <span className="stat-desc">Recorded Journal Entries</span>
              </div>
            </div>

            <div className="glass-panel">
              <div className="flex-between">
                <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>
                  Real-time Stock Levels
                </h3>
                <button className="btn btn-secondary" onClick={loadDashboardData} disabled={loading}>
                  {loading ? <Spinner /> : 'Refresh Stock'}
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>SKU Reference</th>
                      <th>Location</th>
                      <th>Stock Quantity</th>
                      <th>Version Lock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No inventory stock records loaded.
                        </td>
                      </tr>
                    ) : (
                      inventoryItems.map(item => (
                        <tr key={item.id}>
                          <td><code>{item.id}</code></td>
                          <td><code>{item.sku}</code></td>
                          <td><code>{item.locationId}</code></td>
                          <td><strong>{item.quantity} units</strong></td>
                          <td><code>v{item.version}</code></td>
                          <td>
                            {item.quantity >= 10 ? (
                              <span className="badge badge-success">Healthy</span>
                            ) : (
                              <span className="badge badge-warning">Low Stock</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'shopify' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Configure Shopify Connection</h3>
              <form onSubmit={handleConnectShopify}>
                <div className="form-group">
                  <label>Connection Name / ID</label>
                  <input type="text" value={newShopifyId} onChange={(e) => setNewShopifyId(e.target.value)} required placeholder="e.g. shopify-store-1" />
                </div>
                <div className="form-group">
                  <label>Store Domain</label>
                  <input type="text" value={newShopifyDomain} onChange={(e) => setNewShopifyDomain(e.target.value)} required placeholder="mystore.myshopify.com" />
                </div>
                <div className="form-group">
                  <label>Shopify API Access Token</label>
                  <input type="password" value={newShopifyToken} onChange={(e) => setNewShopifyToken(e.target.value)} required placeholder="shpat_..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <Spinner /> : 'Connect Store'}
                </button>
              </form>
            </div>
            
            <div className="glass-panel">
              <h3 className="form-section-title">Connected Storefronts</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Store Domain</th>
                      <th>Platform</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopifyConns.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No active store connections.
                        </td>
                      </tr>
                    ) : (
                      shopifyConns.map(conn => (
                        <tr key={conn.id}>
                          <td><code>{conn.storeDomain}</code></td>
                          <td>{conn.platform.toUpperCase()}</td>
                          <td>
                            {conn.isActive ? (
                              <span className="badge badge-success">Connected</span>
                            ) : (
                              <span className="badge badge-error">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Add Catalog Product</h3>
              <form onSubmit={handleCreateProduct}>
                <div className="form-group">
                  <label>Product Reference ID</label>
                  <input type="text" value={newProdId} onChange={(e) => setNewProdId(e.target.value)} required placeholder="e.g. prod-123" />
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required placeholder="e.g. Wireless Charger" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <Spinner /> : 'Register Product'}
                </button>
              </form>

              {selectedProduct && (
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 className="form-section-title">Add Variant to {selectedProduct.name}</h3>
                  <form onSubmit={handleAddVariant}>
                    <div className="form-group">
                      <label>SKU Reference</label>
                      <input type="text" value={newVarSku} onChange={(e) => setNewVarSku(e.target.value)} required placeholder="e.g. CHARGER-WRLS-BLK" />
                    </div>
                    <div className="form-group">
                      <label>Inventory Tracking Mode</label>
                      <select value={newVarTracking} onChange={(e) => setNewVarTracking(e.target.value as any)}>
                        <option value="quantity">Quantity Tracking (Default)</option>
                        <option value="serial">Serial Number Tracking</option>
                        <option value="lot">Lot / Batch Tracking</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Variant Attributes (Optional)</label>
                      {newVarAttrs.map((attr, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Name (e.g. Color)" 
                            value={attr.name}
                            onChange={(e) => {
                              const updated = [...newVarAttrs];
                              updated[idx].name = e.target.value;
                              setNewVarAttrs(updated);
                            }} 
                          />
                          <input 
                            type="text" 
                            placeholder="Value (e.g. Black)" 
                            value={attr.value}
                            onChange={(e) => {
                              const updated = [...newVarAttrs];
                              updated[idx].value = e.target.value;
                              setNewVarAttrs(updated);
                            }} 
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => setNewVarAttrs([...newVarAttrs, { name: '', value: '' }])}
                      >
                        + Add Attribute
                      </button>
                    </div>

                    <button type="submit" className="btn btn-accent" disabled={loading}>
                      {loading ? <Spinner /> : 'Save Variant'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="glass-panel">
              <h3 className="form-section-title">Catalog Inventory Products</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU Variants</th>
                      <th>Barcodes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No products found in catalog.
                        </td>
                      </tr>
                    ) : (
                      products.map(p => (
                        <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedProduct(p)}>
                          <td>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><code>{p.id}</code></div>
                          </td>
                          <td>
                            {p.variants.map((v: any) => (
                              <div key={v.id} style={{ marginBottom: '0.25rem' }}>
                                <code>{v.sku}</code> <span style={{ fontSize: '0.7rem', color: 'var(--text-muted-dark)' }}>({v.trackingMode})</span>
                              </div>
                            ))}
                          </td>
                          <td>
                            {p.variants.map((v: any) => (
                              <div key={v.id} style={{ marginBottom: '0.25rem' }}>
                                {v.barcodes && v.barcodes.length > 0 ? (
                                  v.barcodes.map((b: any) => (
                                    <span key={b.id} className="badge badge-info" style={{ marginRight: '0.25rem', fontSize: '0.65rem' }}>
                                      {b.barcode.value}
                                    </span>
                                  ))
                                ) : (
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}
                                    onClick={(e) => { e.stopPropagation(); handleGenerateBarcode(v.sku); }}
                                  >
                                    Generate
                                  </button>
                                )}
                              </div>
                            ))}
                          </td>
                          <td>
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setSelectedProduct(p)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scanning' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Barcode Scanning Simulator</h3>
              <form onSubmit={handleDispatchScan}>
                <div className="form-group">
                  <label>Scanned Barcode / QR Value</label>
                  <input type="text" value={scanVal} onChange={(e) => setScanVal(e.target.value)} required placeholder="Scan or type barcode value..." />
                </div>
                <div className="form-group">
                  <label>Fulfillment Workflow Context</label>
                  <select value={scanContext} onChange={(e) => setScanContext(e.target.value as any)}>
                    <option value="pos">POS Dispatch (Inventory Decrement)</option>
                    <option value="receiving">Warehouse Receiving (Inventory Increment)</option>
                    <option value="cycle_count">Physical Cycle Count Audit (Variance Reconcile)</option>
                  </select>
                </div>
                
                {(scanContext === 'pos' || scanContext === 'receiving') && (
                  <div className="form-group">
                    <label>Quantity Change</label>
                    <input type="number" value={scanAmount} onChange={(e) => setScanAmount(Number(e.target.value))} required min={1} />
                  </div>
                )}

                {scanContext === 'cycle_count' && (
                  <div className="form-group">
                    <label>Actual Counted Quantity</label>
                    <input type="number" value={scanActualQty} onChange={(e) => setScanActualQty(Number(e.target.value))} required min={0} />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Trigger Scanning Event
                </button>
              </form>

              {role === 'admin' && (
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 className="form-section-title">Assign Barcode to Catalog Variant</h3>
                  <form onSubmit={handleAssignBarcode}>
                    <div className="form-group">
                      <label>Target Variant SKU</label>
                      <input type="text" value={assignSku} onChange={(e) => setAssignSku(e.target.value)} required placeholder="e.g. CHARGER-WRLS-BLK" />
                    </div>
                    <div className="form-group">
                      <label>Barcode Value</label>
                      <input type="text" value={assignVal} onChange={(e) => setAssignVal(e.target.value)} required placeholder="UPC, EAN or QR code text..." />
                    </div>
                    <div className="form-group">
                      <label>Symbology / Encoding</label>
                      <select value={assignSymbology} onChange={(e) => setAssignSymbology(e.target.value)}>
                        <option value="upc_a">UPC-A</option>
                        <option value="ean_13">EAN-13</option>
                        <option value="code_128">Code 128</option>
                        <option value="qr">QR Code</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-accent" disabled={loading}>
                      Save Assignment
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="glass-panel">
              <h3 className="form-section-title">Live Scanning Event Stream</h3>
              <div className="timeline">
                {scanHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    No barcode scanning events captured yet. Click "Trigger Scanning Event" or send events over WebSockets.
                  </div>
                ) : (
                  scanHistory.map((item, idx) => (
                    <div key={idx} className={`timeline-item ${item.status.includes('Error') ? 'warning' : 'success'}`}>
                      <div className="timeline-header">
                        <span>{item.context.toUpperCase()} Workflow</span>
                        <span>{item.time}</span>
                      </div>
                      <div className="timeline-body">
                        Scanned Value: <code>{item.scan}</code> &rarr; Status: <strong>{item.status}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Invite New Inventory Batch</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Onboarding sheets allow inventory stock to be loaded with baseline cost layers and posted as an opening balance on the General Ledger.
              </p>
              <button onClick={handleCreateOnboarding} className="btn btn-primary" disabled={loading}>
                {loading ? <Spinner /> : 'Create Draft Onboarding Sheet'}
              </button>

              {selectedOnboarding && (
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 className="form-section-title">Add Items to: {selectedOnboarding.id}</h3>
                  <div className="form-group">
                    <label>Items Specification</label>
                    {onboardingItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input 
                          type="text" 
                          placeholder="Variant SKU" 
                          value={item.variantId}
                          onChange={(e) => {
                            const updated = [...onboardingItems];
                            updated[idx].variantId = e.target.value;
                            setOnboardingItems(updated);
                          }} 
                        />
                        <input 
                          type="number" 
                          placeholder="Quantity" 
                          value={item.quantity || ''}
                          onChange={(e) => {
                            const updated = [...onboardingItems];
                            updated[idx].quantity = Number(e.target.value);
                            setOnboardingItems(updated);
                          }} 
                        />
                        <input 
                          type="number" 
                          placeholder="Cost Cents" 
                          value={item.unitCostCents || ''}
                          onChange={(e) => {
                            const updated = [...onboardingItems];
                            updated[idx].unitCostCents = Number(e.target.value);
                            setOnboardingItems(updated);
                          }} 
                        />
                      </div>
                    ))}
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => setOnboardingItems([...onboardingItems, { variantId: '', quantity: 0, unitCostCents: 0 }])}
                    >
                      + Add Item row
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                      onClick={() => handleSubmitOnboarding(selectedOnboarding.id)}
                      className="btn btn-accent"
                      disabled={loading}
                    >
                      Submit & Post Opening Balances
                    </button>
                    <button 
                      onClick={() => setSelectedOnboarding(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel">
              <h3 className="form-section-title">Onboarding Batches</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Items Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onboardings.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No onboarding sheets registered.
                        </td>
                      </tr>
                    ) : (
                      onboardings.map(onb => (
                        <tr key={onb.id}>
                          <td><code>{onb.id}</code></td>
                          <td>{new Date(onb.asOfDate).toLocaleDateString()}</td>
                          <td>
                            {onb.status === 'submitted' ? (
                              <span className="badge badge-success">Posted</span>
                            ) : (
                              <span className="badge badge-warning">Draft</span>
                            )}
                          </td>
                          <td>{onb.items?.length || 0} items</td>
                          <td>
                            {onb.status === 'draft' ? (
                              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setSelectedOnboarding(onb); setOnboardingItems(onb.items.length > 0 ? onb.items : [{ variantId: '', quantity: 0, unitCostCents: 0 }]); }}>
                                Edit & Submit
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Record General Ledger Journal</h3>
              <form onSubmit={handlePostJournal}>
                <div className="form-group">
                  <label>Journal Description</label>
                  <input type="text" value={newJournalDesc} onChange={(e) => setNewJournalDesc(e.target.value)} required placeholder="e.g. Adjustment entry" />
                </div>
                <div className="form-group">
                  <label>Accounting Method</label>
                  <select value={newJournalMethod} onChange={(e) => setNewJournalMethod(e.target.value as any)}>
                    <option value="accrual">Accrual Method</option>
                    <option value="cash">Cash Method</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Journal Entry Lines (Must balance debits and credits)</label>
                  {newJournalLines.map((line, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Account Code" 
                        value={line.accountCode} 
                        onChange={(e) => {
                          const updated = [...newJournalLines];
                          updated[idx].accountCode = e.target.value;
                          setNewJournalLines(updated);
                        }}
                        required 
                      />
                      <input 
                        type="number" 
                        placeholder="Cents" 
                        value={line.amountCents || ''} 
                        onChange={(e) => {
                          const updated = [...newJournalLines];
                          updated[idx].amountCents = Number(e.target.value);
                          setNewJournalLines(updated);
                        }}
                        required 
                      />
                      <select 
                        value={line.type} 
                        onChange={(e) => {
                          const updated = [...newJournalLines];
                          updated[idx].type = e.target.value as any;
                          setNewJournalLines(updated);
                        }}
                      >
                        <option value="debit">DEBIT</option>
                        <option value="credit">CREDIT</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Memo" 
                        value={line.memo || ''} 
                        onChange={(e) => {
                          const updated = [...newJournalLines];
                          updated[idx].memo = e.target.value;
                          setNewJournalLines(updated);
                        }}
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => setNewJournalLines([...newJournalLines, { accountCode: '', amountCents: 0, type: 'debit', memo: '' }])}
                  >
                    + Add Line row
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <Spinner /> : 'Post General Ledger Entry'}
                </button>
              </form>
            </div>

            <div className="glass-panel">
              <h3 className="form-section-title">General Ledger Journals</h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>GL Date</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Lines (Account / Amount)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No journal entries posted yet.
                        </td>
                      </tr>
                    ) : (
                      journals.map(entry => (
                        <tr key={entry.id}>
                          <td>{new Date(entry.date || new Date()).toLocaleDateString()}</td>
                          <td>
                            <strong>{entry.description}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted-dark)' }}><code>Ref: {entry.referenceId || entry.id}</code></div>
                          </td>
                          <td>{entry.method.toUpperCase()}</td>
                          <td>
                            {entry.lines.map((l: any, idx: number) => (
                              <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <code>{l.accountCode}</code>: {l.type === 'debit' ? 'DR' : 'CR'} ${(l.amountCents / 100).toFixed(2)}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'serials' && (
          <div className="grid-cols-2">
            <div className="glass-panel">
              <h3 className="form-section-title">Serialized Stock Tracker</h3>
              <form onSubmit={handleTraceSerial}>
                <div className="form-group">
                  <label>Item Serial Number</label>
                  <input type="text" value={traceSerialNum} onChange={(e) => setTraceSerialNum(e.target.value)} required placeholder="Enter unique serial number..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Trace Serial History
                </button>
              </form>

              {tracedItem && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 className="form-section-title">Item Properties</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div><strong>Serial Number:</strong> <code>{tracedItem.serialNumber}</code></div>
                    <div><strong>Variant ID:</strong> <code>{tracedItem.variantId}</code></div>
                    <div><strong>Warehouse Location:</strong> <code>{tracedItem.locationId}</code></div>
                    <div>
                      <strong>Tracking Status:</strong> 
                      <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>
                        {tracedItem.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel">
              <h3 className="form-section-title">Serial Custody & Location Timeline</h3>
              <div className="timeline">
                {!tracedItem || !tracedItem.history || tracedItem.history.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    Enter a serial number to trace custody and location transitions.
                  </div>
                ) : (
                  tracedItem.history.map((hist: any, idx: number) => (
                    <div key={idx} className="timeline-item success">
                      <div className="timeline-header">
                        <span>Status Transition: {hist.from} → {hist.to}</span>
                        <span>{new Date(hist.occurredAt || new Date()).toLocaleTimeString()}</span>
                      </div>
                      <div className="timeline-body">
                        <div><strong>Reason:</strong> {hist.reason}</div>
                        <div><strong>Actor:</strong> <code>{hist.actor}</code></div>
                        {hist.referenceId && <div><strong>Reference ID:</strong> <code>{hist.referenceId}</code></div>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forecasting' && (
          <>
            <div className="grid-cols-3">
              <div className="stat-card">
                <span className="stat-title">Products Monitored</span>
                <span className="stat-value">{forecastingReport.length}</span>
                <span className="stat-desc">SKUs Evaluated under forecasting</span>
              </div>
              <div className="stat-card accent">
                <span className="stat-title">Urgent Actions</span>
                <span className="stat-value">
                  {forecastingReport.filter(item => item.currentStock <= item.suggestedROP).length}
                </span>
                <span className="stat-desc">SKUs below recommended Reorder Point</span>
              </div>
              <div className="stat-card">
                <span className="stat-title">Target Location</span>
                <span className="stat-value"><code>{locationId.toUpperCase()}</code></span>
                <span className="stat-desc">Active demand evaluation location</span>
              </div>
            </div>

            <div className="glass-panel">
              <div className="flex-between">
                <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>
                  Demand Planning & ROP Safety Stock Recommendations
                </h3>
                <button className="btn btn-secondary" onClick={loadForecastingReport} disabled={loading}>
                  {loading ? <Spinner /> : 'Recalculate ROP'}
                </button>
              </div>
              
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Product SKU</th>
                      <th>Stock Level</th>
                      <th>7d/30d/90d Daily Velocity</th>
                      <th>30-Day Forecast</th>
                      <th>Safety Stock</th>
                      <th>Suggested ROP</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastingReport.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No demand forecasting items calculated. Make sure stock movement transactions exist in database.
                        </td>
                      </tr>
                    ) : (
                      forecastingReport.map(item => {
                        const isReorderUrgent = item.currentStock <= item.suggestedROP;
                        const isReorderWarning = !isReorderUrgent && item.currentStock <= (item.suggestedROP + item.safetyStock);
                        
                        return (
                          <tr key={item.sku}>
                            <td><code>{item.sku}</code></td>
                            <td><strong>{item.currentStock} units</strong></td>
                            <td>
                              <code>{Number(item.salesVelocity7d || 0).toFixed(1)}</code> / 
                              <code> {Number(item.salesVelocity30d || 0).toFixed(1)}</code> / 
                              <code> {Number(item.salesVelocity90d || 0).toFixed(1)}</code>
                            </td>
                            <td><strong>{item.forecastedDemand} units</strong></td>
                            <td><code>{item.safetyStock} units</code></td>
                            <td><code>{item.suggestedROP} units</code></td>
                            <td>
                              {isReorderUrgent ? (
                                <span className="badge badge-error">🔴 REORDER URGENT</span>
                              ) : isReorderWarning ? (
                                <span className="badge badge-warning">🟡 MONITOR STOCKS</span>
                              ) : (
                                <span className="badge badge-success">🟢 STOCK HEALTHY</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
