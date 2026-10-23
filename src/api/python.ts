import {
  InventoryClient,
  ApiUsageMetric,
  Role,
  Permission,
  InventoryItem,
  Product,
  StockOnboarding,
  JournalEntry,
  ShopifyConnection,
  SerializedItem,
  JournalLine,
  Item,
  ForecastingReportItem,
  FulfillmentPlan,
  ReorderPolicy,
  WebhookSubscription,
  WebhookDeliveryLog,
  WarehouseLocation,
  PutawaySuggestion,
  SlottingSuggestion,
  PurchaseOrder,
  PurchaseOrderItem,
  User,
  AuditDiscrepancy,
  OutboxStats,
  OutboxEvent,
  TenantAccountingConfig,
  QuarantinedItem,
  ValuationItem,
} from "./client";

const PYTHON_BASE_URL =
  import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8001";
const PYTHON_WS_URL =
  import.meta.env.VITE_PYTHON_WS_URL || "ws://localhost:8001";

export class PythonRESTAdapter implements InventoryClient {
  private getHeaders(customToken?: string): Record<string, string> {
    const activeToken = customToken || localStorage.getItem("auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (activeToken && activeToken !== "NONE") {
      headers["Authorization"] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  private async request(
    method: string,
    path: string,
    body?: any,
    customToken?: string,
  ): Promise<any> {
    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders(customToken),
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${PYTHON_BASE_URL}${path}`, options);
      if (!response.ok) {
        const errorText = await response.text();
        let parsedError;
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          parsedError = { error: errorText };
        }
        const httpError: any = new Error(
          parsedError.error ||
            parsedError.detail ||
            `HTTP ${response.status} Error`,
        );
        httpError.status = response.status;
        throw httpError;
      }
      return await response.json();
    } catch (err: any) {
      console.error("Python REST Adapter Error:", err);
      throw err;
    }
  }

  async login(
    tenantId: string,
    actorId: string,
    role?: string,
    password?: string,
  ): Promise<string> {
    if (!password) {
      throw new Error(
        "Authentication failed: Missing required password parameter.",
      );
    }

    try {
      // Try logging in directly
      const data = await this.request(
        "POST",
        "/auth/login",
        {
          tenantId,
          email: actorId.includes("@") ? actorId : `${actorId}@example.com`,
          password,
        },
        "NONE",
      );
      return data.token;
    } catch (err: any) {
      // If direct login fails (e.g. user does not exist), auto-run setup for seamless E2E experience
      if (
        err.message.includes("credentials") ||
        err.message.includes("401") ||
        err.message.includes("404")
      ) {
        try {
          await this.request(
            "POST",
            "/auth/setup",
            {
              orgName: `Organization ${tenantId}`,
              tenantId,
              adminName: actorId,
              adminEmail: actorId.includes("@")
                ? actorId
                : `${actorId}@example.com`,
              adminPassword: password,
            },
            "NONE",
          );

          // Login again after successful setup
          const data = await this.request(
            "POST",
            "/auth/login",
            {
              tenantId,
              email: actorId.includes("@") ? actorId : `${actorId}@example.com`,
              password,
            },
            "NONE",
          );
          return data.token;
        } catch (setupErr: any) {
          throw new Error(
            `Login failed, and setup auto-recovery also failed: ${setupErr.message}`,
          );
        }
      }
      throw err;
    }
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return this.request("GET", "/inventory");
  }

  async getProducts(): Promise<Product[]> {
    return this.request("GET", "/inventory/products");
  }

  async getConnections(tenantId: string): Promise<any> {
    return this.request(
      "GET",
      `/integrations/connections?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]> {
    const connections = await this.getConnections(tenantId);
    return connections.filter((row: any) => row.provider === 'SHOPIFY').map((row: any) => ({
      id: row.id, tenantId, platform: 'shopify', storeDomain: row.origin, isActive: row.active,
    }));
  }

  async createIntegrationConnection(data: Record<string, unknown>): Promise<any> {
    return this.request('POST', '/integrations/connections', data);
  }

  async setIntegrationConnectionActive(id: string, data: Record<string, unknown>): Promise<any> {
    return this.request('POST', `/integrations/connections/${encodeURIComponent(id)}/active`, data);
  }

  async getIntegrationDeliveries(tenantId: string): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await this.request('GET', `/integrations/deliveries?tenantId=${encodeURIComponent(tenantId)}&limit=1000&offset=${offset}`);
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  async retryIntegrationDelivery(id: string, data: Record<string, unknown>): Promise<any> {
    return this.request('POST', `/integrations/deliveries/${encodeURIComponent(id)}/retry`, data);
  }

  async dispatchIntegrationConnection(id: string): Promise<any> {
    return this.request('POST', `/integrations/connections/${encodeURIComponent(id)}/dispatch`);
  }

  async getIntegrationOrders(tenantId: string): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await this.request('GET', `/integrations/orders?tenantId=${encodeURIComponent(tenantId)}&limit=1000&offset=${offset}`);
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }

  async completeIntegrationOrder(id: string, action: 'fulfill' | 'cancel', data: Record<string, unknown>): Promise<any> {
    return this.request('POST', `/integrations/orders/${encodeURIComponent(id)}/${action}`, data);
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await this.request("GET", `/accounting/ledger?tenantId=${encodeURIComponent(tenantId)}&limit=1000&offset=${offset}`);
      entries.push(...page);
      if (page.length < 1000) return entries;
    }
  }

