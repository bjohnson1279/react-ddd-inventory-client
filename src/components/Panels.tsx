import React from 'react';
import { Item, JournalLine, Tab } from '../api/client';

export const Spinner = () => (
  <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
    <path className="spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// --- 1. DashboardPanel ---
interface DashboardPanelProps {
  products: any[];
  inventoryItems: any[];
  shopifyConns: any[];
  journals: any[];
  loadDashboardData: () => void;
  loading: boolean;
}
export const DashboardPanel: React.FC<DashboardPanelProps> = ({
  products,
  inventoryItems,
  shopifyConns,
  journals,
  loadDashboardData,
  loading
}) => (
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
);

// --- 2. ShopifyPanel ---
interface ShopifyPanelProps {
  newShopifyId: string;
  setNewShopifyId: (v: string) => void;
  newShopifyDomain: string;
  setNewShopifyDomain: (v: string) => void;
  newShopifyToken: string;
  setNewShopifyToken: (v: string) => void;
  handleConnectShopify: (e: React.FormEvent) => void;
  shopifyConns: any[];
  loading: boolean;
}
export const ShopifyPanel: React.FC<ShopifyPanelProps> = ({
  newShopifyId,
  setNewShopifyId,
  newShopifyDomain,
  setNewShopifyDomain,
  newShopifyToken,
  setNewShopifyToken,
  handleConnectShopify,
  shopifyConns,
  loading
}) => (
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
);

// --- 3. ProductsPanel ---
interface ProductsPanelProps {
  newProdId: string;
  setNewProdId: (v: string) => void;
  newProdName: string;
  setNewProdName: (v: string) => void;
  handleCreateProduct: (e: React.FormEvent) => void;
  selectedProduct: any | null;
  setSelectedProduct: (p: any | null) => void;
  handleAddVariant: (e: React.FormEvent) => void;
  newVarSku: string;
  setNewVarSku: (v: string) => void;
  newVarTracking: 'quantity' | 'serial' | 'lot';
  setNewVarTracking: (v: 'quantity' | 'serial' | 'lot') => void;
  newVarAttrJSON: string;
  setNewVarAttrJSON: (v: string) => void;
  products: any[];
  handleAssignBarcode: (e: React.FormEvent) => void;
  assignSku: string;
  setAssignSku: (v: string) => void;
  assignVal: string;
  setAssignVal: (v: string) => void;
  assignSymbology: string;
  setAssignSymbology: (v: string) => void;
  assignSource: string;
  setAssignSource: (v: string) => void;
  assignIsPrimary: boolean;
  setAssignIsPrimary: (v: boolean) => void;
  handleGenerateBarcode: (sku: string) => void;
  loading: boolean;
}
export const ProductsPanel: React.FC<ProductsPanelProps> = ({
  newProdId,
  setNewProdId,
  newProdName,
  setNewProdName,
  handleCreateProduct,
  selectedProduct,
  setSelectedProduct,
  handleAddVariant,
  newVarSku,
  setNewVarSku,
  newVarTracking,
  setNewVarTracking,
  newVarAttrJSON,
  setNewVarAttrJSON,
  products,
  handleAssignBarcode,
  assignSku,
  setAssignSku,
  assignVal,
  setAssignVal,
  assignSymbology,
  setAssignSymbology,
  assignSource,
  setAssignSource,
  assignIsPrimary,
  setAssignIsPrimary,
  handleGenerateBarcode,
  loading
}) => (
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
                <option value="lot">Lot-Controlled Expiry Tracking</option>
              </select>
            </div>
            <div className="form-group">
              <label>Attributes Configuration (JSON Array)</label>
              <input type="text" value={newVarAttrJSON} onChange={(e) => setNewVarAttrJSON(e.target.value)} placeholder='[{"name":"color","value":"black"}]' />
            </div>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? <Spinner /> : 'Add Product Variant'}
            </button>
          </form>
        </div>
      )}
    </div>
    
    <div className="glass-panel">
      <h3 className="form-section-title">Product Registry & Barcode Mapping</h3>
      <div className="table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>ID & Name</th>
              <th>Variants Configured</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No products registered in catalog.
                </td>
              </tr>
            ) : (
              products.map(p => (
                <tr 
                  key={p.id} 
                  style={{ cursor: 'pointer', background: selectedProduct?.id === p.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent' }}
                  onClick={() => setSelectedProduct(p)}
                >
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><code>{p.id}</code></div>
                  </td>
                  <td>
                    {(!p.variants || p.variants.length === 0) ? (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No variants</span>
                    ) : (
                      p.variants.map((v: any) => (
                        <div key={v.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div><code>{v.sku}</code> <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)' }}>({v.trackingMode})</span></div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                            {(v.barcodes || []).map((b: any) => (
                              <span key={b.id} className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                {b.barcode?.value || b.barcodeValue} ({b.barcode?.symbology || b.symbology})
                              </span>
                            ))}
                          </div>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', marginTop: '0.35rem' }} 
                            onClick={(e) => { e.stopPropagation(); handleGenerateBarcode(v.sku); }}
                          >
                            Generate Internal Barcode
                          </button>
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <h3 className="form-section-title">Manual Barcode Assignment</h3>
        <form onSubmit={handleAssignBarcode}>
          <div className="form-group">
            <label>Product Variant SKU</label>
            <input type="text" value={assignSku} onChange={(e) => setAssignSku(e.target.value)} required placeholder="e.g. CHARGER-WRLS-BLK" />
          </div>
          <div className="form-group">
            <label>Barcode Value</label>
            <input type="text" value={assignVal} onChange={(e) => setAssignVal(e.target.value)} required placeholder="e.g. 750102030405" />
          </div>
          <div className="form-group">
            <label>Symbology / Standard</label>
            <select value={assignSymbology} onChange={(e) => setAssignSymbology(e.target.value)}>
              <option value="upc_a">UPC-A (North American Retail)</option>
              <option value="ean_13">EAN-13 (Global Retail)</option>
              <option value="code_128">Code 128 (Logistics/Internal)</option>
              <option value="qr_code">QR Code (2D Data Matrix)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Source Type</label>
            <select value={assignSource} onChange={(e) => setAssignSource(e.target.value)}>
              <option value="manufacturer">Manufacturer Barcode</option>
              <option value="internal">Internal Inventory Label</option>
              <option value="third_party">Third Party Registry</option>
            </select>
          </div>
          <div className="form-group checkbox">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={assignIsPrimary} onChange={(e) => setAssignIsPrimary(e.target.checked)} />
              Set as primary barcode for scanning resolution
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Assign Barcode Value
          </button>
        </form>
      </div>
    </div>
  </div>
);

// --- 4. ScanningPanel ---
interface ScanningPanelProps {
  scanVal: string;
  setScanVal: (v: string) => void;
  scanContext: string;
  setScanContext: (v: string) => void;
  scanAmount: number;
  setScanAmount: (v: number) => void;
  scanActualQty: number;
  setScanActualQty: (v: number) => void;
  handleDispatchScan: (e: React.FormEvent) => void;
  scanHistory: any[];
  loading: boolean;
  isOnline: boolean;
  offlineQueueCount: number;
  handleSyncQueue: () => void;
}
export const ScanningPanel: React.FC<ScanningPanelProps> = ({
  scanVal,
  setScanVal,
  scanContext,
  setScanContext,
  scanAmount,
  setScanAmount,
  scanActualQty,
  setScanActualQty,
  handleDispatchScan,
  scanHistory,
  loading,
  isOnline,
  offlineQueueCount,
  handleSyncQueue
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h3 className="form-section-title" style={{ margin: 0, border: 'none' }}>Barcode Scanning Simulator</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge ${isOnline ? 'badge-success' : 'badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isOnline ? '#00e676' : '#ff9100' }}></span>
            {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
          </span>
          {offlineQueueCount > 0 && (
            <span className="badge badge-accent">
              {offlineQueueCount} queued
            </span>
          )}
        </div>
      </div>

      {!isOnline && (
        <div className="alert-box alert-warning" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <strong>Industrial Dead Zone Alert:</strong> Connection lost. Scans will be buffered locally in IndexedDB and synchronized automatically once network is restored.
        </div>
      )}

      {offlineQueueCount > 0 && isOnline && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
          <span><strong>Buffered Scans:</strong> You have {offlineQueueCount} scan(s) waiting in IndexedDB queue.</span>
          <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', marginLeft: '1rem' }} onClick={handleSyncQueue} disabled={loading}>
            Sync Queue Now
          </button>
        </div>
      )}

      <form onSubmit={handleDispatchScan}>
        <div className="form-group">
          <label>Scanned Barcode Value</label>
          <input type="text" value={scanVal} onChange={(e) => setScanVal(e.target.value)} required placeholder="Scan label or input value..." />
        </div>
        <div className="form-group">
          <label>Fulfillment/Routing Context</label>
          <select value={scanContext} onChange={(e) => setScanContext(e.target.value)}>
            <option value="receive">Receive Inventory (Replenishment)</option>
            <option value="dispatch">Dispatch Inventory (Sales Fulfillment)</option>
            <option value="audit">Store Count / Cycle Audit</option>
          </select>
        </div>
        <div className="form-group">
          <label>Scanned Package Increment Quantity</label>
          <input type="number" value={scanAmount || ''} onChange={(e) => setScanAmount(Number(e.target.value))} required />
        </div>
        <div className="form-group">
          <label>Actual Store Count (Audit Context Only)</label>
          <input type="number" value={scanActualQty || ''} onChange={(e) => setScanActualQty(Number(e.target.value))} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {isOnline ? 'Dispatch Barcode Scan' : 'Buffer Barcode Offline'}
        </button>
      </form>
    </div>

    <div className="glass-panel">
      <h3 className="form-section-title">Terminal Scan Stream</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Value</th>
              <th>Workflow Context</th>
              <th>Status Response</th>
            </tr>
          </thead>
          <tbody>
            {scanHistory.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No active scans recorded in this session.
                </td>
              </tr>
            ) : (
              scanHistory.map((h, idx) => (
                <tr key={idx}>
                  <td>{h.time}</td>
                  <td><code>{h.scan}</code></td>
                  <td>{h.context.toUpperCase()}</td>
                  <td>
                    {h.status.startsWith('Success') ? (
                      <span className="badge badge-success">SUCCESS</span>
                    ) : (
                      <span className="badge badge-error">{h.status}</span>
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
);

// --- 5. OnboardingPanel ---
interface OnboardingPanelProps {
  onboardings: any[];
  selectedOnboarding: any | null;
  setSelectedOnboarding: (o: any | null) => void;
  onboardingItems: Item[];
  setOnboardingItems: (items: Item[]) => void;
  handleCreateOnboarding: () => void;
  handleSubmitOnboarding: (id: string) => void;
  loading: boolean;
}
export const OnboardingPanel: React.FC<OnboardingPanelProps> = ({
  onboardings,
  selectedOnboarding,
  setSelectedOnboarding,
  onboardingItems,
  setOnboardingItems,
  handleCreateOnboarding,
  handleSubmitOnboarding,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <div className="flex-between">
        <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>Stock Onboarding Sheets</h3>
        <button className="btn btn-primary" onClick={handleCreateOnboarding} disabled={loading}>
          + Create Draft Sheet
        </button>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Sheet ID</th>
              <th>Location</th>
              <th>Date Created</th>
              <th>Fulfillment Status</th>
            </tr>
          </thead>
          <tbody>
            {onboardings.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No onboarding sheets registered.
                </td>
              </tr>
            ) : (
              onboardings.map(o => (
                <tr key={o.id} onClick={() => setSelectedOnboarding(o)} style={{ cursor: 'pointer', background: selectedOnboarding?.id === o.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent' }}>
                  <td><code>{o.id}</code></td>
                  <td><code>{o.locationId}</code></td>
                  <td>{new Date(o.asOfDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${o.status === 'submitted' ? 'success' : 'warning'}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    <div className="glass-panel">
      <h3 className="form-section-title">Sheet Line Items Editor</h3>
      {!selectedOnboarding ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
          Select an onboarding sheet on the left to edit or post ledger items.
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <div><strong>Sheet Reference:</strong> <code>{selectedOnboarding.id}</code></div>
              <div><strong>Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{selectedOnboarding.status}</span></div>
            </div>
            {selectedOnboarding.status === 'draft' && (
              <button className="btn btn-accent" onClick={() => handleSubmitOnboarding(selectedOnboarding.id)} disabled={loading} aria-busy={loading}>
                {loading ? 'Initializing...' : 'Lock & Post Sheet'}
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Variant ID</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {(!selectedOnboarding.items || selectedOnboarding.items.length === 0) ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No items.</td>
                  </tr>
                ) : (
                  selectedOnboarding.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td><code>{it.variantId}</code></td>
                      <td>{it.quantity} units</td>
                      <td>${(it.unitCostCents / 100).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
);

// --- 6. LedgerPanel ---
interface LedgerPanelProps {
  journals: any[];
  newJournalDesc: string;
  setNewJournalDesc: (v: string) => void;
  newJournalMethod: 'cash' | 'accrual';
  setNewJournalMethod: (v: 'cash' | 'accrual') => void;
  newJournalLines: JournalLine[];
  setNewJournalLines: (lines: JournalLine[]) => void;
  handlePostJournal: (e: React.FormEvent) => void;
  loading: boolean;
}
export const LedgerPanel: React.FC<LedgerPanelProps> = ({
  journals,
  newJournalDesc,
  setNewJournalDesc,
  newJournalMethod,
  setNewJournalMethod,
  newJournalLines,
  setNewJournalLines,
  handlePostJournal,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <h3 className="form-section-title">Manual Ledger Entry (Journal)</h3>
      <form onSubmit={handlePostJournal}>
        <div className="form-group">
          <label>Journal Description</label>
          <input type="text" value={newJournalDesc} onChange={(e) => setNewJournalDesc(e.target.value)} required placeholder="e.g. Month-end adjustments" />
        </div>
        <div className="form-group">
          <label>Accounting Method</label>
          <select value={newJournalMethod} onChange={(e) => setNewJournalMethod(e.target.value as any)}>
            <option value="accrual">Accrual Accounting (GAAP Compliant)</option>
            <option value="cash">Cash Accounting</option>
          </select>
        </div>

        <div className="form-group">
          <label>Double-Entry Rows</label>
          {newJournalLines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="Account (e.g. 1000)" 
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
                placeholder="Amount (Cents)" 
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
                <option value="debit">DEBIT (DR)</option>
                <option value="credit">CREDIT (CR)</option>
              </select>
            </div>
          ))}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setNewJournalLines([...newJournalLines, { accountCode: '', amountCents: 0, type: 'credit', memo: '' }])}
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
);

// --- 7. SerialsPanel ---
interface SerialsPanelProps {
  traceSerialNum: string;
  setTraceSerialNum: (v: string) => void;
  tracedItem: any | null;
  handleTraceSerial: (e: React.FormEvent) => void;
  loading: boolean;
}
export const SerialsPanel: React.FC<SerialsPanelProps> = ({
  traceSerialNum,
  setTraceSerialNum,
  tracedItem,
  handleTraceSerial,
  loading
}) => (
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
);

// --- 8. ForecastingPanel ---
interface ForecastingPanelProps {
  forecastingReport: any[];
  loadForecastingReport: () => void;
  locationId: string;
  reorderPolicies: any[];
  policySku: string;
  setPolicySku: (v: string) => void;
  policyLoc: string;
  setPolicyLoc: (v: string) => void;
  policyRop: number;
  setPolicyRop: (v: number) => void;
  policySafety: number;
  setPolicySafety: (v: number) => void;
  policyEoq: number;
  setPolicyEoq: (v: number) => void;
  handleSaveReorderPolicy: (e: React.FormEvent) => void;
  handleEvaluateReorderPolicies: () => void;
  fefoSku: string;
  setFefoSku: (v: string) => void;
  fefoQty: number;
  setFefoQty: (v: number) => void;
  fefoResult: any[];
  handleGetFefoSuggestions: (e: React.FormEvent) => void;
  recallLotNum: string;
  setRecallLotNum: (v: string) => void;
  recallResult: any | null;
  handleTraceRecall: (e: React.FormEvent) => void;
  loading: boolean;
}
export const ForecastingPanel: React.FC<ForecastingPanelProps> = ({
  forecastingReport,
  loadForecastingReport,
  locationId,
  reorderPolicies,
  policySku,
  setPolicySku,
  policyLoc,
  setPolicyLoc,
  policyRop,
  setPolicyRop,
  policySafety,
  setPolicySafety,
  policyEoq,
  setPolicyEoq,
  handleSaveReorderPolicy,
  handleEvaluateReorderPolicies,
  fefoSku,
  setFefoSku,
  fefoQty,
  setFefoQty,
  fefoResult,
  handleGetFefoSuggestions,
  recallLotNum,
  setRecallLotNum,
  recallResult,
  handleTraceRecall,
  loading
}) => (
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

    <div className="grid-cols-2" style={{ marginTop: '2rem' }}>
      <div className="glass-panel">
        <h3 className="form-section-title">Configure Reorder Policy (ROP/EOQ)</h3>
        <form onSubmit={handleSaveReorderPolicy}>
          <div className="form-group">
            <label>Product SKU</label>
            <input type="text" value={policySku} onChange={(e) => setPolicySku(e.target.value)} required placeholder="e.g. ROUTE-SKU" />
          </div>
          <div className="form-group">
            <label>Location ID</label>
            <input type="text" value={policyLoc} onChange={(e) => setPolicyLoc(e.target.value)} required placeholder="e.g. LOC-EAST" />
          </div>
          <div className="form-group">
            <label>Reorder Point (Units)</label>
            <input type="number" value={policyRop} onChange={(e) => setPolicyRop(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Safety Stock (Units)</label>
            <input type="number" value={policySafety} onChange={(e) => setPolicySafety(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Economic Order Quantity (EOQ)</label>
            <input type="number" value={policyEoq} onChange={(e) => setPolicyEoq(Number(e.target.value))} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Save Policy
          </button>
        </form>
      </div>

      <div className="glass-panel">
        <div className="flex-between">
          <h3 className="form-section-title" style={{ border: 'none', marginBottom: 0 }}>Active Reorder Policies</h3>
          <button className="btn btn-accent" onClick={handleEvaluateReorderPolicies} disabled={loading}>
            Evaluate Policies
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Location</th>
                <th>ROP / Safety</th>
                <th>EOQ</th>
              </tr>
            </thead>
            <tbody>
              {reorderPolicies.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No custom reorder policies saved.
                  </td>
                </tr>
              ) : (
                reorderPolicies.map((p, idx) => (
                  <tr key={idx}>
                    <td><code>{p.sku}</code></td>
                    <td><code>{p.locationId}</code></td>
                    <td>{p.reorderPoint} / {p.safetyStock} units</td>
                    <td>{p.economicOrderQuantity} units</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div className="grid-cols-2" style={{ marginTop: '2rem' }}>
      <div className="glass-panel">
        <h3 className="form-section-title">FEFO Expiry Pick Suggestions</h3>
        <form onSubmit={handleGetFefoSuggestions}>
          <div className="form-group">
            <label>Product SKU</label>
            <input type="text" value={fefoSku} onChange={(e) => setFefoSku(e.target.value)} required placeholder="e.g. ROUTE-SKU" />
          </div>
          <div className="form-group">
            <label>Fulfillment Quantity</label>
            <input type="number" value={fefoQty} onChange={(e) => setFefoQty(Number(e.target.value))} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Get Expiring Stock Layers
          </button>
        </form>

        {fefoResult.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Recommended Pick Order</h4>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Lot Number</th>
                    <th>Expiration</th>
                    <th>Suggested Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {fefoResult.map((layer, idx) => (
                    <tr key={idx}>
                      <td><code>{layer.lotNumber}</code></td>
                      <td>{new Date(layer.expirationDate).toLocaleDateString()}</td>
                      <td><strong>{layer.quantityToPick} units</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel">
        <h3 className="form-section-title">Lot Recall Tracing Reports</h3>
        <form onSubmit={handleTraceRecall}>
          <div className="form-group">
            <label>Target Lot Number</label>
            <input type="text" value={recallLotNum} onChange={(e) => setRecallLotNum(e.target.value)} required placeholder="e.g. LOT-A-1" />
          </div>
          <button type="submit" className="btn btn-accent" disabled={loading}>
            Compile Recall Report
          </button>
        </form>

        {recallResult && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Dispatched Lot Transactions</h4>
            {recallResult.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No units from this lot have been dispatched to customers.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>SKU Reference</th>
                      <th>Quantity</th>
                      <th>Lot Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recallResult.map((disp: any, idx: number) => (
                      <tr key={idx}>
                        <td><code>{disp.sku}</code></td>
                        <td>{disp.quantity} units</td>
                        <td><code>{disp.lotNumber}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <div className="glass-panel" style={{ marginTop: '2rem' }}>
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
);

// --- 9. RoutingPanel ---
interface RoutingPanelProps {
  routingSku: string;
  setRoutingSku: (v: string) => void;
  routingQuantity: number;
  setRoutingQuantity: (v: number) => void;
  routingAddress: string;
  setRoutingAddress: (v: string) => void;
  routingStrategy: string;
  setRoutingStrategy: (v: string) => void;
  routingPlan: any | null;
  handleComputeRoute: (e: React.FormEvent) => void;
  loading: boolean;
}
export const RoutingPanel: React.FC<RoutingPanelProps> = ({
  routingSku,
  setRoutingSku,
  routingQuantity,
  setRoutingQuantity,
  routingAddress,
  setRoutingAddress,
  routingStrategy,
  setRoutingStrategy,
  routingPlan,
  handleComputeRoute,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <h3 className="form-section-title">Intelligent Order Routing Optimizer</h3>
      <form onSubmit={handleComputeRoute}>
        <div className="form-group">
          <label>Product SKU</label>
          <input type="text" value={routingSku} onChange={(e) => setRoutingSku(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Order Quantity</label>
          <input type="number" value={routingQuantity} onChange={(e) => setRoutingQuantity(Number(e.target.value))} required />
        </div>
        <div className="form-group">
          <label>Destination Address (Geocode Lookup)</label>
          <input type="text" value={routingAddress} onChange={(e) => setRoutingAddress(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Routing Strategy</label>
          <select value={routingStrategy} onChange={(e) => setRoutingStrategy(e.target.value)}>
            <option value="MINIMIZE_COST">Minimize Carrier Cost (Balanced splits)</option>
            <option value="MINIMIZE_SPLITS">Minimize Splits (Fulfill from single location)</option>
            <option value="MINIMIZE_DISTANCE">Minimize Distance (Nearest origin warehouse)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Compute Optimal Routing Plan'}
        </button>
      </form>
    </div>

    <div className="glass-panel">
      <h3 className="form-section-title">Optimal Fulfillment Plan</h3>
      {!routingPlan ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
          Submit parameters on the left to resolve origin allocations.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="stat-card accent">
            <span className="stat-title">Fulfillment Cost</span>
            <span className="stat-value">${(routingPlan.totalCost / 100).toFixed(2)}</span>
            <span className="stat-desc">Calculated shipping & split penalties</span>
          </div>
          
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            <div className="stat-card">
              <span className="stat-title">Total Distance</span>
              <span className="stat-value">{Number(routingPlan.totalDistance).toFixed(1)} km</span>
            </div>
            <div className="stat-card">
              <span className="stat-title">Split Shipments</span>
              <span className="stat-value">{routingPlan.splitCount} splits</span>
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem 0' }}>Warehouse Allocations</h4>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Warehouse / Location ID</th>
                  <th>Allocated Quantity</th>
                </tr>
              </thead>
              <tbody>
                {routingPlan.allocations.map((alloc: any, idx: number) => (
                  <tr key={idx}>
                    <td><code>{alloc.locationId}</code></td>
                    <td><strong>{alloc.quantity} units</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>
);

// --- 10. ProcurementPanel ---
interface ProcurementPanelProps {
  newPoSupplier: string;
  setNewPoSupplier: (v: string) => void;
  newPoLines: { sku: string; quantity: number; unitCostCents: number }[];
  setNewPoLines: (lines: { sku: string; quantity: number; unitCostCents: number }[]) => void;
  handleCreatePurchaseOrder: (e: React.FormEvent) => void;
  purchaseOrders: any[];
  receivePoId: string;
  setReceivePoId: (v: string) => void;
  receivePoLines: { sku: string; quantity: number }[];
  setReceivePoLines: (lines: { sku: string; quantity: number }[]) => void;
  handleReceivePO: (e: React.FormEvent) => void;
  handleApprovePO: (id: string) => void;
  handleSendPO: (id: string) => void;
  loading: boolean;
}
export const ProcurementPanel: React.FC<ProcurementPanelProps> = ({
  newPoSupplier,
  setNewPoSupplier,
  newPoLines,
  setNewPoLines,
  handleCreatePurchaseOrder,
  purchaseOrders,
  receivePoId,
  setReceivePoId,
  receivePoLines,
  setReceivePoLines,
  handleReceivePO,
  handleApprovePO,
  handleSendPO,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <h3 className="form-section-title">Create Purchase Order (PO) Draft</h3>
      <form onSubmit={handleCreatePurchaseOrder}>
        <div className="form-group">
          <label>Supplier Name</label>
          <input type="text" value={newPoSupplier} onChange={(e) => setNewPoSupplier(e.target.value)} required placeholder="e.g. Acme Supplies Ltd." />
        </div>
        
        <div className="form-group">
          <label>Line Items</label>
          {newPoLines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="SKU" 
                value={line.sku} 
                onChange={(e) => {
                  const updated = [...newPoLines];
                  updated[idx].sku = e.target.value;
                  setNewPoLines(updated);
                }} 
                required 
              />
              <input 
                type="number" 
                placeholder="Qty" 
                value={line.quantity || ''} 
                onChange={(e) => {
                  const updated = [...newPoLines];
                  updated[idx].quantity = Number(e.target.value);
                  setNewPoLines(updated);
                }} 
                required 
              />
              <input 
                type="number" 
                placeholder="Unit Cost (Cents)" 
                value={line.unitCostCents || ''} 
                onChange={(e) => {
                  const updated = [...newPoLines];
                  updated[idx].unitCostCents = Number(e.target.value);
                  setNewPoLines(updated);
                }} 
                required 
              />
            </div>
          ))}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setNewPoLines([...newPoLines, { sku: '', quantity: 1, unitCostCents: 1000 }])}
          >
            + Add Item Row
          </button>
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Spinner /> : 'Draft Purchase Order'}
        </button>
      </form>

      {purchaseOrders.some(po => po.status === 'sent') && (
        <div style={{ marginTop: '2.5rem' }}>
          <h3 className="form-section-title">Receive Purchase Order Inventory</h3>
          <form onSubmit={handleReceivePO}>
            <div className="form-group">
              <label>Purchase Order ID</label>
              <select 
                value={receivePoId} 
                onChange={(e) => {
                  const id = e.target.value;
                  setReceivePoId(id);
                  const po = purchaseOrders.find(p => p.id === id);
                  if (po) {
                    setReceivePoLines(po.items.map((i: any) => ({ sku: i.sku, quantity: i.quantity })));
                  }
                }}
                required
              >
                <option value="">-- Select Active PO --</option>
                {purchaseOrders.filter(po => po.status === 'sent').map(po => (
                  <option key={po.id} value={po.id}>{po.id} ({po.supplier})</option>
                ))}
              </select>
            </div>

            {receivePoId && (
              <div className="form-group">
                <label>Receipt Quantities</label>
                {receivePoLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <span><code>{line.sku}</code></span>
                    <input 
                      type="number" 
                      value={line.quantity} 
                      onChange={(e) => {
                        const updated = [...receivePoLines];
                        updated[idx].quantity = Number(e.target.value);
                        setReceivePoLines(updated);
                      }}
                      required 
                    />
                  </div>
                ))}
              </div>
            )}

            <button type="submit" className="btn btn-accent" disabled={loading}>
              Fulfill PO & Receive Stock
            </button>
          </form>
        </div>
      )}
    </div>

    <div className="glass-panel">
      <h3 className="form-section-title">Purchase Order Registry</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>PO ID / Date</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Status & Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No Purchase Orders registered in local storage or backend.
                </td>
              </tr>
            ) : (
              purchaseOrders.map(po => (
                <tr key={po.id}>
                  <td>
                    <code>{po.id}</code>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted-dark)' }}>
                      {new Date(po.createdAt || new Date()).toLocaleDateString()}
                    </div>
                  </td>
                  <td><strong>{po.supplier}</strong></td>
                  <td>
                    {po.items.map((i: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.85rem' }}>
                        <code>{i.sku}</code>: x{i.quantity} (${((i.unitCostCents || 0) / 100).toFixed(2)})
                      </div>
                    ))}
                  </td>
                  <td>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span className={`badge badge-${po.status === 'draft' ? 'warning' : po.status === 'approved' ? 'info' : po.status === 'sent' ? 'primary' : 'success'}`}>
                        {po.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {po.status === 'draft' && (
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleApprovePO(po.id)}>
                          Approve
                        </button>
                      )}
                      {po.status === 'approved' && (
                        <button className="btn btn-accent" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSendPO(po.id)}>
                          Send PO
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// --- 11. WarehousePanel ---
interface WarehousePanelProps {
  wmsLocId: string;
  setWmsLocId: (v: string) => void;
  wmsWarehouseId: string;
  setWmsWarehouseId: (v: string) => void;
  wmsZone: string;
  setWmsZone: (v: string) => void;
  wmsMaxWeight: number;
  setWmsMaxWeight: (v: number) => void;
  wmsMaxVolume: number;
  setWmsMaxVolume: (v: number) => void;
  handleCreateWmsLocation: (e: React.FormEvent) => void;
  putawaySku: string;
  setPutawaySku: (v: string) => void;
  putawayQty: number;
  setPutawayQty: (v: number) => void;
  handleGetPutawaySuggestions: (e: React.FormEvent) => void;
  putawayResult: any[];
  wmsLocations: any[];
  handleDeleteWmsLocation: (id: string) => void;
  pickSkusInput: string;
  setPickSkusInput: (v: string) => void;
  handleOptimizePickRoute: (e: React.FormEvent) => void;
  pickRouteResult: string[];
  loading: boolean;
}
export const WarehousePanel: React.FC<WarehousePanelProps> = ({
  wmsLocId,
  setWmsLocId,
  wmsWarehouseId,
  setWmsWarehouseId,
  wmsZone,
  setWmsZone,
  wmsMaxWeight,
  setWmsMaxWeight,
  wmsMaxVolume,
  setWmsMaxVolume,
  handleCreateWmsLocation,
  putawaySku,
  setPutawaySku,
  putawayQty,
  setPutawayQty,
  handleGetPutawaySuggestions,
  putawayResult,
  wmsLocations,
  handleDeleteWmsLocation,
  pickSkusInput,
  setPickSkusInput,
  handleOptimizePickRoute,
  pickRouteResult,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <h3 className="form-section-title">Configure Warehouse Location Layout</h3>
      <form onSubmit={handleCreateWmsLocation}>
        <div className="form-group">
          <label>Location / Bin ID</label>
          <input type="text" value={wmsLocId} onChange={(e) => setWmsLocId(e.target.value)} required placeholder="e.g. LOC-CENTRAL" />
        </div>
        <div className="form-group">
          <label>Warehouse ID</label>
          <input type="text" value={wmsWarehouseId} onChange={(e) => setWmsWarehouseId(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Warehouse Zone</label>
          <input type="text" value={wmsZone} onChange={(e) => setWmsZone(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Max Weight Capacity (Grams)</label>
          <input type="number" value={wmsMaxWeight} onChange={(e) => setWmsMaxWeight(Number(e.target.value))} required />
        </div>
        <div className="form-group">
          <label>Max Volume Capacity (Cubic Meters)</label>
          <input type="number" step="0.01" value={wmsMaxVolume} onChange={(e) => setWmsMaxVolume(Number(e.target.value))} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          Configure Location
        </button>
      </form>

      <div style={{ marginTop: '2.5rem' }}>
        <h3 className="form-section-title">Get Putaway Recommendation</h3>
        <form onSubmit={handleGetPutawaySuggestions}>
          <div className="form-group">
            <label>Product SKU</label>
            <input type="text" value={putawaySku} onChange={(e) => setPutawaySku(e.target.value)} required placeholder="e.g. ROUTE-SKU" />
          </div>
          <div className="form-group">
            <label>Incoming Quantity</label>
            <input type="number" value={putawayQty} onChange={(e) => setPutawayQty(Number(e.target.value))} required />
          </div>
          <button type="submit" className="btn btn-accent" disabled={loading}>
            Suggest Bin Location
          </button>
        </form>

        {putawayResult.length > 0 && (
          <div style={{ marginTop: '1rem' }} className="alert-box alert-success">
            <strong>Suggested Bin:</strong> <code>{putawayResult[0].locationId}</code> (Fulfill: {putawayResult[0].suggestedQuantity} units)
          </div>
        )}
      </div>
    </div>

    <div className="glass-panel">
      <h3 className="form-section-title">Warehouse Location Registry</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Location ID</th>
              <th>Zone</th>
              <th>Max Weight</th>
              <th>Max Volume</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {wmsLocations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No warehouse locations configured.
                </td>
              </tr>
            ) : (
              wmsLocations.map(loc => (
                <tr key={loc.id}>
                  <td><code>{loc.id}</code></td>
                  <td><code>Zone {loc.zone}</code></td>
                  <td>{loc.maxWeightGrams}g</td>
                  <td>{loc.maxVolumeCubicMeters}m³</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteWmsLocation(loc.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <h3 className="form-section-title">WMS Picking Route Optimization</h3>
        <form onSubmit={handleOptimizePickRoute}>
          <div className="form-group">
            <label>List of SKUs to Pick (Comma separated)</label>
            <input type="text" value={pickSkusInput} onChange={(e) => setPickSkusInput(e.target.value)} required placeholder="ROUTE-SKU, CHARGER-WRLS-BLK" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            Generate Optimal Pick Sequence
          </button>
        </form>

        {pickRouteResult.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Suggested Sequencing Path</h4>
            <ol style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              {pickRouteResult.map((sku, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  Collect SKU: <strong><code>{sku}</code></strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- 12. WebhooksPanel ---
interface WebhooksPanelProps {
  webhookUrl: string;
  setWebhookUrl: (v: string) => void;
  webhookEvents: string[];
  setWebhookEvents: (v: string[]) => void;
  handleCreateWebhook: (e: React.FormEvent) => void;
  webhooks: any[];
  handleDeleteWebhook: (id: string) => void;
  webhookDeliveries: any[];
  loading: boolean;
}
export const WebhooksPanel: React.FC<WebhooksPanelProps> = ({
  webhookUrl,
  setWebhookUrl,
  webhookEvents,
  setWebhookEvents,
  handleCreateWebhook,
  webhooks,
  handleDeleteWebhook,
  webhookDeliveries,
  loading
}) => (
  <div className="grid-cols-2">
    <div className="glass-panel">
      <h3 className="form-section-title">Subscribe Outbound Webhook</h3>
      <form onSubmit={handleCreateWebhook}>
        <div className="form-group">
          <label>Target URL Endpoint</label>
          <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} required placeholder="https://api.thirdparty.com/webhook" />
        </div>
        <div className="form-group">
          <label>Event Subscriptions</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['StockReceived', 'StockDispatched', 'LowStockDetected', 'OnboardingSubmitted'].map(evt => (
              <label key={evt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                <input 
                  type="checkbox" 
                  checked={webhookEvents.includes(evt)} 
                  onChange={(e) => {
                    if (e.target.checked) {
                      setWebhookEvents([...webhookEvents, evt]);
                    } else {
                      setWebhookEvents(webhookEvents.filter(x => x !== evt));
                    }
                  }} 
                />
                <code>{evt}</code>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          Create Webhook Subscription
        </button>
      </form>

      <div style={{ marginTop: '2.5rem' }}>
        <h3 className="form-section-title">Webhook Subscriptions</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Webhook Target URL</th>
                <th>Subscribed Events</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active webhook subscriptions configured.
                  </td>
                </tr>
              ) : (
                webhooks.map(w => (
                  <tr key={w.id}>
                    <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>
                      <code>{w.url}</code>
                    </td>
                    <td>
                      {w.eventTypes.map((e: string) => (
                        <div key={e} style={{ fontSize: '0.85rem' }}><code>{e}</code></div>
                      ))}
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteWebhook(w.id)}>
                        Delete
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

    <div className="glass-panel">
      <h3 className="form-section-title">Webhook Delivery Retry Logs</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Status Code</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {webhookDeliveries.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No webhook deliveries recorded.
                </td>
              </tr>
            ) : (
              webhookDeliveries.map(log => (
                <tr key={log.id}>
                  <td><code>{log.eventName}</code></td>
                  <td>
                    <span className={`badge badge-${log.statusCode && log.statusCode >= 200 && log.statusCode < 300 ? 'success' : 'error'}`}>
                      {log.statusCode || log.status}
                    </span>
                  </td>
                  <td>{new Date(log.occurredOn || new Date()).toLocaleTimeString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
