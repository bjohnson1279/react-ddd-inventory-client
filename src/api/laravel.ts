import { InventoryClient, InventoryItem, Product, StockOnboarding, JournalEntry, ShopifyConnection, SerializedItem, JournalLine, Item, ForecastingReportItem, FulfillmentPlan, ReorderPolicy, WebhookSubscription, WebhookDeliveryLog, WarehouseLocation, PutawaySuggestion, PurchaseOrder, PurchaseOrderItem, User, AuditDiscrepancy, OutboxStats, OutboxEvent, TenantAccountingConfig, QuarantinedItem, ValuationItem } from './client';

const LARAVEL_BASE_URL = 'http://localhost:8000';

export class LaravelRESTAdapter implements InventoryClient {
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

      const response = await fetch(`${LARAVEL_BASE_URL}${path}`, options);
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try { parsedError = JSON.parse(errorText); } catch { parsedError = { error: errorText }; }
        throw new Error(parsedError.error || `HTTP ${response.status} Error`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('Laravel REST Adapter Error:', err);
      throw err;
    }
  }

  async login(tenantId: string, actorId: string, role?: string, password?: string): Promise<string> {
    try {
      // Try logging in directly (accepts email or custom username)
      const email = actorId.includes('@') ? actorId : `${actorId}@example.com`;
      const data = await this.request('POST', '/api/auth/login', {
        tenantId,
        email,
        password: password || 'SecurePassword123'
      }, 'NONE');
      return data.token;
    } catch (err: any) {
      // If direct login fails, auto-run setup for seamless E2E experience
      if (err.message.includes('credentials') || err.message.includes('401') || err.message.includes('404')) {
        try {
          const email = actorId.includes('@') ? actorId : `${actorId}@example.com`;
          await this.request('POST', '/api/setup', {
            orgName: `Organization ${tenantId}`,
            tenantId,
            adminName: actorId,
            adminEmail: email,
            adminPassword: password || 'SecurePassword123'
          }, 'NONE');

          // Login again after successful setup
          const data = await this.request('POST', '/api/auth/login', {
            tenantId,
            email,
            password: password || 'SecurePassword123'
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
    // Laravel fetches inventory stock levels dynamically via catalog products
    // We fetch catalog products, then map their variants to stock items
    try {
      const prodData = await this.request('GET', '/api/catalog/products');
      const productsList = prodData.products || [];
      const stockItems: InventoryItem[] = [];

      for (const p of productsList) {
        for (const v of p.variants || []) {
          try {
            // Get stock level for SKU
            const stockRes = await this.request('GET', `/api/inventory/${v.sku}/stock`);
            stockItems.push({
              id: `${v.id}-stock`,
              sku: v.sku,
              locationId: stockRes.location_id || 'default',
              quantity: stockRes.available_quantity ?? stockRes.quantity ?? 0,
              version: 1
            });
          } catch {
            stockItems.push({
              id: `${v.id}-stock`,
              sku: v.sku,
              locationId: 'default',
              quantity: 0,
              version: 1
            });
          }
        }
      }
      return stockItems;
    } catch {
      return [];
    }
  }

  async getProducts(): Promise<Product[]> {
    const prodData = await this.request('GET', '/api/catalog/products');
    const rawProducts = prodData.products || [];

    // Resolve barcodes for each variant to complete model structure
    return Promise.all(rawProducts.map(async (p: any) => {
      const variants = await Promise.all((p.variants || []).map(async (v: any) => {
        try {
          const bcData = await this.request('GET', `/api/barcodes/variants/${v.id}`);
          // Format assignments to match UI expectations
          const assignments = (bcData.assignments || []).map((a: any) => ({
            id: a.id,
            sku: v.sku,
            barcode: {
              value: a.barcode_value || a.value,
              symbology: a.symbology
            },
            source: a.source,
            isPrimary: a.is_primary || a.isPrimary,
            assignedAt: a.assigned_at || a.assignedAt
          }));
          return {
            id: v.id,
            sku: v.sku,
            trackingMode: v.tracking_mode || v.trackingMode || 'quantity',
            attributes: v.attributes || [],
            barcodes: assignments
          };
        } catch {
          return {
            id: v.id,
            sku: v.sku,
            trackingMode: v.tracking_mode || v.trackingMode || 'quantity',
            attributes: v.attributes || [],
            barcodes: []
          };
        }
      }));
      return {
        id: p.id,
        name: p.name,
        variants
      };
    }));
  }

  async getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]> {
    return [{
      id: 'conn-1',
      tenantId,
      platform: 'shopify',
      storeDomain: 'mock-store.myshopify.com',
      isActive: true
    }];
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const data = await this.request('GET', '/api/journal/entries');
    const rawEntries = data.entries || [];
    return rawEntries.map((e: any) => ({
      id: e.id,
      tenantId: e.tenant_id || tenantId,
      date: e.date,
      description: e.description,
      method: e.method,
      referenceId: e.reference_id,
      lines: (e.lines || []).map((l: any) => ({
        accountCode: l.account_code || l.accountCode,
        amountCents: l.amount_cents || l.amountCents || l.amount,
        type: l.type.toLowerCase(),
        memo: l.memo
      }))
    }));
  }

  async getStockOnboardings(tenantId: string): Promise<StockOnboarding[]> {
    // Onboardings in Laravel: return a list from the database if exists
    try {
      const data = await this.request('GET', `/api/onboardings?tenantId=${tenantId}`);
      return data || [];
    } catch {
      return [];
    }
  }

  async createProduct(id: string, name: string): Promise<void> {
    await this.request('POST', '/api/catalog/products', { id, name });
  }

  async addProductVariant(productId: string, sku: string, trackingMode: string, attributes: { name: string; value: string }[]): Promise<void> {
    await this.request('POST', `/api/catalog/products/${productId}/variants`, {
      sku,
      trackingMode,
      attributes
    });
  }

  async assignBarcode(sku: string, value: string, symbology: string, source: string, makePrimary: boolean): Promise<void> {
    // Lookup variantId first since Laravel assign endpoint requires it
    const products = await this.getProducts();
    let variantId = '';
    for (const p of products) {
      const found = p.variants.find(v => v.sku === sku);
      if (found) {
        variantId = found.id;
        break;
      }
    }

    if (!variantId) {
      throw new Error(`Variant for SKU ${sku} not found.`);
    }

    await this.request('POST', '/api/barcodes/assign', {
      variant_id: variantId,
      value,
      symbology,
      source,
      is_primary: makePrimary
    });
  }

  async generateInternalBarcode(sku: string, tenantId: string): Promise<string> {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const randomSuffix = (100000000 + (array[0] % 900000000)).toString();
    const barcodeValue = `INT-${sku}-${randomSuffix}`;
    await this.assignBarcode(sku, barcodeValue, 'code_128', 'internal', true);
    return barcodeValue;
  }

  async scanBarcode(value: string, context: string, amount: number, actualQuantity: number, tenantId: string, locationId: string, actorId: string): Promise<any> {
    return this.request('POST', '/api/barcodes/scan', {
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
    const data = await this.request('GET', `/api/serials/trace/${serialNumber}`);
    return {
      id: data.id,
      variantId: data.variant_id,
      serialNumber: data.serial_number,
      tenantId: data.tenant_id,
      locationId: data.location_id,
      status: data.status,
      history: (data.history || []).map((h: any) => ({
        from: h.from_status || h.from,
        to: h.to_status || h.to,
        reason: h.reason,
        actor: h.actor,
        occurredAt: h.occurred_at || h.occurredAt
      }))
    };
  }

  async connectShopify(tenantId: string, storeDomain: string, accessToken: string): Promise<void> {
    // Connect to shopify platform settings
    await this.request('POST', '/api/shopify/connect', { tenantId, storeDomain, accessToken });
  }

  async createJournalEntry(tenantId: string, description: string, method: string, lines: JournalLine[]): Promise<void> {
    // Laravel accepts lines with 'account' and 'amount'
    const formattedLines = lines.map(l => ({
      account: l.accountCode,
      amount: l.amountCents,
      type: l.type.toLowerCase(),
      memo: l.memo
    }));
    await this.request('POST', '/api/journal/entries', {
      tenantId,
      description,
      method: method.toLowerCase(),
      lines: formattedLines
    });
  }

  async createStockOnboarding(tenantId: string, locationId: string, asOfDate: string, items: Item[]): Promise<void> {
    const data = await this.request('POST', '/api/onboardings', {
      location_id: locationId,
      as_of_date: asOfDate
    });
    const onboardingId = data.id;
    for (const item of items) {
      await this.request('POST', `/api/onboardings/${onboardingId}/items`, {
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_cost_cents: item.unitCostCents
      });
    }
  }

  async submitStockOnboarding(onboardingId: string): Promise<void> {
    await this.request('POST', `/api/onboardings/${onboardingId}/submit`);
  }

  async getForecastingReport(locationId: string): Promise<ForecastingReportItem[]> {
    const data = await this.request('GET', `/api/forecasting/report?locationId=${locationId}`);
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
    // Laravel uses Server-Sent Events (SSE) for notifications
    const activeToken = localStorage.getItem('auth_token') || '';
    const eventSource = new EventSource(`${LARAVEL_BASE_URL}/api/notifications/subscribe?token=${activeToken}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Map scan notifications if available
        if (data.type === 'BarcodeScanned' || data.type === 'barcode_scanned') {
          onScan({
            scanValue: data.scanValue || data.value,
            symbology: data.symbology,
            context: data.context,
            status: data.status || 'success',
            time: data.time || new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Laravel SSE Parse Error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Laravel SSE Error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }

  // --- Advanced Admin Operations for Laravel ---

  // Order Routing
  async routeOrder(sku: string, quantity: number, destinationAddress: string, strategyName: string): Promise<FulfillmentPlan> {
    return this.request('POST', '/api/shipping/route', { sku, quantity, destination_address: destinationAddress, strategy_name: strategyName });
  }

  // Reorder Policies
  async getReorderPolicies(tenantId: string): Promise<ReorderPolicy[]> {
    try {
      const data = await this.request('GET', `/api/reorder-policies?tenantId=${tenantId}`);
      return (data || []).map((p: any) => ({
        sku: p.sku,
        locationId: p.location_id || p.locationId,
        reorderPoint: p.reorder_point || p.reorderPoint || 0,
        safetyStock: p.safety_stock || p.safetyStock || 0,
        economicOrderQuantity: p.economic_order_quantity || p.economicOrderQuantity || 0
      }));
    } catch {
      return [];
    }
  }

  async saveReorderPolicy(tenantId: string, policy: ReorderPolicy): Promise<void> {
    await this.request('POST', '/api/reorder-policies', {
      tenantId,
      sku: policy.sku,
      location_id: policy.locationId,
      reorder_point: policy.reorderPoint,
      safety_stock: policy.safetyStock,
      economic_order_quantity: policy.economicOrderQuantity
    });
  }

  async evaluateReorderPolicies(tenantId: string): Promise<void> {
    await this.request('POST', '/api/reorder-policies/evaluate', { tenantId });
  }

  // Webhooks
  async getWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const data = await this.request('GET', `/api/webhooks?tenantId=${tenantId}`);
    return (data || []).map((w: any) => ({
      id: w.id,
      tenantId: w.tenant_id || w.tenantId,
      url: w.url,
      eventTypes: w.event_types || w.eventTypes || []
    }));
  }

  async createWebhook(tenantId: string, url: string, eventTypes: string[]): Promise<void> {
    await this.request('POST', '/api/webhooks', {
      tenant_id: tenantId,
      url,
      event_types: eventTypes
    });
  }

  async deleteWebhook(tenantId: string, id: string): Promise<void> {
    await this.request('DELETE', `/api/webhooks/${id}?tenantId=${tenantId}`);
  }

  async getWebhookDeliveries(tenantId: string): Promise<WebhookDeliveryLog[]> {
    try {
      const data = await this.request('GET', `/api/webhooks/deliveries?tenantId=${tenantId}`);
      return (data || []).map((d: any) => ({
        id: d.id,
        subscriptionId: d.subscription_id || d.subscriptionId,
        eventName: d.event_name || d.eventName,
        status: d.status,
        statusCode: d.status_code || d.statusCode,
        occurredOn: d.occurred_on || d.occurredOn
      }));
    } catch {
      return [];
    }
  }

  // WMS Layout
  async getWarehouseLocations(tenantId: string): Promise<WarehouseLocation[]> {
    const data = await this.request('GET', `/api/warehouse-locations?tenantId=${tenantId}`);
    return (data || []).map((l: any) => ({
      id: l.id,
      warehouseId: l.warehouse_id || l.warehouseId,
      zone: l.zone,
      maxWeightGrams: l.max_weight_grams || l.maxWeightGrams || 0,
      maxVolumeCubicMeters: l.max_volume_cubic_meters || l.maxVolumeCubicMeters || 0
    }));
  }

  async saveWarehouseLocation(tenantId: string, location: WarehouseLocation): Promise<void> {
    await this.request('POST', '/api/warehouse-locations', {
      tenantId,
      id: location.id,
      warehouse_id: location.warehouseId,
      zone: location.zone,
      max_weight_grams: location.maxWeightGrams,
      max_volume_cubic_meters: location.maxVolumeCubicMeters
    });
  }

  async deleteWarehouseLocation(tenantId: string, id: string): Promise<void> {
    await this.request('DELETE', `/api/warehouse-locations/${id}?tenantId=${tenantId}`);
  }

  async getPutawaySuggestions(tenantId: string, sku: string, quantity: number): Promise<PutawaySuggestion[]> {
    const data = await this.request('POST', '/api/warehouse-locations/putaway-suggestions', { tenantId, sku, quantity });
    return (data || []).map((s: any) => ({
      locationId: s.location_id || s.locationId,
      sku: s.sku,
      suggestedQuantity: s.suggested_quantity || s.suggestedQuantity || 0
    }));
  }

  async getOptimizedPickRoute(tenantId: string, skus: string[]): Promise<string[]> {
    return this.request('POST', '/api/warehouse-locations/optimize-pick-route', { tenantId, skus });
  }

  // Procurement (PO)
  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    const idsStr = localStorage.getItem(`po_ids_${tenantId}`) || '[]';
    const ids: string[] = JSON.parse(idsStr);
    const pos: PurchaseOrder[] = [];
    for (const id of ids) {
      try {
        const po = await this.request('GET', `/api/purchase-orders/${id}?tenantId=${tenantId}`);
        if (po) {
          pos.push({
            id: po.id,
            tenantId: po.tenant_id || po.tenantId,
            supplier: po.supplier,
            status: po.status,
            createdAt: po.created_at || po.createdAt,
            items: (po.items || []).map((i: any) => ({
              sku: i.sku,
              quantity: i.quantity,
              unitCostCents: i.unit_cost_cents || i.unitCostCents || 0
            }))
          });
        }
      } catch (e) {
        console.error(`Failed to load PO ${id}:`, e);
      }
    }
    return pos;
  }

  async createPurchaseOrder(tenantId: string, supplier: string, items: PurchaseOrderItem[]): Promise<void> {
    const formattedItems = items.map(i => ({
      sku: i.sku,
      quantity: i.quantity,
      unit_cost_cents: i.unitCostCents
    }));
    const po = await this.request('POST', '/api/purchase-orders', {
      tenant_id: tenantId,
      supplier,
      items: formattedItems
    });
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
    await this.request('POST', `/api/purchase-orders/${id}/approve`, { tenantId });
  }

  async sendPurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request('POST', `/api/purchase-orders/${id}/send`, { tenantId });
  }

  async receivePurchaseOrder(tenantId: string, id: string, items: { sku: string; quantity: number }[]): Promise<void> {
    const formattedItems = items.map(i => ({
      sku: i.sku,
      quantity: i.quantity
    }));
    await this.request('POST', `/api/purchase-orders/${id}/receive`, {
      tenantId,
      items: formattedItems
    });
  }

  // FEFO & Recall
  async getFefoPickSuggestions(tenantId: string, sku: string, quantity: number): Promise<any[]> {
    return this.request('GET', `/api/inventory/fefo-pick?sku=${sku}&quantity=${quantity}&tenantId=${tenantId}`);
  }

  async traceRecall(tenantId: string, lotNumber: string): Promise<any> {
    return this.request('GET', `/api/inventory/reports/recall/${lotNumber}?tenantId=${tenantId}`);
  }

  // --- Unified Admin Portal Operations for Laravel ---
  async getUsers(tenantId: string): Promise<User[]> {
    const res = await this.request('GET', `/api/users?tenantId=${tenantId}`);
    return res?.users || [];
  }

  async inviteUser(tenantId: string, email: string, role: string): Promise<{ userId: string; temporaryPassword?: string }> {
    const res = await this.request('POST', `/api/users`, { tenantId, email, role });
    return {
      userId: res?.user_id,
      temporaryPassword: res?.temporary_password
    };
  }

  async updateUserRole(tenantId: string, userId: string, role: string): Promise<void> {
    await this.request('PATCH', `/api/users/${userId}/role`, { tenantId, role });
  }

  async runAudit(tenantId: string): Promise<any> {
    return this.request('POST', `/api/audit/run`, { tenantId });
  }

  async getDiscrepancies(tenantId: string): Promise<AuditDiscrepancy[]> {
    const res = await this.request('GET', `/api/audit/discrepancies?tenantId=${tenantId}`);
    return res || [];
  }

  async resolveDiscrepancy(tenantId: string, id: string, notes: string): Promise<void> {
    await this.request('POST', `/api/audit/discrepancies/${id}/resolve`, { tenantId, notes });
  }

  async getOutboxStats(): Promise<OutboxStats> {
    try {
      const stats = await this.request('GET', `/api/outbox/stats`);
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
      const res = await this.request('GET', `/api/outbox/dead-letter${limit ? `?limit=${limit}` : ''}`);
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
    await this.request('POST', `/api/outbox/${id}/retry`);
  }

  async getTenantConfig(tenantId: string): Promise<TenantAccountingConfig> {
    const local = localStorage.getItem(`tenant_config_${tenantId}`);
    if (local) {
      return JSON.parse(local);
    }
    return {
      tenantId,
      accountingMethod: 'ACCRUAL',
      costingMethod: 'FIFO',
      currencyCode: 'USD',
      fiscalYearStart: '01-01'
    };
  }

  async saveTenantConfig(tenantId: string, config: { accountingMethod: string; costingMethod: string }): Promise<void> {
    const fullConfig = {
      tenantId,
      accountingMethod: config.accountingMethod as any,
      costingMethod: config.costingMethod as any,
      currencyCode: 'USD',
      fiscalYearStart: '01-01'
    };
    localStorage.setItem(`tenant_config_${tenantId}`, JSON.stringify(fullConfig));
  }

  async assembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: string, referenceId: string): Promise<void> {
    await this.request('POST', `/api/kits/assemble`, { tenantId, locationId, kitSku, quantity, actorId, referenceId });
  }

  async disassembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: string, referenceId: string): Promise<void> {
    await this.request('POST', `/api/kits/disassemble`, { tenantId, locationId, kitSku, quantity, actorId, referenceId });
  }

  async getQuarantinedItems(tenantId: string): Promise<QuarantinedItem[]> {
    try {
      const res = await this.request('GET', `/api/returns/quarantine?tenantId=${tenantId}`);
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
    await this.request('POST', `/api/returns/quarantine/${id}/resolve`, { tenantId, resolution });
  }

  async getValuationReport(tenantId: string, locationId?: string, method?: string): Promise<ValuationItem[]> {
    try {
      const valSummary = await this.request('GET', `/api/reports/valuation?tenantId=${tenantId}`);
      const products = await this.getProducts();
      const items: ValuationItem[] = [];
      const chosenMethod = (method || 'FIFO').toUpperCase();
      const invItems = await this.getInventoryItems();
      for (const p of products) {
        for (const v of p.variants) {
          const variantInv = invItems.filter(i => i.sku === v.sku);
          const qty = variantInv.reduce((sum, item) => sum + item.quantity, 0);
          const unitCost = 1000;
          if (qty > 0) {
            items.push({
              variantId: v.id,
              sku: v.sku,
              name: p.name + (v.attributes?.length ? ` (${v.attributes.map(a => a.value).join(', ')})` : ''),
              costingMethod: chosenMethod,
              totalQuantity: qty,
              totalValueCents: qty * unitCost,
              unitCostCents: unitCost
            });
          } else {
            items.push({
              variantId: v.id,
              sku: v.sku,
              name: p.name,
              costingMethod: chosenMethod,
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

  async getComplianceLedger(tenantId: string): Promise<any[]> {
    return await this.request('GET', `/api/compliance/ledger?tenantId=${tenantId}`);
  }

  async verifyComplianceLedger(tenantId: string): Promise<{ isValid: boolean; failedSequenceNumber?: number; reason?: string }> {
    return await this.request('POST', `/api/compliance/verify?tenantId=${tenantId}`);
  }
}
