import { useState, useEffect } from 'react';
import { useInventory, BackendType, Item, JournalLine, Tab, InventoryItem, Product, StockOnboarding, JournalEntry, ShopifyConnection, SerializedItem, ForecastingReportItem, User, AuditDiscrepancy, OutboxStats, OutboxEvent, TenantAccountingConfig, QuarantinedItem, ValuationItem } from './api/client';
import {
  DashboardPanel,
  ShopifyPanel,
  ProductsPanel,
  ScanningPanel,
  OnboardingPanel,
  LedgerPanel,
  SerialsPanel,
  ForecastingPanel,
  RoutingPanel,
  ProcurementPanel,
  WarehousePanel,
  WebhooksPanel
} from './components/Panels';

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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [onboardings, setOnboardings] = useState<StockOnboarding[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [shopifyConns, setShopifyConns] = useState<ShopifyConnection[]>([]);
  const [forecastingReport, setForecastingReport] = useState<ForecastingReportItem[]>([]);

  // --- Selection / Draft States ---
  const [selectedOnboarding, setSelectedOnboarding] = useState<StockOnboarding | null>(null);
  const [onboardingItems, setOnboardingItems] = useState<Item[]>([{ variantId: '', quantity: 0, unitCostCents: 0 }]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
  const [tracedItem, setTracedItem] = useState<SerializedItem | null>(null);

  const [newShopifyId, setNewShopifyId] = useState('');
  const [newShopifyDomain, setNewShopifyDomain] = useState('');
  const [newShopifyToken, setNewShopifyToken] = useState('');

  const [newJournalDesc, setNewJournalDesc] = useState('');
  const [newJournalMethod, setNewJournalMethod] = useState<'cash' | 'accrual'>('accrual');
  const [newJournalLines, setNewJournalLines] = useState<JournalLine[]>([
    { accountCode: '1000', amountCents: 0, type: 'debit', memo: '' },
    { accountCode: '2000', amountCents: 0, type: 'credit', memo: '' }
  ]);

  // --- Advanced Admin Features States ---
  const [routingSku, setRoutingSku] = useState('ROUTE-SKU');
  const [routingQuantity, setRoutingQuantity] = useState(12);
  const [routingAddress, setRoutingAddress] = useState('New York, NY 10001');
  const [routingStrategy, setRoutingStrategy] = useState('MINIMIZE_COST');
  const [routingPlan, setRoutingPlan] = useState<any | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [newPoSupplier, setNewPoSupplier] = useState('');
  const [newPoLines, setNewPoLines] = useState<{ sku: string; quantity: number; unitCostCents: number }[]>([
    { sku: '', quantity: 1, unitCostCents: 1000 }
  ]);
  const [receivePoId, setReceivePoId] = useState('');
  const [receivePoLines, setReceivePoLines] = useState<{ sku: string; quantity: number }[]>([]);

  const [wmsLocations, setWmsLocations] = useState<any[]>([]);
  const [wmsLocId, setWmsLocId] = useState('');
  const [wmsWarehouseId, setWmsWarehouseId] = useState('WH-CENTRAL');
  const [wmsZone, setWmsZone] = useState('A');
  const [wmsMaxWeight, setWmsMaxWeight] = useState(50000);
  const [wmsMaxVolume, setWmsMaxVolume] = useState(10.0);
  const [putawaySku, setPutawaySku] = useState('');
  const [putawayQty, setPutawayQty] = useState(10);
  const [putawayResult, setPutawayResult] = useState<any[]>([]);
  const [pickSkusInput, setPickSkusInput] = useState('');
  const [pickRouteResult, setPickRouteResult] = useState<string[]>([]);

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['StockReceived']);
  const [webhookDeliveries, setWebhookDeliveries] = useState<any[]>([]);
  
  const [fefoSku, setFefoSku] = useState('');
  const [fefoQty, setFefoQty] = useState(5);
  const [fefoResult, setFefoResult] = useState<any[]>([]);
  const [recallLotNum, setRecallLotNum] = useState('');
  const [recallResult, setRecallResult] = useState<any | null>(null);
  
  const [reorderPolicies, setReorderPolicies] = useState<any[]>([]);
  const [policySku, setPolicySku] = useState('');
  const [policyLoc, setPolicyLoc] = useState('');
  const [policyRop, setPolicyRop] = useState(10);
  const [policySafety, setPolicySafety] = useState(5);
  const [policyEoq, setPolicyEoq] = useState(25);

  // --- Admin Portal States ---
  const [adminActiveSubTab, setAdminActiveSubTab] = useState<'users' | 'audits' | 'outbox' | 'tenantConfig' | 'kits' | 'quarantine' | 'valuation'>('users');
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('warehouse_operator');
  const [invitedUser, setInvitedUser] = useState<{ userId: string; temporaryPassword?: string } | null>(null);

  const [discrepancies, setDiscrepancies] = useState<AuditDiscrepancy[]>([]);
  const [discrepancyNotes, setDiscrepancyNotes] = useState<Record<string, string>>({});

  const [outboxStats, setOutboxStats] = useState<OutboxStats>({ pendingCount: 0, publishedCount: 0, failedCount: 0 });
  const [deadLetterEvents, setDeadLetterEvents] = useState<OutboxEvent[]>([]);

  const [tenantConfig, setTenantConfig] = useState<TenantAccountingConfig | null>(null);
  const [configAccountingMethod, setConfigAccountingMethod] = useState<'CASH' | 'ACCRUAL' | 'cash' | 'accrual'>('ACCRUAL');
  const [configCostingMethod, setConfigCostingMethod] = useState<'FIFO' | 'LIFO' | 'WAC' | 'fifo' | 'lifo' | 'wac'>('FIFO');

  const [kitSku, setKitSku] = useState('');
  const [kitQty, setKitQty] = useState(1);
  const [kitLocationId, setKitLocationId] = useState('LOC-A1');
  const [kitRef, setKitRef] = useState('');

  const [quarantinedItems, setQuarantinedItems] = useState<QuarantinedItem[]>([]);
  const [quarantineResolutions, setQuarantineResolutions] = useState<Record<string, string>>({});

  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([]);
  const [valuationCostingMethod, setValuationCostingMethod] = useState<string>('FIFO');

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
      allowedTabs.push('onboarding', 'products', 'scanning', 'ledger', 'serials', 'shopify', 'forecasting', 'routing', 'procurement', 'warehouse', 'webhooks');
    } else if (role === 'warehouse_operator') {
      allowedTabs.push('products', 'scanning', 'serials', 'forecasting', 'warehouse', 'procurement');
    } else if (role === 'accountant') {
      allowedTabs.push('onboarding', 'products', 'ledger', 'forecasting', 'procurement');
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

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const data = await client.getPurchaseOrders(tenantId);
      setPurchaseOrders(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load Purchase Orders.' });
    } finally {
      setLoading(false);
    }
  };

  const loadWmsLocations = async () => {
    setLoading(true);
    try {
      const data = await client.getWarehouseLocations(tenantId);
      setWmsLocations(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load WMS locations.' });
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const subs = await client.getWebhooks(tenantId);
      setWebhooks(subs || []);
      const logs = await client.getWebhookDeliveries(tenantId);
      setWebhookDeliveries(logs || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load Webhook configurations.' });
    } finally {
      setLoading(false);
    }
  };

  const loadReorderPolicies = async () => {
    setLoading(true);
    try {
      const data = await client.getReorderPolicies(tenantId);
      setReorderPolicies(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load Reorder Policies.' });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async (subTab?: string) => {
    const tabToLoad = subTab || adminActiveSubTab;
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      if (tabToLoad === 'users') {
        const u = await client.getUsers(tenantId);
        setAdminUsers(u);
      } else if (tabToLoad === 'audits') {
        const d = await client.getDiscrepancies(tenantId);
        setDiscrepancies(d);
      } else if (tabToLoad === 'outbox') {
        const stats = await client.getOutboxStats();
        setOutboxStats(stats);
        const DL = await client.getDeadLetterEvents(100);
        setDeadLetterEvents(DL);
      } else if (tabToLoad === 'tenantConfig') {
        const config = await client.getTenantConfig(tenantId);
        setTenantConfig(config);
        if (config) {
          setConfigAccountingMethod(config.accountingMethod);
          setConfigCostingMethod(config.costingMethod);
        }
      } else if (tabToLoad === 'quarantine') {
        const q = await client.getQuarantinedItems(tenantId);
        setQuarantinedItems(q);
      } else if (tabToLoad === 'valuation') {
        const method = valuationCostingMethod || 'FIFO';
        const v = await client.getValuationReport(tenantId, undefined, method);
        setValuationItems(v);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load administrative data.' });
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
      loadReorderPolicies();
    } else if (activeTab === 'routing') {
      loadDashboardData();
    } else if (activeTab === 'procurement') {
      loadDashboardData();
      loadPurchaseOrders();
    } else if (activeTab === 'warehouse') {
      loadDashboardData();
      loadWmsLocations();
    } else if (activeTab === 'webhooks') {
      loadWebhooks();
    } else if (activeTab === 'admin') {
      loadAdminData();
    }
  }, [activeTab, tenantId, token]);

  // Keep admin subtab synced
  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminData();
    }
  }, [adminActiveSubTab, valuationCostingMethod]);

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

  // --- Advanced Operations Responders ---

  const handleComputeRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoutingPlan(null);
    try {
      const plan = await client.routeOrder(routingSku, Number(routingQuantity), routingAddress, routingStrategy);
      setRoutingPlan(plan);
      setMessage({ type: 'success', text: 'Order routing optimization completed successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Routing failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const activeItems = newPoLines.filter(item => item.sku !== '' && item.quantity > 0);
      await client.createPurchaseOrder(tenantId, newPoSupplier, activeItems);
      setMessage({ type: 'success', text: `Purchase Order draft created for ${newPoSupplier}.` });
      setNewPoSupplier('');
      setNewPoLines([{ sku: '', quantity: 1, unitCostCents: 1000 }]);
      loadPurchaseOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create Purchase Order.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePO = async (id: string) => {
    setLoading(true);
    try {
      await client.approvePurchaseOrder(tenantId, id);
      setMessage({ type: 'success', text: `Purchase Order ${id} approved.` });
      loadPurchaseOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Approval failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPO = async (id: string) => {
    setLoading(true);
    try {
      await client.sendPurchaseOrder(tenantId, id);
      setMessage({ type: 'success', text: `Purchase Order ${id} sent to supplier.` });
      loadPurchaseOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sending PO failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const activeItems = receivePoLines.filter(item => item.quantity > 0);
      await client.receivePurchaseOrder(tenantId, receivePoId, activeItems);
      setMessage({ type: 'success', text: `Successfully received items for PO ${receivePoId}.` });
      setReceivePoId('');
      setReceivePoLines([]);
      loadPurchaseOrders();
      loadDashboardData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Receiving PO items failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWmsLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.saveWarehouseLocation(tenantId, {
        id: wmsLocId,
        warehouseId: wmsWarehouseId,
        zone: wmsZone,
        maxWeightGrams: Number(wmsMaxWeight),
        maxVolumeCubicMeters: Number(wmsMaxVolume)
      });
      setMessage({ type: 'success', text: `Warehouse location ${wmsLocId} configured.` });
      setWmsLocId('');
      loadWmsLocations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Saving WMS location failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWmsLocation = async (id: string) => {
    setLoading(true);
    try {
      await client.deleteWarehouseLocation(tenantId, id);
      setMessage({ type: 'success', text: `Warehouse location ${id} deleted.` });
      loadWmsLocations();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Deleting WMS location failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetPutawaySuggestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await client.getPutawaySuggestions(tenantId, putawaySku, Number(putawayQty));
      setPutawayResult(data || []);
      setMessage({ type: 'success', text: 'Putaway recommendation generated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to suggest putaway.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizePickRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const skus = pickSkusInput.split(',').map(s => s.trim()).filter(s => s !== '');
      const data = await client.getOptimizedPickRoute(tenantId, skus);
      setPickRouteResult(data || []);
      setMessage({ type: 'success', text: 'Pick path optimization completed.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Pick path optimization failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.createWebhook(tenantId, webhookUrl, webhookEvents);
      setMessage({ type: 'success', text: `Webhook subscription created for ${webhookUrl}` });
      setWebhookUrl('');
      loadWebhooks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to subscribe webhook.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setLoading(true);
    try {
      await client.deleteWebhook(tenantId, id);
      setMessage({ type: 'success', text: `Webhook subscription ${id} deleted.` });
      loadWebhooks();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to unsubscribe webhook.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReorderPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await client.saveReorderPolicy(tenantId, {
        sku: policySku,
        locationId: policyLoc,
        reorderPoint: Number(policyRop),
        safetyStock: Number(policySafety),
        economicOrderQuantity: Number(policyEoq)
      });
      setMessage({ type: 'success', text: `ROP/EOQ policy for SKU ${policySku} saved.` });
      setPolicySku('');
      setPolicyLoc('');
      loadReorderPolicies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save reorder policy.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateReorderPolicies = async () => {
    setLoading(true);
    try {
      await client.evaluateReorderPolicies(tenantId);
      setMessage({ type: 'success', text: 'Dynamic ROP recalculations and safety checks completed!' });
      loadForecastingReport();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'ROP evaluation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGetFefoSuggestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await client.getFefoPickSuggestions(tenantId, fefoSku, Number(fefoQty));
      setFefoResult(data || []);
      setMessage({ type: 'success', text: 'FEFO pick recommendations loaded.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'FEFO calculation failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTraceRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await client.traceRecall(tenantId, recallLotNum);
      setRecallResult(data);
      setMessage({ type: 'success', text: 'Recall trace report compiled.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Recall tracing failed.' });
    } finally {
      setLoading(false);
    }
  };

  // --- Admin Portal Handlers ---
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setInvitedUser(null);
    try {
      const res = await client.inviteUser(tenantId, newUserEmail, newUserRole);
      setInvitedUser({ userId: res.userId, temporaryPassword: res.temporaryPassword });
      setMessage({ type: 'success', text: `Successfully invited user ${newUserEmail}.` });
      setNewUserEmail('');
      loadAdminData('users');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to invite user.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (uId: string, uRole: string) => {
    setLoading(true);
    setMessage(null);
    try {
      await client.updateUserRole(tenantId, uId, uRole);
      setMessage({ type: 'success', text: `Successfully updated user role to ${uRole}.` });
      loadAdminData('users');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update user role.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await client.runAudit(tenantId);
      const text = res 
        ? `Audit completed successfully. Shopify discrepancies: ${res.shopifyDiscrepancies || 0}, Accounting discrepancies: ${res.accountingDiscrepancies || 0}.`
        : 'Audit triggered/completed successfully.';
      setMessage({ type: 'success', text });
      loadAdminData('audits');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to trigger audit.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDiscrepancy = async (id: string) => {
    const notes = discrepancyNotes[id] || 'Resolved via Admin Console.';
    setLoading(true);
    setMessage(null);
    try {
      await client.resolveDiscrepancy(tenantId, id, notes);
      setMessage({ type: 'success', text: 'Discrepancy resolved successfully.' });
      setDiscrepancyNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      loadAdminData('audits');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to resolve discrepancy.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryOutboxEvent = async (id: string) => {
    setLoading(true);
    setMessage(null);
    try {
      await client.retryOutboxEvent(id);
      setMessage({ type: 'success', text: 'Outbox event retried successfully.' });
      loadAdminData('outbox');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to retry outbox event.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTenantConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await client.saveTenantConfig(tenantId, {
        accountingMethod: configAccountingMethod,
        costingMethod: configCostingMethod
      });
      setMessage({ type: 'success', text: 'Tenant accounting configuration updated.' });
      loadAdminData('tenantConfig');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save tenant config.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssembleKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitSku) {
      setMessage({ type: 'error', text: 'Please input a kit SKU.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const ref = kitRef || `KIT-ASM-${Date.now()}`;
      await client.assembleKit(tenantId, kitLocationId, kitSku, Number(kitQty), actorId, ref);
      setMessage({ type: 'success', text: `Successfully assembled ${kitQty} units of Kit ${kitSku}.` });
      setKitSku('');
      setKitRef('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to assemble kit.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisassembleKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitSku) {
      setMessage({ type: 'error', text: 'Please input a kit SKU.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const ref = kitRef || `KIT-DIS-${Date.now()}`;
      await client.disassembleKit(tenantId, kitLocationId, kitSku, Number(kitQty), actorId, ref);
      setMessage({ type: 'success', text: `Successfully disassembled ${kitQty} units of Kit ${kitSku}.` });
      setKitSku('');
      setKitRef('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disassemble kit.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveQuarantine = async (id: string) => {
    const res = quarantineResolutions[id] || 'RELEASED';
    setLoading(true);
    setMessage(null);
    try {
      await client.resolveQuarantine(tenantId, id, res);
      setMessage({ type: 'success', text: `Quarantine item ${id} resolved with status: ${res}.` });
      setQuarantineResolutions(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      loadAdminData('quarantine');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to resolve quarantine.' });
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
            {role === 'admin' && (
              <div className={`nav-link ${activeTab === 'routing' ? 'active' : ''}`} onClick={() => setActiveTab('routing')}>
                🚚 Order Routing
              </div>
            )}
            {(role === 'admin' || role === 'warehouse_operator' || role === 'accountant') && (
              <div className={`nav-link ${activeTab === 'procurement' ? 'active' : ''}`} onClick={() => setActiveTab('procurement')}>
                🛒 Purchase Orders
              </div>
            )}
            {(role === 'admin' || role === 'warehouse_operator') && (
              <div className={`nav-link ${activeTab === 'warehouse' ? 'active' : ''}`} onClick={() => setActiveTab('warehouse')}>
                🏢 Warehouse Layout
              </div>
            )}
            {role === 'admin' && (
              <div className={`nav-link ${activeTab === 'webhooks' ? 'active' : ''}`} onClick={() => setActiveTab('webhooks')}>
                🔗 Webhook Logs
              </div>
            )}
            {role === 'admin' && (
              <div className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                🛠️ Admin Portal
              </div>
            )}
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

        {activeTab === 'routing' && (
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
        )}

        {activeTab === 'procurement' && (
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
        )}

        {activeTab === 'warehouse' && (
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
        )}

        {activeTab === 'webhooks' && (
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
        )}

        {activeTab === 'admin' && (
          <div className="admin-portal-container">
            {/* Horizontal Sub-tabs */}
            <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <div className="tabs-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <button className={`btn ${adminActiveSubTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('users')}>
                  👥 Users & RBAC
                </button>
                <button className={`btn ${adminActiveSubTab === 'audits' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('audits')}>
                  🔍 Audits & Discrepancies
                </button>
                <button className={`btn ${adminActiveSubTab === 'outbox' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('outbox')}>
                  ⚡ Outbox Monitor
                </button>
                <button className={`btn ${adminActiveSubTab === 'tenantConfig' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('tenantConfig')}>
                  ⚙️ Tenant Configuration
                </button>
                <button className={`btn ${adminActiveSubTab === 'kits' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('kits')}>
                  📦 Kitting Desk
                </button>
                <button className={`btn ${adminActiveSubTab === 'quarantine' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('quarantine')}>
                  ⚠️ Quarantine Locker
                </button>
                <button className={`btn ${adminActiveSubTab === 'valuation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminActiveSubTab('valuation')}>
                  📈 Financial Valuation
                </button>
              </div>
            </div>

            {/* Sub-tab Panels */}
            {adminActiveSubTab === 'users' && (
              <div className="grid-cols-2">
                <div className="glass-panel">
                  <h3 className="form-section-title">Invite New Team Member</h3>
                  <form onSubmit={handleInviteUser}>
                    <div className="form-group">
                      <label>User Email Address</label>
                      <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required placeholder="user@company.com" />
                    </div>
                    <div className="form-group">
                      <label>Assign Security Role</label>
                      <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                        <option value="admin">Administrator (Full Access)</option>
                        <option value="warehouse_operator">Warehouse Operator (Ops Only)</option>
                        <option value="accountant">Accountant (Ledger & Valuation)</option>
                        <option value="viewer">System Observer (Read Only)</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      Invite Member
                    </button>
                  </form>

                  {invitedUser && (
                    <div className="alert-box alert-success" style={{ marginTop: '1.5rem' }}>
                      <strong>User Invitation Code Generated:</strong>
                      <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        ID: {invitedUser.userId}<br />
                        Temporary Key: {invitedUser.temporaryPassword || 'Simulated successfully.'}
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
                        Share this security key with the user for their initial authorization.
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-panel">
                  <h3 className="form-section-title">Active User Directory</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>User ID / Name</th>
                          <th>Email</th>
                          <th>Security Role</th>
                          <th>Role Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              No additional organization members registered.
                            </td>
                          </tr>
                        ) : (
                          adminUsers.map(u => (
                            <tr key={u.id}>
                              <td><code>{u.name || u.id.split('-')[0]}</code></td>
                              <td>{u.email}</td>
                              <td>
                                <span className={`badge badge-${u.role === 'admin' ? 'success' : u.role === 'accountant' ? 'info' : 'warning'}`}>
                                  {u.role.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <select 
                                  value={u.role} 
                                  onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                                  style={{ padding: '0.2rem', fontSize: '0.85rem' }}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="warehouse_operator">Warehouse Operator</option>
                                  <option value="accountant">Accountant</option>
                                  <option value="viewer">Observer</option>
                                </select>
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

            {adminActiveSubTab === 'audits' && (
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 className="form-section-title" style={{ margin: 0 }}>Reconciliation & Inventory Auditing</h3>
                  <button className="btn btn-primary" onClick={handleRunAudit} disabled={loading}>
                    ⚡ Run Reconciliation Audit
                  </button>
                </div>
                <p style={{ marginBottom: '1.5rem', opacity: 0.85, fontSize: '0.9rem' }}>
                  Running the audit triggers event reconciliation, checks outbox health, and aligns Shopify records with internal database levels. Detected discrepancies will be listed below.
                </p>

                <h3 className="form-section-title">Detected Discrepancies Log</h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>SKU</th>
                        <th>Location</th>
                        <th>Expected</th>
                        <th>Actual Count</th>
                        <th>Discrepancy</th>
                        <th>Status</th>
                        <th>Resolution Notes</th>
                        <th>Reconcile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancies.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No active discrepancies. Everything is in sync!
                          </td>
                        </tr>
                      ) : (
                        discrepancies.map(d => (
                          <tr key={d.id}>
                            <td><code>{d.id.split('-')[0]}</code></td>
                            <td><code>{d.sku}</code></td>
                            <td><code>{d.locationId}</code></td>
                            <td>{d.expectedQuantity}</td>
                            <td>{d.actualQuantity}</td>
                            <td>
                              <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>
                                {d.discrepancyCount}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${d.status.toLowerCase() === 'resolved' || d.status === 'RESOLVED' ? 'success' : 'error'}`}>
                                {d.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {d.status.toLowerCase() === 'resolved' || d.status === 'RESOLVED' ? (
                                <em>Resolved</em>
                              ) : (
                                <input 
                                  type="text" 
                                  value={discrepancyNotes[d.id] || ''} 
                                  onChange={(e) => setDiscrepancyNotes({ ...discrepancyNotes, [d.id]: e.target.value })} 
                                  placeholder="Notes for resolution..." 
                                  style={{ padding: '0.25rem', fontSize: '0.85rem', width: '100%', minWidth: '150px' }}
                                />
                              )}
                            </td>
                            <td>
                              {d.status.toLowerCase() === 'resolved' || d.status === 'RESOLVED' ? (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              ) : (
                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleResolveDiscrepancy(d.id)}>
                                  Resolve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveSubTab === 'outbox' && (
              <div className="grid-cols-3" style={{ gridTemplateColumns: '1fr 2fr', display: 'grid', gap: '1.5rem' }}>
                <div className="glass-panel">
                  <h3 className="form-section-title">Message Broker Outbox Stats</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Pending Events</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-orange)' }}>{outboxStats.pendingCount}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Processed Events</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>{outboxStats.publishedCount}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Failed Dead-Letters</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-red)' }}>{outboxStats.failedCount}</div>
                    </div>
                  </div>
                </div>

                <div className="glass-panel">
                  <h3 className="form-section-title">Dead Letter Queue & Event Retries</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Event ID</th>
                          <th>Event Type</th>
                          <th>Error Message</th>
                          <th>Time</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deadLetterEvents.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              No dead-lettered events recorded. Event stream is healthy!
                            </td>
                          </tr>
                        ) : (
                          deadLetterEvents.map(e => (
                            <tr key={e.id}>
                              <td><code>{e.id.split('-')[0]}</code></td>
                              <td><code>{e.eventType}</code></td>
                              <td style={{ maxWidth: '200px', wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--accent-red)' }}>
                                {e.error || 'Message retry execution failure.'}
                              </td>
                              <td>{new Date(e.occurredAt).toLocaleTimeString()}</td>
                              <td>
                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleRetryOutboxEvent(e.id)}>
                                  Retry Event
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

            {adminActiveSubTab === 'tenantConfig' && (
              <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 className="form-section-title">Global Organization Accounting Setup</h3>
                <form onSubmit={handleSaveTenantConfig}>
                  <div className="form-group">
                    <label>Accounting Reporting Method</label>
                    <select 
                      value={configAccountingMethod} 
                      onChange={(e) => setConfigAccountingMethod(e.target.value as any)}
                    >
                      <option value="ACCRUAL">Accrual Accounting (Match costs to matching revenues)</option>
                      <option value="CASH">Cash Accounting (Record when payments complete)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Inventory Costing Flow Assumption Strategy</label>
                    <select 
                      value={configCostingMethod} 
                      onChange={(e) => setConfigCostingMethod(e.target.value as any)}
                    >
                      <option value="FIFO">FIFO (First-In, First-Out)</option>
                      <option value="LIFO">LIFO (Last-In, First-Out)</option>
                      <option value="WAC">Weighted Average Cost (WAC)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Default Currency</label>
                    <input type="text" value={tenantConfig?.currencyCode || 'USD'} disabled style={{ opacity: 0.6 }} />
                  </div>

                  <div className="form-group">
                    <label>Fiscal Year Start Date (MM-DD)</label>
                    <input type="text" value={tenantConfig?.fiscalYearStart || '01-01'} disabled style={{ opacity: 0.6 }} />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
                    Save Accounting Policy Configurations
                  </button>
                </form>
              </div>
            )}

            {adminActiveSubTab === 'kits' && (
              <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 className="form-section-title">Kit Assembly / Disassembly Desk</h3>
                <p style={{ marginBottom: '1.5rem', opacity: 0.85, fontSize: '0.9rem' }}>
                  Assemble bundled SKUs from component inventory layers or break a kit down back into individual parts.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Kit SKU Identifier</label>
                    <input type="text" value={kitSku} onChange={(e) => setKitSku(e.target.value)} required placeholder="e.g. BUNDLE-IPHONE" />
                  </div>

                  <div className="form-group">
                    <label>Warehouse Location</label>
                    <select value={kitLocationId} onChange={(e) => setKitLocationId(e.target.value)}>
                      <option value="LOC-A1">LOC-A1 (Central Shelf)</option>
                      <option value="LOC-EAST">LOC-EAST (East Rack)</option>
                      <option value="LOC-WEST">LOC-WEST (West Aisle)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity of Kits to Process</label>
                    <input type="number" value={kitQty} onChange={(e) => setKitQty(Math.max(1, Number(e.target.value)))} required min={1} />
                  </div>

                  <div className="form-group">
                    <label>Transaction Reference (Optional)</label>
                    <input type="text" value={kitRef} onChange={(e) => setKitRef(e.target.value)} placeholder="Auto-generated if empty" />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleAssembleKit} disabled={loading}>
                      🛠️ Assemble Kit
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDisassembleKit} disabled={loading}>
                      💥 Disassemble Kit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {adminActiveSubTab === 'quarantine' && (
              <div className="glass-panel">
                <h3 className="form-section-title">Quarantine Locker (Isolated Returns / Damage)</h3>
                <p style={{ marginBottom: '1.5rem', opacity: 0.85, fontSize: '0.9rem' }}>
                  Items failed during quality verification audits or damaged returns are isolated here. Admins can choose to release them back to inventory or reject/discard them permanently.
                </p>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Batch ID</th>
                        <th>SKU</th>
                        <th>Location</th>
                        <th>Quarantined Qty</th>
                        <th>Isolation Reason</th>
                        <th>Status</th>
                        <th>Resolution Path</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarantinedItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No quarantined items isolated. Excellent warehouse quality controls!
                          </td>
                        </tr>
                      ) : (
                        quarantinedItems.map(q => (
                          <tr key={q.id}>
                            <td><code>{q.id.split('-')[0]}</code></td>
                            <td><code>{q.sku}</code></td>
                            <td><code>{q.locationId}</code></td>
                            <td>{q.quantity}</td>
                            <td>{q.reason}</td>
                            <td>
                              <span className="badge badge-warning">
                                {q.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <select 
                                value={quarantineResolutions[q.id] || 'RELEASED'} 
                                onChange={(e) => setQuarantineResolutions({ ...quarantineResolutions, [q.id]: e.target.value })}
                                style={{ padding: '0.2rem', fontSize: '0.85rem' }}
                              >
                                <option value="RELEASED">Release to General Stock (Reconcile)</option>
                                <option value="REJECTED">Reject / Discard Batch (Write-Off)</option>
                              </select>
                            </td>
                            <td>
                              <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleResolveQuarantine(q.id)}>
                                Submit Resolve
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminActiveSubTab === 'valuation' && (
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 className="form-section-title" style={{ margin: 0 }}>Asset Valuation Breakdown</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Costing Method:</label>
                    <select 
                      value={valuationCostingMethod} 
                      onChange={(e) => setValuationCostingMethod(e.target.value)}
                      style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                    >
                      <option value="FIFO">FIFO (First-In, First-Out)</option>
                      <option value="LIFO">LIFO (Last-In, First-Out)</option>
                      <option value="WAC">WAC (Weighted Average)</option>
                    </select>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Variant ID</th>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Costing Assumption</th>
                        <th>Quantity on Hand</th>
                        <th>Estimated Unit Cost</th>
                        <th>Total Asset Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuationItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            No active asset lines recorded.
                          </td>
                        </tr>
                      ) : (
                        valuationItems.map(v => (
                          <tr key={v.variantId}>
                            <td><code>{v.variantId.split('-')[0]}</code></td>
                            <td><code>{v.sku}</code></td>
                            <td>{v.name}</td>
                            <td>
                              <span className="badge badge-info">
                                {v.costingMethod}
                              </span>
                            </td>
                            <td>{v.totalQuantity}</td>
                            <td>${(v.unitCostCents / 100).toFixed(2)}</td>
                            <td>
                              <strong>${(v.totalValueCents / 100).toFixed(2)}</strong>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