  async getFinancialStatus(tenantId: string): Promise<any> {
    return this.request("GET", `/accounting/financial/status?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getFinancialOpeningPreview(tenantId: string): Promise<any> {
    return this.request("GET", `/accounting/financial/opening-preview?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async activateFinancialAccounting(data: { tenantId?: string; expectedVersion: number; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", "/accounting/financial/activate", data);
  }

  async getFinancialTrialBalance(tenantId: string, asOf?: string): Promise<any> {
    return this.request("GET", `/accounting/trial-balance?tenantId=${encodeURIComponent(tenantId)}${asOf ? `&asOf=${encodeURIComponent(asOf)}` : ""}`);
  }

  async getFinancialReconciliation(tenantId: string): Promise<any> {
    return this.request("GET", `/accounting/financial/reconciliation?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getFinancialSources(tenantId: string, status?: string): Promise<any[]> {
    return this.request("GET", `/accounting/sources?tenantId=${encodeURIComponent(tenantId)}&limit=1000${status ? `&status=${encodeURIComponent(status)}` : ""}`);
  }

  async postFinancialJournal(data: { tenantId?: string; date: string; description: string; method: string; lines: JournalLine[];
    mutationId: string; reason: string; referenceId?: string }): Promise<JournalEntry> {
    return this.request("POST", "/accounting/journals", data);
  }

  async reverseFinancialJournal(id: string, data: { tenantId?: string; date: string; mutationId: string; reason: string }): Promise<JournalEntry> {
    return this.request("POST", `/accounting/journals/${encodeURIComponent(id)}/reverse`, data);
  }

  async closeFinancialPeriod(data: { tenantId?: string; closedThrough: string; expectedVersion: number; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", "/accounting/financial/close-period", data);
  }

  async createFinancialDocument(data: { tenantId?: string; kind: "SALE" | "PURCHASE"; date: string; reference: string;
    counterparty: string; supplierId?: string; amountCents: number; sourceIds: string[]; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", "/accounting/documents", data);
  }

  async settleFinancialDocument(id: string, data: { tenantId?: string; expectedVersion: number; amountCents: number;
    date: string; reference: string; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", `/accounting/documents/${encodeURIComponent(id)}/settle`, data);
  }

  async applyFinancialCredit(id: string, data: { tenantId?: string; expectedVersion: number; sourceId: string; amountCents: number;
    date: string; reference: string; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", `/accounting/documents/${encodeURIComponent(id)}/credit`, data);
  }

  async refundFinancialDocument(id: string, data: { tenantId?: string; expectedVersion: number; amountCents: number;
    date: string; reference: string; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", `/accounting/documents/${encodeURIComponent(id)}/refund`, data);
  }

  async resolveFinancialSource(id: string, data: { tenantId?: string; expectedVersion: number; date: string;
    referenceId: string; lines: JournalLine[]; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", `/accounting/sources/${encodeURIComponent(id)}/resolve`, data);
  }

  async getStockOnboardings(tenantId: string): Promise<StockOnboarding[]> {
    try {
      const data = await this.request(
        "GET",
        `/onboarding?tenantId=${encodeURIComponent(tenantId)}`,
      );
      return data || [];
    } catch {
      return [];
    }
  }

  async createProduct(id: string, name: string): Promise<void> {
    await this.request("POST", "/inventory/products", { id, name });
  }

  async addProductVariant(
    productId: string,
    sku: string,
    trackingMode: string,
    attributes: { name: string; value: string }[],
  ): Promise<void> {
    await this.request("POST", `/inventory/products/${productId}/variants`, {
      sku,
      trackingMode,
      attributes,
    });
  }

  async assignBarcode(
    sku: string,
    value: string,
    symbology: string,
    source: string,
    makePrimary: boolean,
  ): Promise<void> {
    await this.request("POST", "/barcodes/assign", {
      sku,
      barcodeValue: value,
      symbology,
      source,
      makePrimary,
    });
  }

  async generateInternalBarcode(
    sku: string,
    tenantId: string,
  ): Promise<string> {
    const data = await this.request("POST", "/barcodes/generate", {
      sku,
      tenantId,
    });
    return data.barcodeValue;
  }

  async scanBarcode(
    value: string,
    context: string,
    amount: number,
    actualQuantity: number,
    tenantId: string,
    locationId: string,
    actorId: string,
  ): Promise<any> {
    return this.request("POST", "/barcodes/scan", {
      barcodeValue: value,
      context,
      scannedAmount: amount,
      actualQuantity,
      tenantId,
      locationId,
      actorId,
    });
  }

  async traceSerialHistory(serialNumber: string): Promise<SerializedItem> {
    return this.request("GET", `/serials/trace/${encodeURIComponent(serialNumber)}`);
  }

  async registerSerial(data: { sku: string; serialNumber: string; locationId?: string; mutationId: string; reason: string; referenceId?: string }): Promise<SerializedItem> {
    return this.request("POST", "/serials", data);
  }

  async getSerializedItems(sku?: string): Promise<SerializedItem[]> {
    return this.request("GET", `/serials?limit=1000${sku ? `&sku=${encodeURIComponent(sku)}` : ""}`);
  }

  async changeSerial(serialNumber: string, action: "receive" | "sell" | "return" | "restock" | "quarantine" | "damage" | "write-off" | "transfer" | "reserve" | "release" | "price",
    data: { expectedVersion: number; mutationId: string; reason: string; referenceId: string; locationId?: string; destinationId?: string; unitCostCents?: number; expirationDate?: string }): Promise<SerializedItem> {
    return this.request("POST", `/serials/${encodeURIComponent(serialNumber)}/${action}`, data);
  }

  async getKitDefinitions(): Promise<any[]> {
    return this.request("GET", "/kits?limit=1000");
  }

  async defineKit(data: { sku: string; name: string; components: { sku: string; quantity: number }[];
    expectedVersion: number; mutationId: string; reason: string }): Promise<any> {
    return this.request("POST", "/kits", data);
  }

  async mutateKit(action: "assemble" | "disassemble" | "sale", data: { tenantId?: string; kitSku: string; locationId: string; quantity: number;
    expectedVersion: number; stockVersions: Record<string, number>; mutationId: string; reason: string; referenceId: string }): Promise<any> {
    return this.request("POST", `/kits/${action}`, data);
  }

  private async legacyKitCommand(action: "assemble" | "disassemble", tenantId: string, locationId: string, kitSku: string, quantity: number, referenceId: string): Promise<void> {
    const cacheKey = `python-kit:${JSON.stringify([action, tenantId, locationId, kitSku, referenceId])}`;
    const cached = sessionStorage.getItem(cacheKey);
    let payload;
    if (cached) {
      payload = JSON.parse(cached);
      if (payload.quantity !== quantity) throw new Error("Kit reference was already used with another quantity.");
    } else {
      const formula = await this.request("GET", `/kits/${encodeURIComponent(kitSku)}`);
      const stock: any[] = [];
      for (let offset = 0; ; offset += 1000) {
        const page = await this.request("GET", `/inventory?tenantId=${encodeURIComponent(tenantId)}&limit=1000&offset=${offset}`);
        stock.push(...page);
        if (page.length < 1000) break;
      }
      const skus = action === "disassemble" ? [kitSku] : [...formula.components.map((c: any) => c.sku), kitSku];
      const stockVersions = Object.fromEntries(skus.map((sku: string) => [sku, stock.find((s: any) => s.sku === sku && s.locationId === locationId)?.version ?? 0]));
      payload = { tenantId, kitSku, locationId, quantity, expectedVersion: formula.version, stockVersions,
        mutationId: crypto.randomUUID(), reason: `Operator requested ${action}`, referenceId };
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    }
    try {
      await this.mutateKit(action, payload);
    } catch (error: any) {
      if ([400, 401, 403, 404, 409, 422].includes(error.status)) sessionStorage.removeItem(cacheKey);
      throw error;
    }
    // Keep the original versioned command for an explicit repeat of this reference.
  }

  async connectShopify(
    tenantId: string,
    storeDomain: string,
    accessToken: string,
  ): Promise<void> {
    await this.request("POST", "/shopify/connect", {
      tenantId,
      storeDomain,
      accessToken,
    });
  }

  async connectAmazon(
    tenantId: string,
    sellerId: string,
    mwsAuthToken: string,
    marketplaceId: string,
  ): Promise<void> {
    await this.request("POST", "/integrations/amazon/connect", {
      tenantId,
      sellerId,
      mwsAuthToken,
      marketplaceId,
    });
  }

  async connectWooCommerce(
    tenantId: string,
    storeUrl: string,
    consumerKey: string,
    consumerSecret: string,
  ): Promise<void> {
    await this.request("POST", "/integrations/woocommerce/connect", {
      tenantId,
      storeUrl,
      consumerKey,
      consumerSecret,
    });
  }

  async createJournalEntry(
    tenantId: string,
    description: string,
    method: string,
    lines: JournalLine[],
  ): Promise<void> {
    const pendingKey = `python-journal:${JSON.stringify([PYTHON_BASE_URL, tenantId, description, method, lines])}`;
    const cached = sessionStorage.getItem(pendingKey);
    const payload = cached ? JSON.parse(cached) : { tenantId, description, method, lines,
      date: new Date().toISOString().slice(0, 10), mutationId: crypto.randomUUID(), reason: "Operator posted manual journal" };
    sessionStorage.setItem(pendingKey, JSON.stringify(payload));
    try {
      await this.postFinancialJournal(payload);
    } catch (error: any) {
      if ([400, 401, 403, 404, 409, 422].includes(error.status)) sessionStorage.removeItem(pendingKey);
      throw error;
    }
    sessionStorage.removeItem(pendingKey);
  }

  async createStockOnboarding(
    tenantId: string,
    locationId: string,
    asOfDate: string,
    items: Item[],
  ): Promise<void> {
    const data = await this.request("POST", "/onboarding", {
      tenantId,
      locationId,
      asOfDate,
    });
    const onboardingId = data.id;

    // ⚡ Bolt: Chunked Promise.all execution to prevent overwhelming server while resolving N+1 sequential requests
    for (let i = 0; i < items.length; i += 10) {
      const batch = items.slice(i, i + 10);
      const promises = batch.map((item) =>
        this.request("POST", `/onboarding/${onboardingId}/items`, {
          variantId: item.variantId,
          quantity: item.quantity,
          unitCostCents: item.unitCostCents,
        }),
      );
      await Promise.all(promises);
    }
  }

  async submitStockOnboarding(onboardingId: string): Promise<void> {
    await this.request("POST", `/onboarding/${onboardingId}/submit`);
  }

  async getForecastingReport(
    locationId: string,
  ): Promise<ForecastingReportItem[]> {
    const data = await this.request(
      "GET",
      `/forecasting/report?locationId=${encodeURIComponent(locationId)}`,
    );
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
      safetyStock: item.safetyStock || 0,
    }));
  }

  subscribeBarcodeScans(
    tenantId: string,
    onScan: (scan: any) => void,
  ): () => void {
    const ws = new WebSocket(
      `${PYTHON_WS_URL}?tenantId=${encodeURIComponent(tenantId)}`,
    );

    ws.addEventListener("open", () => {
      const activeToken = localStorage.getItem("auth_token") || "";
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "authenticate", token: activeToken }));
      }
    });

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "barcode_scanned") {
          onScan({
            scanValue: data.scanValue,
            symbology: data.symbology,
            context: data.context,
            status:
              data.status === "success"
                ? "Scanned successfully"
                : "Error in scan",
            time: data.time || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Python WS Parse Error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("Python WS Error:", err);
    };

    return () => {
      ws.close();
    };
  }

  // --- Advanced Admin Operations for Express ---

  // Order Routing
  async routeOrder(
    sku: string,
    quantity: number,
    destinationAddress: string,
    strategyName: string,
  ): Promise<FulfillmentPlan> {
    return this.request("POST", "/shipping/route", {
      sku,
      quantity,
      destinationAddress,
      strategyName,
    });
  }

  // Reorder Policies
  async getReorderPolicies(tenantId: string): Promise<ReorderPolicy[]> {
    return this.request(
      "GET",
      `/reorder-policies?tenantId=${encodeURIComponent(tenantId)}&limit=1000`,
    );
  }

  async saveReorderPolicy(
    tenantId: string,
    policy: ReorderPolicy,
  ): Promise<void> {
    await this.request("POST", "/reorder-policies", {
      tenantId,
      ...policy,
      expectedVersion: policy.version,
      mutationId: crypto.randomUUID(),
    });
  }

  async evaluateReorderPolicies(tenantId: string): Promise<void> {
    await this.request("POST", "/reorder-policies/evaluate", { tenantId });
  }

  // Webhooks
  async getWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const data = await this.request(
      "GET",
      `/webhooks?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return data || [];
  }

  async createWebhook(
    tenantId: string,
    url: string,
    eventTypes: string[],
  ): Promise<void> {
    await this.request("POST", "/webhooks", { tenantId, url, eventTypes });
  }

  async deleteWebhook(tenantId: string, id: string): Promise<void> {
    await this.request(
      "DELETE",
      `/webhooks/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getWebhookDeliveries(tenantId: string): Promise<WebhookDeliveryLog[]> {
    try {
      const data = await this.request(
        "GET",
        `/webhooks/deliveries?tenantId=${encodeURIComponent(tenantId)}`,
      );
      return data || [];
    } catch {
      return [];
    }
  }

  // WMS Layout
  async getWarehouseLocations(tenantId: string): Promise<WarehouseLocation[]> {
    const data = await this.request(
      "GET",
      `/warehouse-locations?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return data || [];
  }

  async saveWarehouseLocation(
    tenantId: string,
    location: WarehouseLocation,
  ): Promise<void> {
    await this.request("POST", "/warehouse-locations", {
      tenantId,
      ...location,
    });
  }

  async deleteWarehouseLocation(tenantId: string, id: string): Promise<void> {
    await this.request(
      "DELETE",
      `/warehouse-locations/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getPutawaySuggestions(
    tenantId: string,
    sku: string,
    quantity: number,
  ): Promise<PutawaySuggestion[]> {
    return this.request("POST", "/warehouse-locations/putaway-suggestions", {
      tenantId,
      sku,
      quantity,
    });
  }

  async getOptimizedPickRoute(
    tenantId: string,
    skus: string[],
  ): Promise<string[]> {
    const data = await this.request(
      "POST",
      "/warehouse-locations/optimize-pick-route",
      { tenantId, skus },
    );
    if (!Array.isArray(data)) return [];
    return data.flatMap((group: any) =>
      (group.items || []).map(
        (it: any) =>
          `${it.sku} from bin ${it.locationId} (Aisle ${it.aisle || "N/A"}, Rack ${it.rack || "N/A"}, Shelf ${it.shelf || "N/A"})`,
      ),
    );
  }

  // Procurement (PO)
  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    return this.request(
      "GET",
      `/purchase-orders?tenantId=${encodeURIComponent(tenantId)}&limit=1000`,
    );
  }

  async createPurchaseOrder(
    tenantId: string,
    supplier: string,
    items: PurchaseOrderItem[],
  ): Promise<void> {
    const suppliers = await this.getSuppliers(tenantId);
    const matches = suppliers.filter(
      (row) =>
        row.id === supplier ||
        row.name.toLowerCase() === supplier.trim().toLowerCase(),
    );
    if (matches.length > 1)
      throw new Error(
        "More than one supplier matches this name; choose the intended supplier.",
      );
    if (matches[0] && !matches[0].isActive)
      throw new Error("Supplier is inactive.");
    if (!matches.length && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(supplier))
      throw new Error("Supplier not found.");
    const supplierId =
      matches[0]?.id ||
      (await this.createSupplier(tenantId, supplier.trim())).id;
    const pendingKey = `python-po-create:${JSON.stringify({ tenantId, supplierId, items })}`;
    const mutationId =
      sessionStorage.getItem(pendingKey) || crypto.randomUUID();
    sessionStorage.setItem(pendingKey, mutationId);
    await this.request("POST", "/purchase-orders", {
      tenantId,
      supplierId,
      items,
      mutationId,
    });
    sessionStorage.removeItem(pendingKey);
  }

  async approvePurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request(
      "POST",
      `/purchase-orders/${encodeURIComponent(id)}/approve`,
      { tenantId, mutationId: crypto.randomUUID() },
    );
  }

  async sendPurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request(
      "POST",
      `/purchase-orders/${encodeURIComponent(id)}/send`,
      { tenantId, mutationId: crypto.randomUUID() },
    );
  }

  async receivePurchaseOrder(
    tenantId: string,
    id: string,
    items: { sku: string; quantity: number }[],
    receiptId?: string,
  ): Promise<void> {
    const pendingKey = `python-po-receipt:${JSON.stringify({ tenantId, id, items })}`;
    const stableId =
      receiptId || sessionStorage.getItem(pendingKey) || crypto.randomUUID();
    sessionStorage.setItem(pendingKey, stableId);
    await this.request(
      "POST",
      `/purchase-orders/${encodeURIComponent(id)}/receive`,
      {
        tenantId,
        items,
        receiptId: stableId,
      },
    );
    sessionStorage.removeItem(pendingKey);
  }

  async getSuppliers(tenantId: string): Promise<any[]> {
    return this.request(
      "GET",
      `/suppliers?tenantId=${encodeURIComponent(tenantId)}&limit=1000`,
    );
  }

  async createSupplier(
    tenantId: string,
    name: string,
    email?: string,
    leadTimeDays = 0,
  ): Promise<any> {
    return this.request("POST", "/suppliers", {
      tenantId,
      name,
      email,
      leadTimeDays,
      mutationId: crypto.randomUUID(),
    });
  }

  async getReplenishmentSuggestions(tenantId: string): Promise<any[]> {
    return this.request(
      "GET",
      `/reorder-policies/suggestions?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async draftSuggestedPurchaseOrder(
    policyId: string,
    version: number,
    mutationId: string,
  ): Promise<any> {
    return this.request(
      "POST",
      `/reorder-policies/${encodeURIComponent(policyId)}/draft`,
      { expectedVersion: version, mutationId },
    );
  }

  // FEFO & Recall
  async getFefoPickSuggestions(
    tenantId: string,
    sku: string,
    quantity: number,
  ): Promise<any[]> {
    return this.request(
      "GET",
      `/inventory/fefo-pick?sku=${encodeURIComponent(sku)}&quantity=${encodeURIComponent(quantity)}&tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async traceRecall(tenantId: string, lotNumber: string): Promise<any> {
    return this.request(
      "GET",
      `/inventory/reports/recall/${encodeURIComponent(lotNumber)}?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  // --- Unified Admin Portal Operations for Express ---
  async getUsers(tenantId: string): Promise<User[]> {
    const res = await this.request(
      "GET",
      `/users?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return res?.users || [];
  }

  async inviteUser(
    tenantId: string,
    email: string,
    role: string,
  ): Promise<{ userId: string; temporaryPassword?: string }> {
    return this.request("POST", `/users`, { tenantId, email, role });
  }

  async updateUserRole(
    tenantId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    await this.request("PATCH", `/users/${userId}/role`, { tenantId, role });
  }

  // RBAC
  async getRoles(tenantId: string): Promise<Role[]> {
    return this.request(
      "GET",
      `/roles?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getPermissions(): Promise<Permission[]> {
    return this.request("GET", `/roles/permissions`);
  }

  async createRole(
    tenantId: string,
    name: string,
    description: string,
    permissionIds: string[],
  ): Promise<Role> {
    return this.request("POST", `/roles`, {
      tenantId,
      name,
      description,
      permissionIds,
    });
  }

  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.request("PUT", `/roles/${roleId}/permissions`, {
      permissionIds,
    });
  }

  async deleteRole(roleId: string): Promise<void> {
    await this.request("DELETE", `/roles/${roleId}`);
  }

  async runAudit(tenantId: string): Promise<any> {
    return this.request("POST", `/audit/run`, { tenantId });
  }

  async getDiscrepancies(tenantId: string): Promise<AuditDiscrepancy[]> {
    const res = await this.request(
      "GET",
      `/audit/discrepancies?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return res || [];
  }

  async resolveDiscrepancy(
    tenantId: string,
    id: string,
    notes: string,
  ): Promise<void> {
    await this.request("POST", `/audit/discrepancies/${id}/resolve`, {
      tenantId,
      notes,
    });
  }

  async getOutboxStats(): Promise<OutboxStats> {
    const stats = await this.request("GET", "/outbox/stats");
    return { pendingCount: stats.pending, publishedCount: stats.published, failedCount: stats.failed };
  }

  async getDeadLetterEvents(limit?: number): Promise<OutboxEvent[]> {
    const res = await this.request("GET", `/outbox/dead-letter${limit !== undefined ? `?limit=${limit}` : ""}`);
    return res.map((event: any) => ({ id: event.id, eventType: event.eventType,
      payload: JSON.stringify(event.payload), error: event.error, status: event.status,
      occurredAt: event.createdAt ?? "", version: event.version, attempts: event.attempts, sequence: event.sequence }));
  }

  async retryOutboxEvent(id: string): Promise<void> {
    const pendingKey = `python-outbox-retry:${id}`;
    const cached = sessionStorage.getItem(pendingKey);
    let payload;
    if (cached) payload = JSON.parse(cached);
    else {
      const event = await this.request("GET", `/outbox/${encodeURIComponent(id)}`);
      if (event.status !== "DEAD_LETTER") throw new Error("Only a dead-letter event can be retried; refresh the list.");
      payload = { expectedVersion: event.version, mutationId: crypto.randomUUID(), reason: "Operator requested redelivery" };
      sessionStorage.setItem(pendingKey, JSON.stringify(payload));
    }
    try {
      await this.request("POST", `/outbox/${encodeURIComponent(id)}/retry`, payload);
    } catch (error: any) {
      if ([400, 401, 403, 404, 409, 422].includes(error.status)) sessionStorage.removeItem(pendingKey);
      throw error;
    }
    sessionStorage.removeItem(pendingKey);
  }

  async getTenantConfig(tenantId: string): Promise<TenantAccountingConfig> {
    return this.request("GET", `/accounting/tenant-config/${tenantId}`);
  }

  async saveTenantConfig(
    tenantId: string,
    config: { accountingMethod: string; costingMethod: string },
  ): Promise<void> {
    await this.request("POST", `/accounting/tenant-config`, {
      tenantId,
      ...config,
    });
  }

  async assembleKit(
    tenantId: string,
    locationId: string,
    kitSku: string,
    quantity: number,
    actorId: string,
    referenceId: string,
  ): Promise<void> {
    await this.legacyKitCommand("assemble", tenantId, locationId, kitSku, quantity, referenceId);
  }

  async disassembleKit(
    tenantId: string,
    locationId: string,
    kitSku: string,
    quantity: number,
    actorId: string,
    referenceId: string,
  ): Promise<void> {
    await this.legacyKitCommand("disassemble", tenantId, locationId, kitSku, quantity, referenceId);
  }

  async getQuarantinedItems(tenantId: string): Promise<QuarantinedItem[]> {
    return this.request("GET", `/returns/quarantine?tenantId=${encodeURIComponent(tenantId)}&limit=1000`);
  }

  async resolveQuarantine(
    tenantId: string,
    id: string,
    resolution: string,
  ): Promise<void> {
    const pendingKey = `python-quarantine:${JSON.stringify({ tenantId, id, resolution })}`;
    const cached = sessionStorage.getItem(pendingKey);
    let data;
    if (cached) data = JSON.parse(cached);
    else {
      const item = (await this.getQuarantinedItems(tenantId)).find(row => row.id === id);
      if (!item || item.version === undefined) throw new Error("Quarantine item is no longer pending; refresh the list.");
      data = { tenantId, resolution, expectedVersion: item.version,
        reason: "Inspection decision", mutationId: crypto.randomUUID() };
      sessionStorage.setItem(pendingKey, JSON.stringify(data));
    }
    try {
      await this.request("POST", `/returns/quarantine/${encodeURIComponent(id)}/resolve`, data);
    } catch (error: any) {
      if ([400, 404, 409, 422].includes(error.status)) sessionStorage.removeItem(pendingKey);
      throw error;
    }
    sessionStorage.removeItem(pendingKey);
  }

  async getReturns(tenantId: string): Promise<any[]> {
    return this.request("GET", `/returns/rmas?tenantId=${encodeURIComponent(tenantId)}&limit=1000`);
  }

  async createReturn(tenantId: string, data: { kind?: "CUSTOMER" | "SUPPLIER"; sourceMovementId: string;
    items: { layerId: string; quantity: number; disposition?: "RESTOCK" | "QUARANTINE" | "SCRAP" | "RETURN_TO_VENDOR" }[];
    reason: string; refundReference?: string; mutationId: string }): Promise<any> {
    return this.request("POST", "/returns/rmas", { tenantId, ...data });
  }

  async reviewReturn(id: string, action: "authorize" | "cancel", expectedVersion: number,
    reason: string, mutationId: string): Promise<any> {
    return this.request("POST", `/returns/rmas/${encodeURIComponent(id)}/${action}`, { expectedVersion, reason, mutationId });
  }

  async receiveReturn(id: string, expectedVersion: number, receiptId: string,
    items: { layerId: string; quantity: number }[]): Promise<any> {
    return this.request("POST", `/returns/rmas/${encodeURIComponent(id)}/receive`, { expectedVersion, receiptId, items });
  }

  async shipSupplierReturn(id: string, expectedVersion: number, shipmentId: string,
    items: { layerId: string; quantity: number }[]): Promise<any> {
    return this.request("POST", `/returns/rmas/${encodeURIComponent(id)}/ship`, { expectedVersion, shipmentId, items });
  }

  async writeOffStock(data: { sku: string; locationId?: string; quantity: number | string; unit?: string; uomVersion?: number; expectedVersion: number;
    reasonCode: "DAMAGE" | "THEFT" | "EXPIRED" | "OBSOLETE" | "SHRINKAGE"; reason: string;
    mutationId: string; layerId?: string; lotNumber?: string; reference?: string }): Promise<any> {
    return this.request("POST", "/returns/write-offs", data);
  }

  async getStockTransfers(tenantId: string): Promise<any[]> {
    return this.request("GET", `/inventory/transfers?tenantId=${encodeURIComponent(tenantId)}&limit=1000`);
  }

  async createStockTransfer(data: { sourceLocationId: string; destinationLocationId: string;
    items: { sku: string; quantity: number | string; unit?: string; uomVersion?: number; lotNumber?: string }[];
    reference?: string; mutationId: string }): Promise<any> {
    return this.request("POST", "/inventory/transfers", data);
  }

  async reviewStockTransfer(id: string, action: "dispatch" | "receive" | "cancel", data: {
    expectedVersion: number; reason: string; mutationId: string; sourceVersions?: Record<string, number> }): Promise<any> {
    return this.request("POST", `/inventory/transfers/${encodeURIComponent(id)}/${action}`, data);
  }

  async getUomConfiguration(sku: string): Promise<any> {
    return this.request("GET", `/uom/configurations/${encodeURIComponent(sku)}`);
  }

  async configureUom(data: { sku: string; baseUnit: string; category: "discrete" | "weight" | "volume";
    purchaseUnit?: string; saleUnit?: string; rules: { unit: string; factorToBase: string }[];
    expectedVersion: number; mutationId: string }): Promise<any> {
    return this.request("POST", "/uom/configurations", data);
  }

  async convertUom(sku: string, quantity: number | string, fromUnit: string, toUnit?: string): Promise<any> {
    return this.request("POST", `/uom/configurations/${encodeURIComponent(sku)}/convert`, { quantity, fromUnit, toUnit });
  }

  async mutateStockInUnit(operation: "receive" | "dispatch" | "allocate" | "release-allocation" | "fulfill-allocation",
    data: { sku: string; locationId?: string; quantity: number | string; unit: string; uomVersion: number;
      mutationId: string; expectedVersion?: number; unitCostCents?: number; lotNumber?: string;
      expirationDate?: string; quarantined?: boolean }): Promise<any> {
    return this.request("POST", `/inventory/${operation}`, data);
  }

  async getValuationReport(
    tenantId: string,
    locationId?: string,
    method?: string,
  ): Promise<ValuationItem[]> {
    const params = new URLSearchParams({ tenantId });
    if (locationId) params.set("locationId", locationId);
    if (method) params.set("method", method);
    return this.request(
      "GET",
      `/accounting/valuation-report?${params.toString()}`,
    );
  }

  async getSlottingSuggestions(
    tenantId: string,
  ): Promise<SlottingSuggestion[]> {
    return this.request(
      "GET",
      `/warehouse-locations/slotting-suggestions?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getComplianceLedger(tenantId: string): Promise<any[]> {
    return this.request(
      "GET",
      `/compliance/ledger?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async verifyComplianceLedger(tenantId: string): Promise<{
    isValid: boolean;
    failedSequenceNumber?: number;
    reason?: string;
  }> {
    return this.request(
      "POST",
      `/compliance/verify?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async reconstructState(tenantId: string, timestamp?: string): Promise<any> {
    const url = timestamp
      ? `/compliance/reconstruct?tenantId=${encodeURIComponent(tenantId)}&timestamp=${encodeURIComponent(timestamp)}`
      : `/compliance/reconstruct?tenantId=${encodeURIComponent(tenantId)}`;
    return this.request("GET", url);
  }

  async replayAudit(tenantId: string, upToTimestamp?: string): Promise<any[]> {
    const url = upToTimestamp
      ? `/compliance/replay?tenantId=${encodeURIComponent(tenantId)}&timestamp=${encodeURIComponent(upToTimestamp)}`
      : `/compliance/replay?tenantId=${encodeURIComponent(tenantId)}`;
    return this.request("GET", url);
  }

  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRatio: number;
    invalidations: number;
    activeKeysCount: number;
  }> {
    return this.request("GET", `/admin/cache/stats`);
  }

  async clearCache(
    tenantId?: string,
  ): Promise<{ success: boolean; clearedKeysCount: number }> {
    const url = tenantId
      ? `/admin/cache/clear?tenantId=${encodeURIComponent(tenantId)}`
      : `/admin/cache/clear`;
    return this.request("POST", url);
  }

  async getRfidTags(tenantId: string): Promise<any[]> {
    const res = await this.request(
      "GET",
      `/rfid/tags?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return res.tags || [];
  }

  async assignRfidTag(
    tenantId: string,
    epc: string,
    sku: string,
    serialNumber: string,
  ): Promise<void> {
    await this.request(
      "POST",
      `/rfid/assign?tenantId=${encodeURIComponent(tenantId)}`,
      { epc, sku, serialNumber },
    );
  }

  async simulateRfidScan(
    tenantId: string,
    locationId: string,
    tags: string[],
  ): Promise<void> {
    await this.request(
      "POST",
      `/rfid/simulate-scan?tenantId=${encodeURIComponent(tenantId)}`,
      { locationId, tags },
    );
  }

  subscribeRfidScans(
    tenantId: string,
    onScanProcessed: (event: any) => void,
  ): () => void {
    const ws = new WebSocket(
      `${PYTHON_WS_URL}?tenantId=${encodeURIComponent(tenantId)}`,
    );

    ws.addEventListener("open", () => {
      const activeToken = localStorage.getItem("auth_token") || "";
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "authenticate", token: activeToken }));
      }
    });

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "rfid_scan_processed") {
          onScanProcessed({
            id: data.id,
            tenantId: data.tenantId,
            locationId: data.locationId,
            totalCount: data.totalCount,
            matchedCount: data.matchedCount,
            unmatchedCount: data.unmatchedCount,
            unmatchedEpcs: data.unmatchedEpcs,
          });
        }
      } catch (err) {
        console.error("Python WS Rfid Parse Error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("Python WS Rfid Error:", err);
    };

    return () => {
      ws.close();
    };
  }

  async analyzeInventoryAnomalies(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const params = new URLSearchParams({ tenantId });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return await this.request(
      "GET",
      `/anomaly-detection/analyze?${params.toString()}`,
    );
  }

  async getRebalanceMatrix(tenantId: string): Promise<any> {
    return await this.request(
      "GET",
      `/rebalance/matrix?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  // Approvals
  async getApprovalWorkflows(): Promise<any[]> {
    return await this.request("GET", "/approvals/workflows");
  }

  async toggleApprovalWorkflow(id: string): Promise<any> {
    return await this.request("POST", `/approvals/workflows/${id}/toggle`);
  }

  async getPendingApprovals(): Promise<any[]> {
    return await this.request("GET", "/approvals/pending");
  }

  async submitApprovalDecision(
    id: string,
    decision: string,
    notes: string,
  ): Promise<any> {
    return await this.request("POST", `/approvals/${id}/decide`, {
      decision,
      notes,
    });
  }

  async getApprovalHistory(requestId: string): Promise<any[]> {
    const data = await this.request("GET", `/approvals/${requestId}`);
    return data.decisions || [];
  }

  // Reporting & Analytics
  async getReportDefinitions(tenantId: string): Promise<any[]> {
    const result = await this.request(
      "GET",
      `/reports?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return result.reports;
  }

  async createReportDefinition(tenantId: string, payload: any): Promise<any> {
    return await this.request("POST", `/reports`, { ...payload, tenantId });
  }

  async scheduleReport(
    tenantId: string,
    reportId: string,
    cronExpression: string,
    deliveryMethod: string,
  ): Promise<any> {
    return await this.request("POST", `/reports/${encodeURIComponent(reportId)}/schedule`, {
      tenantId,
      cronExpression,
      deliveryMethod,
    });
  }

  async executeReport(
    tenantId: string,
    reportId: string,
    format: string,
  ): Promise<any> {
    return await this.request("POST", `/reports/${encodeURIComponent(reportId)}/execute`, {
      tenantId,
      format,
    });
  }

  async getDashboardWidgets(tenantId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/widgets?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async saveDashboardWidget(tenantId: string, widget: any): Promise<any> {
    return await this.request("POST", `/widgets`, { ...widget, tenantId });
  }

  // --- Item 15: Operational Depth ---
  async startCycleCount(
    tenantId: string,
    name: string,
    isBlindCount: boolean,
    abcClass?: string,
    zone?: string,
  ): Promise<any> {
    const result = await this.request("POST", "/api/cycle-counts/start", {
      tenantId,
      name,
      is_blind_count: isBlindCount,
      location_id: zone || "default",
      mutation_id: crypto.randomUUID(),
    });
    return { ...result, id: result.record_id };
  }
  async submitCycleCount(id: string, countedLines: any): Promise<void> {
    const lines = Array.isArray(countedLines)
      ? countedLines
      : countedLines.items;
    await this.request("POST", "/api/cycle-counts/submit", {
      record_id: id,
      revision: countedLines.revision ?? 0,
      mutation_id: countedLines.mutationId || crypto.randomUUID(),
      items: lines.map((line: any) => ({
        sku: line.sku,
        counted_quantity: line.counted_quantity ?? line.countedQuantity,
      })),
    });
  }
  async getCycleCounts(tenantId: string): Promise<any[]> {
    const rows = await this.request(
      "GET",
      `/api/cycle-counts?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return rows.map((row: any) => ({ ...row, id: row.record_id }));
  }

  async reviewCycleCount(
    id: string,
    action: "approve" | "recount",
    revision: number,
    reason: string,
    mutationId: string,
  ): Promise<any> {
    return this.request(
      "POST",
      `/api/cycle-counts/${encodeURIComponent(id)}/${action}`,
      { revision, reason, mutation_id: mutationId },
    );
  }

  async adjustStock(data: {
    sku: string;
    location_id?: string;
    delta: number;
    expected_version: number;
    reason_code: "DAMAGE" | "THEFT" | "FOUND" | "CORRECTION" | "EXPIRED";
    reason: string;
    mutation_id: string;
    unit_cost_cents?: number;
    lot_number?: string;
  }): Promise<any> {
    return this.request("POST", "/api/cycle-counts/adjust", data);
  }

  async submitASN(
    tenantId: string,
    poId: string,
    supplierId: string,
    expectedArrivalDate: string,
    lines: any[],
  ): Promise<any> {
    return await this.request("POST", "/supplier/asn", {
      tenantId,
      poId,
      supplierId,
      expectedArrivalDate,
      lines,
    });
  }
  async getASNs(tenantId: string, supplierId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/supplier/asn?tenantId=${encodeURIComponent(tenantId)}&supplierId=${encodeURIComponent(supplierId)}`,
    );
  }

  async getNotifications(tenantId: string, userId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/notifications?tenantId=${encodeURIComponent(tenantId)}&userId=${encodeURIComponent(userId)}`,
    );
  }
  async markNotificationRead(id: string): Promise<void> {
    await this.request("POST", `/notifications/${encodeURIComponent(id)}/read`);
  }

  async getOwnNotifications(tenantId: string): Promise<any[]> {
    return this.request('GET', `/notifications?tenantId=${encodeURIComponent(tenantId)}&limit=1000`);
  }

  async getOwnUnreadCount(): Promise<{ unread_count: number }> {
    return this.request('GET', '/notifications/inbox/unread');
  }

  async snoozeOwnNotification(id: string, hours: number): Promise<any> {
    return this.request('POST', `/notifications/${encodeURIComponent(id)}/snooze`, { hours });
  }

  async getNotificationManagers(): Promise<any[]> {
    return this.request('GET', '/notifications/managers');
  }

  async escalateOwnNotification(id: string, manager: string): Promise<any> {
    return this.request('POST', `/notifications/${encodeURIComponent(id)}/escalate`, { target_manager_id: manager });
  }

  async getReportExecutions(tenantId: string): Promise<any[]> {
    return this.request('GET', `/reports/executions?tenantId=${encodeURIComponent(tenantId)}&limit=1000`);
  }

  async getReportSchedules(tenantId: string): Promise<any[]> {
    return this.request('GET', `/reports/schedules?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async reportCommand(path: string, payload: Record<string, unknown>): Promise<any> {
    return this.request('POST', path, payload);
  }

  async processReportExecution(id: string): Promise<any> {
    return this.request('POST', `/reports/executions/${encodeURIComponent(id)}/process`);
  }

  async downloadReportExecution(id: string): Promise<Blob> {
    const response = await fetch(`${PYTHON_BASE_URL}/reports/executions/${encodeURIComponent(id)}/content`, { headers: this.getHeaders() });
    if (!response.ok) throw Object.assign(new Error(`Report download failed (HTTP ${response.status})`), { status: response.status });
    return response.blob();
  }

  async getRetailAlerts(): Promise<any[]> {
    return this.request('GET', '/alerts');
  }

  async getRetailAlertConfig(): Promise<any> {
    return this.request('GET', '/alerts/config');
  }

  async generateAgingReport(tenantId: string): Promise<any> {
    return await this.request(
      "GET",
      `/aging/report?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async createLegalEntity(
    tenantId: string,
    name: string,
    baseCurrency: string,
    taxIdentifier?: string,
  ): Promise<any> {
    return await this.request("POST", `/intercompany/entities`, {
      tenantId,
      name,
      baseCurrency,
      taxIdentifier,
    });
  }

  async getLegalEntities(tenantId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/intercompany/entities?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async executeIntercompanyTransfer(dto: {
    tenantId: string;
    fromEntityId: string;
    toEntityId: string;
    sku: string;
    quantity: number;
    unitCostCents: number;
    markupPercentage: number;
    dutyCents?: number;
  }): Promise<any> {
    return await this.request("POST", `/intercompany/transfers`, dto);
  }

  async getIntercompanyTransfers(tenantId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/intercompany/transfers?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getApiUsageMetrics(tenantId: string): Promise<ApiUsageMetric[]> {
    return await this.request(
      "GET",
      `/usage?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async getMyWorkforce(tenantId: string): Promise<any> {
    return this.request('GET', `/workforce/me?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getWorkforceOperators(tenantId: string): Promise<any[]> {
    return this.request('GET', `/workforce/operators?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getWorkforceShifts(tenantId: string): Promise<any[]> {
    return this.request('GET', `/workforce/shifts?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getStaffingPlans(tenantId: string): Promise<any[]> {
    return this.request('GET', `/workforce/plans?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getOperatorMetrics(tenantId: string, id: string): Promise<any> {
    return this.request('GET', `/workforce/operators/${encodeURIComponent(id)}/metrics?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async getWorkforceSources(tenantId: string, shiftId: string): Promise<any[]> {
    return this.request('GET', `/workforce/shifts/${encodeURIComponent(shiftId)}/sources?tenantId=${encodeURIComponent(tenantId)}`);
  }

  async workforceCommand(resource: 'profiles' | 'shifts' | 'plans', data: any, id?: string, action?: 'start' | 'complete' | 'cancel' | 'activities' | 'publish'): Promise<any> {
    const path = `/workforce/${resource}${id ? '/' + encodeURIComponent(id) : ''}${action ? '/' + action : ''}`;
    return this.request(resource === 'profiles' ? 'PUT' : 'POST', path, data);
  }
}
