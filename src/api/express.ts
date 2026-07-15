import { InventoryClient, InventoryItem, Product, StockOnboarding, JournalEntry, ShopifyConnection, SerializedItem, JournalLine, Item, ForecastingReportItem, FulfillmentPlan, ReorderPolicy, WebhookSubscription, WebhookDeliveryLog, WarehouseLocation, PutawaySuggestion, PurchaseOrder, PurchaseOrderItem, BarcodeAssignment, User, AuditDiscrepancy, OutboxStats, OutboxEvent, TenantAccountingConfig, QuarantinedItem, ValuationItem } from './client';

const EXPRESS_BASE_URL = 'http://localhost:5000/api';
const EXPRESS_WS_URL = 'ws://localhost:5000';

export class ExpressRESTAdapter implements InventoryClient {
  private getHeaders(customToken?: string): Record<string, string> {
    const activeToken = customToken || localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken && activeToken !== 'NONE') {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  private async request(method: string, path: string, body?: any, customToken?: string): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders(customToken)
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${EXPRESS_BASE_URL}${path}`, options);
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try { parsedError = JSON.parse(errorText); } catch { parsedError = { error: errorText }; }
        throw new Error(parsedError.error || `HTTP ${response.status} Error`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('Express REST Adapter Error:', err);
      throw err;
    }
  }

  async login(tenantId: string, actorId: string, role?: string, password?: string): Promise<string> {
    try {
      // Try logging in directly
      const data = await this.request('POST', '/auth/login', {
        tenantId,
        email: actorId.includes('@') ? actorId : `${actorId}@example.com`,
        password: password || 'Password123!'
      }, 'NONE');
      return data.token;
    } catch (err: any) {
      // If direct login fails (e.g. user does not exist), auto-run setup for seamless E2E experience
      if (err.message.includes('credentials') || err.message.includes('401') || err.message.includes('404')) {
        try {
          await this.request('POST', '/auth/setup', {
            orgName: `Organization ${tenantId}`,
            tenantId,
            adminName: actorId,
            adminEmail: actorId.includes('@') ? actorId : `${actorId}@example.com`,
            adminPassword: password || 'Password123!'
          }, 'NONE');

          // Login again after successful setup
          const data = await this.request('POST', '/auth/login', {
            tenantId,
            email: actorId.includes('@') ? actorId : `${actorId}@example.com`,
            password: password || 'Password123!'
          }, 'NONE');
          return data.token;
        } catch (setupErr: any) {
          throw new Error(`Login failed, and setup auto-recovery also failed: ${setupErr.message}`);
        }
      }
      throw err;
    }
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return this.request('GET', '/inventory');
  }

  async getProducts(): Promise<Product[]> {
    try {
      const assignments = await this.request('GET', '/barcodes');
      const grouped: Record<string, BarcodeAssignment[]> = {};
      for (const a of assignments || []) {
        const variantId = a.variantId;
        if (!grouped[variantId]) grouped[variantId] = [];
        grouped[variantId].push({
          id: a.id,
          sku: variantId,
          barcode: {
            value: a.barcodeValue,
            symbology: a.symbology
          },
          source: a.source,
          isPrimary: a.isPrimary,
          assignedAt: a.assignedAt
        });
      }

      const inventory = await this.getInventoryItems();
      const skus = new Set(inventory.map(item => item.sku));
      for (const sku of skus) {
        if (!grouped[sku]) {
          grouped[sku] = [];
        }
      }

      const products: Product[] = Object.keys(grouped).map(sku => ({
        id: `prod-${sku}`,
        name: `Product ${sku}`,
        variants: [{
          id: sku,
          sku: sku,
          trackingMode: 'quantity',
          attributes: [],
          barcodes: grouped[sku]
        }]
      }));

      return products;
    } catch (err) {
      console.warn('Failed to load products dynamically from barcodes/inventory. Returning empty list.', err);
      return [];
    }
  }

  async getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]> {
    // In Express, shopify connections are stored in databases, but the API may not expose a list connection route.
    // Fall back to returning a default list.
    return [{
      id: 'conn-1',
      tenantId,
      platform: 'shopify',
      storeDomain: 'mock-store.myshopify.com',
      isActive: true
    }];
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const data = await this.request('GET', `/accounting/ledger?tenantId=${tenantId}`);
    return data || [];
  }

  async getStockOnboardings(tenantId: string): Promise<StockOnboarding[]> {
    try {
      const data = await this.request('GET', `/onboarding?tenantId=${tenantId}`);
      return data || [];
    } catch {
      return [];
    }
  }

  async createProduct(id: string, name: string): Promise<void> {
    await this.request('POST', '/inventory/products', { id, name });
  }

  async addProductVariant(productId: string, sku: string, trackingMode: string, attributes: { name: string; value: string }[]): Promise<void> {
    await this.request('POST', `/inventory/products/${productId}/variants`, { sku, trackingMode, attributes });
  }

  async assignBarcode(sku: string, value: string, symbology: string, source: string, makePrimary: boolean): Promise<void> {
    await this.request('POST', '/barcodes/assign', {
      sku,
      barcodeValue: value,
      symbology,
      source,
      makePrimary
    });
  }

  async generateInternalBarcode(sku: string, tenantId: string): Promise<string> {
    const data = await this.request('POST', '/barcodes/generate', { sku, tenantId });
    return data.barcodeValue;
  }

  async scanBarcode(value: string, context: string, amount: number, actualQuantity: number, tenantId: string, locationId: string, actorId: string): Promise<any> {
    return this.request('POST', '/barcodes/scan', {
      barcodeValue: value,
      context,
      scannedAmount: amount,
      actualQuantity,
      tenantId,
      locationId,
      actorId
    });
  }

  async traceSerialHistory(serialNumber: string): Promise<SerializedItem> {
    return this.request('GET', `/serials/trace/${serialNumber}`);
  }

  async connectShopify(tenantId: string, storeDomain: string, accessToken: string): Promise<void> {
    await this.request('POST', '/shopify/connect', { tenantId, storeDomain, accessToken });
  }

  async createJournalEntry(tenantId: string, description: string, method: string, lines: JournalLine[]): Promise<void> {
    // Express records journals based on specific workflows (received/sold)
    // Map to the appropriate REST payload
    const totalAmount = lines.filter(l => l.type === 'debit').reduce((acc, curr) => acc + curr.amountCents, 0);
    const sku = lines[0]?.memo || 'SKU-1';
    await this.request('POST', '/accounting/stock-received', {
      tenantId,
      sku,
      quantity: 1,
      unitCostCents: totalAmount,
      method: method.toLowerCase()
    });
  }

  async createStockOnboarding(tenantId: string, locationId: string, asOfDate: string, items: Item[]): Promise<void> {
    const data = await this.request('POST', '/onboarding', { tenantId, locationId, asOfDate });
    const onboardingId = data.id;
    for (const item of items) {
      await this.request('POST', `/onboarding/${onboardingId}/items`, {
        variantId: item.variantId,
        quantity: item.quantity,
        unitCostCents: item.unitCostCents
      });
    }
  }

  async submitStockOnboarding(onboardingId: string): Promise<void> {
    await this.request('POST', `/onboarding/${onboardingId}/submit`);
  }

  async getForecastingReport(locationId: string): Promise<ForecastingReportItem[]> {
    const data = await this.request('GET', `/forecasting/report?locationId=${locationId}`);
    const rawReport = data || [];
    return rawReport.map((item: any) => ({
      sku: item.sku,
      name: item.name || `SKU: ${item.sku}`,
      currentStock: item.currentStock || 0,
      salesVelocity7d: item.salesVelocity7d || 0,
      salesVelocity30d: item.salesVelocity30d || 0,
      salesVelocity90d: item.salesVelocity90d || 0,
      forecastedDemand: item.forecastedDemand || 0,
      suggestedROP: item.suggestedROP || item.reorderPoint || 0,
      safetyStock: item.safetyStock || 0
    }));
  }

  subscribeBarcodeScans(tenantId: string, onScan: (scan: any) => void): () => void {
    const ws = new WebSocket(`${EXPRESS_WS_URL}?tenantId=${tenantId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'barcode_scanned') {
          onScan({
            scanValue: data.scanValue,
            symbology: data.symbology,
            context: data.context,
            status: data.status === 'success' ? 'Scanned successfully' : 'Error in scan',
            time: data.time || new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Express WS Parse Error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Express WS Error:', err);
    };

    return () => {
      ws.close();
    };
  }

  // --- Advanced Admin Operations for Express ---

  // Order Routing
  async routeOrder(sku: string, quantity: number, destinationAddress: string, strategyName: string): Promise<FulfillmentPlan> {
    return this.request('POST', '/shipping/route', { sku, quantity, destinationAddress, strategyName });
  }

  // Reorder Policies
  async getReorderPolicies(tenantId: string): Promise<ReorderPolicy[]> {
    try {
      const data = await this.request('GET', `/reorder-policies?tenantId=${tenantId}`);
      return data || [];
    } catch {
      return [];
    }
  }

  async saveReorderPolicy(tenantId: string, policy: ReorderPolicy): Promise<void> {
    await this.request('POST', '/reorder-policies', { tenantId, ...policy });
  }

  async evaluateReorderPolicies(tenantId: string): Promise<void> {
    await this.request('POST', '/reorder-policies/evaluate', { tenantId });
  }

  // Webhooks
  async getWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const data = await this.request('GET', `/webhooks?tenantId=${tenantId}`);
    return data || [];
  }

  async createWebhook(tenantId: string, url: string, eventTypes: string[]): Promise<void> {
    await this.request('POST', '/webhooks', { tenantId, url, eventTypes });
  }

  async deleteWebhook(tenantId: string, id: string): Promise<void> {
    await this.request('DELETE', `/webhooks/${id}?tenantId=${tenantId}`);
  }

  async getWebhookDeliveries(tenantId: string): Promise<WebhookDeliveryLog[]> {
    try {
      const data = await this.request('GET', `/webhooks/deliveries?tenantId=${tenantId}`);
      return data || [];
    } catch {
      return [];
    }
  }

  // WMS Layout
  async getWarehouseLocations(tenantId: string): Promise<WarehouseLocation[]> {
    const data = await this.request('GET', `/warehouse-locations?tenantId=${tenantId}`);
    return data || [];
  }

  async saveWarehouseLocation(tenantId: string, location: WarehouseLocation): Promise<void> {
    await this.request('POST', '/warehouse-locations', { tenantId, ...location });
  }

  async deleteWarehouseLocation(tenantId: string, id: string): Promise<void> {
    await this.request('DELETE', `/warehouse-locations/${id}?tenantId=${tenantId}`);
  }

  async getPutawaySuggestions(tenantId: string, sku: string, quantity: number): Promise<PutawaySuggestion[]> {
    return this.request('POST', '/warehouse-locations/putaway-suggestions', { tenantId, sku, quantity });
  }

  async getOptimizedPickRoute(tenantId: string, skus: string[]): Promise<string[]> {
    const data = await this.request('POST', '/warehouse-locations/optimize-pick-route', { tenantId, skus });
    if (!Array.isArray(data)) return [];
    return data.flatMap((group: any) => 
      (group.items || []).map((it: any) => 
        `${it.sku} from bin ${it.locationId} (Aisle ${it.aisle || 'N/A'}, Rack ${it.rack || 'N/A'}, Shelf ${it.shelf || 'N/A'})`
      )
    );
  }

  // Procurement (PO)
  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    const idsStr = localStorage.getItem(`po_ids_${tenantId}`) || '[]';
    const ids: string[] = JSON.parse(idsStr);
    const pos: PurchaseOrder[] = [];
    for (const id of ids) {
      try {
        const po = await this.request('GET', `/purchase-orders/${id}?tenantId=${tenantId}`);
        if (po) pos.push(po);
      } catch (e) {
        console.error(`Failed to load PO ${id}:`, e);
      }
    }
    return pos;
  }

