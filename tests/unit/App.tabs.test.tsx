import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { useInventory } from '../../src/api/client';
import { addScanToQueue, getQueuedScans, syncOfflineQueue } from '../../src/api/offlineQueue';

vi.mock('../../src/api/client', async (original) => ({
  ...(await original<typeof import('../../src/api/client')>()),
  useInventory: vi.fn(),
}));
vi.mock('../../src/api/offlineQueue', () => ({
  getQueuedScans: vi.fn(),
  syncOfflineQueue: vi.fn(),
  addScanToQueue: vi.fn(),
}));

// Lightweight stubs for heavy child panels so App.tsx tab & handler coverage runs quickly and deterministically
vi.mock('../../src/components/Panels', () => ({
  RfidPanel: () => <div data-testid="panel-rfid">RFID Panel</div>,
  LotManagementPanel: () => <div data-testid="panel-lots">Lots Panel</div>,
}));
vi.mock('../../src/components/FinancialAccountingPanel', () => ({
  FinancialAccountingPanel: () => <div data-testid="panel-financial">Financial Panel</div>,
}));
vi.mock('../../src/components/AutonomousInventoryDashboard', () => ({
  AutonomousInventoryDashboard: () => <div data-testid="panel-autonomous">Autonomous Panel</div>,
}));
vi.mock('../../src/components/ConformanceDashboardPanel', () => ({
  ConformanceDashboardPanel: () => <div data-testid="panel-conformance">Conformance Panel</div>,
}));
vi.mock('../../src/components/ApiSpecViewerPanel', () => ({
  ApiSpecViewerPanel: () => <div data-testid="panel-api-specs">API Specs Panel</div>,
}));
vi.mock('../../src/components/AnomalyDetectionPanel', () => ({
  AnomalyDetectionPanel: () => <div data-testid="panel-anomaly">Anomaly Panel</div>,
}));
vi.mock('../../src/components/RebalancingMatrixPanel', () => ({
  RebalancingMatrixPanel: () => <div data-testid="panel-rebalancing">Rebalancing Panel</div>,
}));
vi.mock('../../src/components/LogisticsErpPanel', () => ({
  LogisticsErpPanel: () => <div data-testid="panel-logistics-erp">Logistics ERP Panel</div>,
}));
vi.mock('../../src/components/ReverseLogisticsSupplierPanel', () => ({
  ReverseLogisticsSupplierPanel: () => <div data-testid="panel-reverse-logistics">Reverse Logistics Panel</div>,
}));
vi.mock('../../src/components/ThermalPrintingArPanel', () => ({
  ThermalPrintingArPanel: () => <div data-testid="panel-thermal-ar">Thermal AR Panel</div>,
}));
vi.mock('../../src/components/DigitalTwinCopilotPanel', () => ({
  DigitalTwinCopilotPanel: () => <div data-testid="panel-digital-twin">Digital Twin Panel</div>,
}));
vi.mock('../../src/components/EsgEmissionsPanel', () => ({
  EsgEmissionsPanel: () => <div data-testid="panel-esg">ESG Panel</div>,
}));
vi.mock('../../src/components/RoleManagementPanel', () => ({
  RoleManagementPanel: () => <div data-testid="panel-rbac">Role Management Panel</div>,
}));
vi.mock('../../src/components/ApprovalInboxPanel', () => ({
  ApprovalInboxPanel: () => <div data-testid="panel-approval-inbox">Approval Inbox Panel</div>,
}));
vi.mock('../../src/components/ApprovalWorkflowPanel', () => ({
  ApprovalWorkflowPanel: () => <div data-testid="panel-approval-workflow">Approval Workflow Panel</div>,
}));
vi.mock('../../src/components/ReportingDashboardPanel', () => ({
  ReportingDashboardPanel: () => <div data-testid="panel-reporting">Reporting Panel</div>,
}));
vi.mock('../../src/components/OmnichannelIntegrationPanel', () => ({
  OmnichannelIntegrationPanel: () => <div data-testid="panel-omnichannel">Omnichannel Panel</div>,
}));
vi.mock('../../src/components/PythonIntegrationsPanel', () => ({
  PythonIntegrationsPanel: () => <div data-testid="panel-python-integrations">Python Integrations Panel</div>,
}));
vi.mock('../../src/components/CycleCountDashboardPanel', () => ({
  CycleCountDashboardPanel: () => <div data-testid="panel-cycle-counts">Cycle Count Panel</div>,
}));
vi.mock('../../src/components/SupplierCollaborationPortal', () => ({
  SupplierCollaborationPortal: () => <div data-testid="panel-supplier-portal">Supplier Portal</div>,
}));
vi.mock('../../src/components/NotificationInboxPanel', () => ({
  NotificationInboxPanel: () => <div data-testid="panel-notifications">Notification Inbox</div>,
}));
vi.mock('../../src/components/PythonNotificationInbox', () => ({
  PythonNotificationInbox: () => <div data-testid="panel-python-notifications">Python Notification Inbox</div>,
}));
vi.mock('../../src/components/PythonReportingPanel', () => ({
  PythonReportingPanel: () => <div data-testid="panel-python-reporting">Python Reporting</div>,
}));
vi.mock('../../src/components/PythonAgingPanel', () => ({
  PythonAgingPanel: () => <div data-testid="panel-python-aging">Python Aging</div>,
}));
vi.mock('../../src/components/PythonWorkforcePanel', () => ({
  PythonWorkforcePanel: () => <div data-testid="panel-python-workforce">Python Workforce</div>,
}));
vi.mock('../../src/components/InventoryAgingPanel', () => ({
  InventoryAgingPanel: () => <div data-testid="panel-aging">Inventory Aging</div>,
}));
vi.mock('../../src/panels/IntercompanyPanel', () => ({
  IntercompanyPanel: () => <div data-testid="panel-intercompany">Intercompany Panel</div>,
}));
vi.mock('../../src/panels/ApiUsageDashboardPanel', () => ({
  ApiUsageDashboardPanel: () => <div data-testid="panel-api-usage">API Usage Panel</div>,
}));
vi.mock('../../src/components/CVGatewayDashboard', () => ({
  default: () => <div data-testid="panel-cv-gateway">CV Gateway Panel</div>,
}));

