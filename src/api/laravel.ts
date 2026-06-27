import { InventoryClient, InventoryItem, Product, StockOnboarding, JournalEntry, ShopifyConnection, SerializedItem, JournalLine, Item, ForecastingReportItem } from './client';

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
    // Generate barcode directly client-side if Laravel doesn't have an explicit generate endpoint
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000).toString();
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
}