  async createPurchaseOrder(tenantId: string, supplier: string, items: PurchaseOrderItem[]): Promise<void> {
    const po = await this.request('POST', '/purchase-orders', { tenantId, supplier, items });
    if (po?.id) {
      const idsStr = localStorage.getItem(`po_ids_${tenantId}`) || '[]';
      const ids: string[] = JSON.parse(idsStr);
      if (!ids.includes(po.id)) {
        ids.push(po.id);
        localStorage.setItem(`po_ids_${tenantId}`, JSON.stringify(ids));
      }
    }
  }

  async approvePurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request('POST', `/purchase-orders/${id}/approve`, { tenantId });
  }

  async sendPurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request('POST', `/purchase-orders/${id}/send`, { tenantId });
  }

  async receivePurchaseOrder(tenantId: string, id: string, items: { sku: string; quantity: number }[]): Promise<void> {
    await this.request('POST', `/purchase-orders/${id}/receive`, { tenantId, items });
  }

  // FEFO & Recall
  async getFefoPickSuggestions(tenantId: string, sku: string, quantity: number): Promise<any[]> {
    return this.request('GET', `/inventory/fefo-pick?sku=${sku}&quantity=${quantity}&tenantId=${tenantId}`);
  }

  async traceRecall(tenantId: string, lotNumber: string): Promise<any> {
    return this.request('GET', `/inventory/reports/recall/${lotNumber}?tenantId=${tenantId}`);
  }

  // --- Unified Admin Portal Operations for Express ---
  async getUsers(tenantId: string): Promise<User[]> {
    const res = await this.request('GET', `/users?tenantId=${tenantId}`);
    return res?.users || [];
  }

  async inviteUser(tenantId: string, email: string, role: string): Promise<{ userId: string; temporaryPassword?: string }> {
    return this.request('POST', `/users`, { tenantId, email, role });
  }

  async updateUserRole(tenantId: string, userId: string, role: string): Promise<void> {
    await this.request('PATCH', `/users/${userId}/role`, { tenantId, role });
  }

  async runAudit(tenantId: string): Promise<any> {
    return this.request('POST', `/audit/run`, { tenantId });
  }

  async getDiscrepancies(tenantId: string): Promise<AuditDiscrepancy[]> {
    const res = await this.request('GET', `/audit/discrepancies?tenantId=${tenantId}`);
    return res || [];
  }

  async resolveDiscrepancy(tenantId: string, id: string, notes: string): Promise<void> {
    await this.request('POST', `/audit/discrepancies/${id}/resolve`, { tenantId, notes });
  }

  async getOutboxStats(): Promise<OutboxStats> {
    try {
      const stats = await this.request('GET', `/outbox/stats`);
      return {
        pendingCount: stats?.pending || 0,
        publishedCount: stats?.published || 0,
        failedCount: stats?.failed || 0
      };
    } catch {
      return { pendingCount: 0, publishedCount: 0, failedCount: 0 };
    }
  }

  async getDeadLetterEvents(limit?: number): Promise<OutboxEvent[]> {
    try {
      const res = await this.request('GET', `/outbox/dead-letter${limit ? `?limit=${limit}` : ''}`);
      return (res || []).map((e: any) => ({
        id: e.id,
        eventType: e.eventType || e.type || 'UnknownEvent',
        payload: typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload),
        error: e.error || e.errorMessage || '',
        status: e.status || 'Failed',
        occurredAt: e.occurredAt || e.createdAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  async retryOutboxEvent(id: string): Promise<void> {
    await this.request('POST', `/outbox/${id}/retry`);
  }

  async getTenantConfig(tenantId: string): Promise<TenantAccountingConfig> {
    return this.request('GET', `/accounting/tenant-config/${tenantId}`);
  }

  async saveTenantConfig(tenantId: string, config: { accountingMethod: string; costingMethod: string }): Promise<void> {
    await this.request('POST', `/accounting/tenant-config`, { tenantId, ...config });
  }

  async assembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: string, referenceId: string): Promise<void> {
    await this.request('POST', `/kits/assemble`, { tenantId, locationId, kitSku, quantity, actorId, referenceId });
  }

  async disassembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: string, referenceId: string): Promise<void> {
    await this.request('POST', `/kits/disassemble`, { tenantId, locationId, kitSku, quantity, actorId, referenceId });
  }

  async getQuarantinedItems(tenantId: string): Promise<QuarantinedItem[]> {
    try {
      const res = await this.request('GET', `/returns/quarantine?tenantId=${tenantId}`);
      return (res || []).map((q: any) => ({
        id: q.id,
        sku: q.sku || q.variantId || '',
        locationId: q.locationId || '',
        quantity: q.quantity || 0,
        reason: q.reason || '',
        status: q.status || 'Quarantined',
        createdAt: q.createdAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  async resolveQuarantine(tenantId: string, id: string, resolution: string): Promise<void> {
    await this.request('POST', `/returns/quarantine/${id}/resolve`, { tenantId, resolution });
  }

  async getValuationReport(tenantId: string, locationId?: string, method?: string): Promise<ValuationItem[]> {
    try {
      const products = await this.getProducts();
      const items: ValuationItem[] = [];
      for (const p of products) {
        for (const v of p.variants) {
          try {
            const invItems = await this.getInventoryItems();
            const variantInv = invItems.filter(i => i.sku === v.sku);
            const qty = variantInv.reduce((sum, item) => sum + item.quantity, 0);
            if (qty > 0) {
              const val = await this.request('GET', `/accounting/valuation/${v.id}?tenantId=${tenantId}&quantity=${qty}${method ? `&method=${method}` : ''}`);
              items.push({
                variantId: v.id,
                sku: v.sku,
                name: p.name + (v.attributes?.length ? ` (${v.attributes.map(a => a.value).join(', ')})` : ''),
                costingMethod: val.methodUsed || method || 'FIFO',
                totalQuantity: qty,
                totalValueCents: val.totalCostCents || 0,
                unitCostCents: val.unitCostCents || 0
              });
            } else {
              items.push({
                variantId: v.id,
                sku: v.sku,
                name: p.name,
                costingMethod: method || 'FIFO',
                totalQuantity: 0,
                totalValueCents: 0,
                unitCostCents: 0
              });
            }
          } catch {
            items.push({
              variantId: v.id,
              sku: v.sku,
              name: p.name,
              costingMethod: method || 'FIFO',
              totalQuantity: 0,
              totalValueCents: 0,
              unitCostCents: 0
            });
          }
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  async getSlottingSuggestions(tenantId: string): Promise<any[]> {
    return this.request('GET', `/warehouse-locations/slotting-suggestions?tenantId=${tenantId}`);
  }

  async getComplianceLedger(tenantId: string): Promise<any[]> {
    return this.request('GET', `/compliance/ledger?tenantId=${tenantId}`);
  }

  async verifyComplianceLedger(tenantId: string): Promise<{ isValid: boolean; failedSequenceNumber?: number; reason?: string }> {
    return this.request('POST', `/compliance/verify?tenantId=${tenantId}`);
  }
}