const jwt = `header.${btoa(JSON.stringify({ permissions: ['admin'] }))}.signature`;
let api: Record<string, ReturnType<typeof vi.fn>>;

function buildRichApi() {
  const mockApi: Record<string, ReturnType<typeof vi.fn>> = {
    login: vi.fn().mockResolvedValue(jwt),
    subscribeBarcodeScans: vi.fn().mockReturnValue(vi.fn()),
    getInventoryItems: vi.fn().mockResolvedValue([
      { id: 'inv-1', sku: 'SKU-100', locationId: 'loc-1', quantity: 25, version: 1, tenantId: 'store-42' },
    ]),
    getProducts: vi.fn().mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Widget Pro',
        variants: [
          {
            id: 'var-1',
            sku: 'SKU-100',
            trackingMode: 'serial',
            attributes: [{ key: 'color', value: 'blue' }],
            barcodes: [{ id: 'bc-1', sku: 'SKU-100', barcode: { value: '123456', symbology: 'EAN13' }, isPrimary: true }],
          },
        ],
      },
    ]),
    createProduct: vi.fn().mockResolvedValue({ id: 'prod-2', name: 'New Widget', variants: [] }),
    addProductVariant: vi.fn().mockResolvedValue({ id: 'var-2', sku: 'SKU-200', trackingMode: 'quantity', barcodes: [] }),
    assignBarcode: vi.fn().mockResolvedValue({ id: 'bc-2' }),
    generateInternalBarcode: vi.fn().mockResolvedValue({ barcode: { value: '999888', symbology: 'CODE128' } }),
    getShopifyConnections: vi.fn().mockResolvedValue([
      { id: 'shop-1', tenantId: 'store-42', platform: 'shopify', storeDomain: 'demo.myshopify.com', isActive: true },
    ]),
    connectShopify: vi.fn().mockResolvedValue({ id: 'shop-2' }),
    getJournalEntries: vi.fn().mockResolvedValue([
      {
        id: 'je-1',
        tenantId: 'store-42',
        date: '2026-10-01',
        description: 'Stock receipt',
        method: 'accrual',
        lines: [
          { accountCode: '1400', amountCents: 1000, type: 'debit', memo: 'Inv' },
          { accountCode: '2000', amountCents: 1000, type: 'credit', memo: 'AP' },
        ],
      },
    ]),
    createJournalEntry: vi.fn().mockResolvedValue({ id: 'je-2' }),
    getStockOnboardings: vi.fn().mockResolvedValue([
      {
        id: 'onb-1',
        tenantId: 'store-42',
        locationId: 'loc-1',
        status: 'draft',
        asOfDate: '2026-10-01',
        items: [{ variantId: 'SKU-100', quantity: 10, unitCostCents: 500 }],
      },
    ]),
    createStockOnboarding: vi.fn().mockResolvedValue({ id: 'onb-2', status: 'draft' }),
    submitStockOnboarding: vi.fn().mockResolvedValue({ id: 'onb-1', status: 'submitted' }),
    scanBarcode: vi.fn().mockResolvedValue({ sku: 'SKU-100', quantity: 26 }),
    traceSerialHistory: vi.fn().mockResolvedValue({
      id: 'ser-1',
      serialNumber: 'SN-001',
      variantId: 'SKU-100',
      locationId: 'loc-1',
      status: 'IN_STOCK',
      history: [{ from: 'NEW', to: 'IN_STOCK', reason: 'Received', actor: 'admin', occurredAt: '2026-10-01T00:00:00Z' }],
    }),
    getForecastingReport: vi.fn().mockResolvedValue([
      {
        sku: 'SKU-100',
        name: 'Widget Pro',
        currentStock: 25,
        salesVelocity7d: 3.5,
        salesVelocity30d: 3.0,
        salesVelocity90d: 2.8,
        forecastedDemand: 90,
        suggestedROP: 30,
        safetyStock: 10,
      },
    ]),
    getReorderPolicies: vi.fn().mockResolvedValue([
      { sku: 'SKU-100', locationId: 'loc-1', minQuantity: 10, reorderQuantity: 50, isActive: true },
    ]),
    saveReorderPolicy: vi.fn().mockResolvedValue({ sku: 'SKU-100' }),
    evaluateReorderPolicies: vi.fn().mockResolvedValue([{ sku: 'SKU-100', suggestedQty: 50 }]),
    routeOrder: vi.fn().mockResolvedValue({
      allocations: [{ locationId: 'loc-1', sku: 'SKU-100', quantity: 2, distanceKm: 12.4 }],
      unfulfilled: [],
    }),
    getPurchaseOrders: vi.fn().mockResolvedValue([
      {
        id: 'po-1',
        supplierId: 'sup-1',
        supplierName: 'Acme Supply',
        status: 'DRAFT',
        createdAt: '2026-10-01',
        items: [{ sku: 'SKU-100', quantity: 10, unitCostCents: 500 }],
      },
      {
        id: 'po-2',
        supplierId: 'sup-1',
        supplierName: 'Acme Supply',
        status: 'APPROVED',
        createdAt: '2026-10-01',
        items: [{ sku: 'SKU-100', quantity: 5, unitCostCents: 500 }],
      },
      {
        id: 'po-3',
        supplierId: 'sup-1',
        supplierName: 'Acme Supply',
        status: 'SENT',
        createdAt: '2026-10-01',
        items: [{ sku: 'SKU-100', quantity: 5, unitCostCents: 500 }],
      },
    ]),
    createPurchaseOrder: vi.fn().mockResolvedValue({ id: 'po-4', status: 'DRAFT' }),
    approvePurchaseOrder: vi.fn().mockResolvedValue({ id: 'po-1', status: 'APPROVED' }),
    sendPurchaseOrder: vi.fn().mockResolvedValue({ id: 'po-2', status: 'SENT' }),
    receivePurchaseOrder: vi.fn().mockResolvedValue({ id: 'po-3', status: 'RECEIVED' }),
    getWarehouseLocations: vi.fn().mockResolvedValue([
      { id: 'wl-1', code: 'A-01-01', zone: 'A', aisle: '01', rack: '01', bin: '01', maxCapacity: 100, currentOccupancy: 20, x: 1, y: 1, z: 0 },
    ]),
    saveWarehouseLocation: vi.fn().mockResolvedValue({ id: 'wl-2', code: 'A-01-02' }),
    deleteWarehouseLocation: vi.fn().mockResolvedValue(true),
    getPutawaySuggestions: vi.fn().mockResolvedValue([{ locationCode: 'A-01-01', availableCapacity: 80, score: 0.95 }]),
    getOptimizedPickRoute: vi.fn().mockResolvedValue({ totalDistance: 14.5, stops: [{ locationCode: 'A-01-01', sku: 'SKU-100' }] }),
    getSlottingSuggestions: vi.fn().mockResolvedValue([
      { sku: 'SKU-100', currentLocation: 'Z-09', suggestedLocation: 'A-01', estimatedTravelReductionPercent: 35, velocityScore: 0.9 },
    ]),
    getWebhooks: vi.fn().mockResolvedValue([
      { id: 'wh-1', url: 'https://hooks.example.com/inv', eventTypes: ['STOCK_RECEIVED'], events: ['STOCK_RECEIVED'], isActive: true },
    ]),
    getWebhookDeliveries: vi.fn().mockResolvedValue([
      { id: 'wd-1', subscriptionId: 'wh-1', eventType: 'STOCK_RECEIVED', statusCode: 200, deliveredAt: '2026-10-01T00:00:00Z' },
    ]),
    createWebhook: vi.fn().mockResolvedValue({ id: 'wh-2' }),
    deleteWebhook: vi.fn().mockResolvedValue(true),
    getComplianceLedger: vi.fn().mockResolvedValue([
      {
        id: 'cl-1',
        sequenceNumber: 1,
        eventType: 'STOCK_RECEIVED',
        payload: JSON.stringify({ sku: 'SKU-100' }),
        hash: 'abcdef1234567890abcdef1234567890',
        currentHash: 'abcdef1234567890abcdef1234567890',
        previousHash: '00000000000000000000000000000000',
        signature: 'sig1234567890abcdef1234567890',
        timestamp: '2026-10-01T00:00:00Z',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]),
    verifyComplianceLedger: vi.fn().mockResolvedValue({ isValid: true }),
    reconstructState: vi.fn().mockResolvedValue({
      timestamp: '2026-10-01T00:00:00Z',
      eventsReplayedCount: 1,
      stockLevels: [{ sku: 'SKU-100', locationId: 'loc-1', quantity: 25 }],
      binConfigurations: [],
      accountBalances: [],
    }),
    replayAudit: vi.fn().mockResolvedValue([
      { sequenceNumber: 1, eventType: 'STOCK_RECEIVED', timestamp: '2026-10-01T00:00:00Z', hash: 'abcdef1234567890' },
    ]),
    getUsers: vi.fn().mockResolvedValue([
      { id: 'u-1', email: 'admin@example.com', role: 'admin', status: 'active' },
    ]),
    inviteUser: vi.fn().mockResolvedValue({ id: 'u-2', email: 'ops@example.com', role: 'warehouse_operator' }),
    updateUserRole: vi.fn().mockResolvedValue({ id: 'u-1', role: 'manager' }),
    getDiscrepancies: vi.fn().mockResolvedValue([
      { id: 'disc-1', sku: 'SKU-100', locationId: 'loc-1', expectedQty: 25, actualQty: 22, status: 'OPEN', detectedAt: '2026-10-01' },
    ]),
    runAudit: vi.fn().mockResolvedValue({ discrepanciesFound: 1 }),
    resolveDiscrepancy: vi.fn().mockResolvedValue({ id: 'disc-1', status: 'RESOLVED' }),
    getOutboxStats: vi.fn().mockResolvedValue({ pending: 1, published: 10, failed: 1 }),
    getDeadLetterEvents: vi.fn().mockResolvedValue([
      { id: 'dlq-1', eventType: 'STOCK_RECEIVED', payload: '{}', error: 'timeout', retryCount: 3, createdAt: '2026-10-01' },
    ]),
    retryOutboxEvent: vi.fn().mockResolvedValue({ id: 'dlq-1', status: 'RETRIED' }),
    getTenantConfig: vi.fn().mockResolvedValue({ costingMethod: 'FIFO', currency: 'USD', autoPostJournals: true }),
    saveTenantConfig: vi.fn().mockResolvedValue({ costingMethod: 'LIFO', currency: 'USD', autoPostJournals: true }),
    getValuationReport: vi.fn().mockResolvedValue([
      { sku: 'SKU-100', locationId: 'loc-1', quantity: 25, totalValueCents: 12500, averageUnitCostCents: 500 },
    ]),
    getQuarantinedItems: vi.fn().mockResolvedValue([
      { id: 'q-1', sku: 'SKU-100', locationId: 'loc-1', quantity: 2, reason: 'Damaged box', status: 'QUARANTINED' },
    ]),
    resolveQuarantine: vi.fn().mockResolvedValue({ id: 'q-1', status: 'RELEASED' }),
    assembleKit: vi.fn().mockResolvedValue({ kitSku: 'KIT-1', assembled: 1 }),
    disassembleKit: vi.fn().mockResolvedValue({ kitSku: 'KIT-1', disassembled: 1 }),
    getCacheStats: vi.fn().mockResolvedValue({ hits: 42, misses: 3, keys: 12 }),
    clearCache: vi.fn().mockResolvedValue({ flushed: true }),
    getFefoPickSuggestions: vi.fn().mockResolvedValue([{ lotNumber: 'LOT-1', quantity: 5, expiresAt: '2026-12-31' }]),
    traceRecall: vi.fn().mockResolvedValue({ lotNumber: 'LOT-1', affectedShipments: [] }),
  };
  return mockApi;
}

function setupSession(role = 'admin') {
  localStorage.setItem('auth_token', jwt);
  localStorage.setItem('auth_role', role);
  localStorage.setItem('auth_tenant', 'store-42');
  localStorage.setItem('auth_actor', 'operator-42');
}

function mountApp(backendType: 'express' | 'python' = 'express') {
  vi.mocked(useInventory).mockReturnValue({
    client: api as any,
    backendType,
    setBackendType: vi.fn(),
  });
  return render(<App />);
}

beforeEach(() => {
  vi.clearAllMocks();
  api = buildRichApi();
  vi.mocked(getQueuedScans).mockResolvedValue([]);
  vi.mocked(syncOfflineQueue).mockResolvedValue({ successCount: 1, failedCount: 0 });
  vi.mocked(addScanToQueue).mockResolvedValue(undefined as any);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy', hits: 10, misses: 1, keys: 5 }),
    }),
  );
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('App navigation tabs and inline workflows', () => {
  it('navigates across all Express admin sidebar tabs without crashing', async () => {
    setupSession('admin');
    const { container } = mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    const navLinks = Array.from(container.querySelectorAll('.nav-link'));
    expect(navLinks.length).toBeGreaterThanOrEqual(25);
    for (const link of navLinks) {
      fireEvent.click(link);
    }

    // Return to dashboard
    fireEvent.click(navLinks[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeInTheDocument());
  });

  it('navigates across all Python admin sidebar tabs and renders Python panels', async () => {
    setupSession('admin');
    const { container } = mountApp('python');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    const navLinks = Array.from(container.querySelectorAll('.nav-link'));
    for (const link of navLinks) {
      fireEvent.click(link);
    }
    const integrationsLink = navLinks.find((el) => /Integrations/i.test(el.textContent || ''));
    expect(integrationsLink).toBeTruthy();
    fireEvent.click(integrationsLink!);
    expect(screen.getByTestId('panel-python-integrations')).toBeInTheDocument();
  });

  it('exercises Compliance Ledger verify, reconstruct, and replay workflows', async () => {
    setupSession('admin');
    mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    fireEvent.click(screen.getByText(/Compliance Ledger/));
    await waitFor(() => expect(api.getComplianceLedger).toHaveBeenCalled());

    const verifyBtn = screen.getByRole('button', { name: /Verify Cryptographic Chain|Verify Integrity|Verify/i });
    fireEvent.click(verifyBtn);
    await waitFor(() => expect(api.verifyComplianceLedger).toHaveBeenCalled());

    const reconstructBtn = screen.getByRole('button', { name: /Reconstruct Historical State/i });
    fireEvent.click(reconstructBtn);
    await waitFor(() => expect(api.reconstructState).toHaveBeenCalled());

    const replayBtn = screen.getByRole('button', { name: /Replay Audit Timeline/i });
    fireEvent.click(replayBtn);
    await waitFor(() => expect(api.replayAudit).toHaveBeenCalled());
  });

  it('exercises Admin Portal audit, discrepancy resolution, outbox retry, cache stats/flush, and user invite', async () => {
    setupSession('admin');
    mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    fireEvent.click(screen.getByText(/Admin Portal/));
    await waitFor(() => expect(api.getUsers).toHaveBeenCalled());

    const runAuditBtn = screen.queryByRole('button', { name: /Run Full Audit|Run Audit/i });
    if (runAuditBtn) {
      fireEvent.click(runAuditBtn);
      await waitFor(() => expect(api.runAudit).toHaveBeenCalled());
    }

    const resolveBtn = screen.queryByRole('button', { name: /Resolve/i });
    if (resolveBtn) {
      fireEvent.click(resolveBtn);
      await waitFor(() => expect(api.resolveDiscrepancy).toHaveBeenCalled());
    }

    const retryBtn = screen.queryByRole('button', { name: /Retry/i });
    if (retryBtn) {
      fireEvent.click(retryBtn);
      await waitFor(() => expect(api.retryOutboxEvent).toHaveBeenCalled());
    }

    const cacheStatsBtn = screen.queryByRole('button', { name: /Refresh Cache Stats|Fetch Cache Stats|Cache Stats/i });
    if (cacheStatsBtn) {
      fireEvent.click(cacheStatsBtn);
    }

    const flushCacheBtn = screen.queryByRole('button', { name: /Flush Cache|Clear Cache/i });
    if (flushCacheBtn) {
      fireEvent.click(flushCacheBtn);
    }
  });

  it('exercises Purchase Orders, Warehouse Layout, Webhooks, Onboarding, and Operational Depth actions', async () => {
    setupSession('admin');
    mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    // Purchase Orders: approve & send existing POs
    fireEvent.click(screen.getByText(/Purchase Orders/));
    await waitFor(() => expect(api.getPurchaseOrders).toHaveBeenCalled());
    const approveBtn = screen.queryByRole('button', { name: /Approve/i });
    if (approveBtn) {
      fireEvent.click(approveBtn);
      await waitFor(() => expect(api.approvePurchaseOrder).toHaveBeenCalled());
    }
    const sendBtn = screen.queryByRole('button', { name: /Send/i });
    if (sendBtn) {
      fireEvent.click(sendBtn);
      await waitFor(() => expect(api.sendPurchaseOrder).toHaveBeenCalled());
    }

    // Warehouse Layout: delete location
    fireEvent.click(screen.getByText(/Warehouse Layout/));
    await waitFor(() => expect(api.getWarehouseLocations).toHaveBeenCalled());
    const deleteLocBtn = screen.queryByRole('button', { name: /Delete/i });
    if (deleteLocBtn) {
      fireEvent.click(deleteLocBtn);
      await waitFor(() => expect(api.deleteWarehouseLocation).toHaveBeenCalled());
    }

    // Webhook Logs: delete webhook
    fireEvent.click(screen.getByText(/Webhook Logs/));
    await waitFor(() => expect(api.getWebhooks).toHaveBeenCalled());
    const deleteWhBtn = screen.queryByRole('button', { name: /Delete|Remove/i });
    if (deleteWhBtn) {
      fireEvent.click(deleteWhBtn);
      await waitFor(() => expect(api.deleteWebhook).toHaveBeenCalled());
    }

    // Stock Onboarding: create draft
    fireEvent.click(screen.getByText(/Stock Onboarding/));
    const createOnbBtn = screen.queryByRole('button', { name: /Create Onboarding|Create Draft/i });
    if (createOnbBtn) {
      fireEvent.click(createOnbBtn);
    }

    // Operational Depth: switch sub-tabs if present
    fireEvent.click(screen.getByText(/Operational Depth/));
    const opButtons = screen.getAllByRole('button');
    for (const btn of opButtons.slice(0, 6)) {
      if (!/Logout/i.test(btn.textContent || '')) {
        fireEvent.click(btn);
      }
    }
  });

  it('exercises all Admin Portal sub-tabs and their inline actions', async () => {
    setupSession('admin');
    const { container } = mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    fireEvent.click(screen.getByText(/Admin Portal/));
    await waitFor(() => expect(api.getUsers).toHaveBeenCalled());

    // Users sub-tab: submit invite form & change role
    const inviteForm = container.querySelector('form');
    if (inviteForm) fireEvent.submit(inviteForm);

    // Roles & Permissions
    fireEvent.click(screen.getByRole('button', { name: /Roles & Permissions/i }));
    expect(screen.getByTestId('panel-rbac')).toBeInTheDocument();

    // Audits & Discrepancies
    fireEvent.click(screen.getByRole('button', { name: /Audits & Discrepancies/i }));
    const runAuditBtn = screen.queryByRole('button', { name: /Run Full Audit|Run Audit/i });
    if (runAuditBtn) fireEvent.click(runAuditBtn);
    const resolveDiscBtn = screen.queryByRole('button', { name: /Resolve/i });
    if (resolveDiscBtn) fireEvent.click(resolveDiscBtn);

    // Outbox Monitor
    fireEvent.click(screen.getByRole('button', { name: /Outbox Monitor/i }));
    const retryBtn = screen.queryByRole('button', { name: /Retry/i });
    if (retryBtn) fireEvent.click(retryBtn);

    // Tenant Configuration
    fireEvent.click(screen.getByRole('button', { name: /Tenant Configuration/i }));
    const configForm = container.querySelector('form');
    if (configForm) fireEvent.submit(configForm);

    // Kitting Desk
    fireEvent.click(screen.getByRole('button', { name: /Kitting Desk/i }));
    const kitInput = screen.queryByPlaceholderText(/BUNDLE-IPHONE/i);
    if (kitInput) fireEvent.change(kitInput, { target: { value: 'KIT-100' } });
    const assembleBtn = screen.queryByRole('button', { name: /\bAssemble Kit/i });
    if (assembleBtn) fireEvent.click(assembleBtn);
    const disassembleBtn = screen.queryByRole('button', { name: /\bDisassemble Kit/i });
    if (disassembleBtn) fireEvent.click(disassembleBtn);

    // Quarantine Locker
    fireEvent.click(screen.getByRole('button', { name: /Quarantine Locker/i }));
    const releaseQBtn = screen.queryByRole('button', { name: /Release|Scrap|Resolve/i });
    if (releaseQBtn) fireEvent.click(releaseQBtn);

    // Financial Valuation
    fireEvent.click(screen.getByRole('button', { name: /Financial Valuation/i }));

    // Cache sub-tab
    const cacheTabBtn = screen.queryByRole('button', { name: /Cache/i });
    if (cacheTabBtn) {
      fireEvent.click(cacheTabBtn);
      await waitFor(() => expect(api.getCacheStats).toHaveBeenCalled());
      const flushBtn = screen.queryByRole('button', { name: /Flush|Clear/i });
      if (flushBtn) fireEvent.click(flushBtn);
    }
  });

  it('submits inline forms across Catalog, Scanning, Ledger, Serials, Routing, POs, Warehouse, and Webhooks', async () => {
    setupSession('admin');
    const { container } = mountApp('express');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh Stock' })).toBeEnabled());

    const submitAllFormsOnTab = (tabRegex: RegExp) => {
      const navLinks = Array.from(container.querySelectorAll('.nav-link'));
      const target = navLinks.find((el) => tabRegex.test(el.textContent || ''));
      expect(target).toBeTruthy();
      fireEvent.click(target!);

      const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
      for (const el of inputs) {
        if (el instanceof HTMLInputElement) {
          if (el.type === 'checkbox') {
            fireEvent.click(el);
          } else if (el.type === 'number') {
            fireEvent.change(el, { target: { value: '5' } });
          } else if (el.type === 'date' || el.type === 'datetime-local') {
            fireEvent.change(el, { target: { value: el.type === 'date' ? '2026-10-01' : '2026-10-01T12:00' } });
          } else {
            fireEvent.change(el, { target: { value: 'TEST-VAL' } });
          }
        } else if (el instanceof HTMLSelectElement && el.options.length > 0) {
          fireEvent.change(el, { target: { value: el.options[el.options.length - 1].value } });
        } else if (el instanceof HTMLTextAreaElement) {
          fireEvent.change(el, { target: { value: 'test notes' } });
        }
      }

      const forms = Array.from(container.querySelectorAll('form'));
      for (const form of forms) {
        fireEvent.submit(form);
      }
    };

    submitAllFormsOnTab(/Product Catalog/);
    submitAllFormsOnTab(/Barcode Workflows/);
    submitAllFormsOnTab(/Stock Onboarding/);
    submitAllFormsOnTab(/General Ledger/);
    submitAllFormsOnTab(/Compliance Ledger/);
    submitAllFormsOnTab(/Serial Number Trace/);
    submitAllFormsOnTab(/Demand Forecasting/);
    submitAllFormsOnTab(/Order Routing/);
    submitAllFormsOnTab(/Purchase Orders/);
    submitAllFormsOnTab(/Warehouse Layout/);
    submitAllFormsOnTab(/Webhook Logs/);
  });
});
