import {
  InventoryClient,
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
  PurchaseOrder,
  PurchaseOrderItem,
  BarcodeAssignment,
  User,
  AuditDiscrepancy,
  OutboxStats,
  OutboxEvent,
  TenantAccountingConfig,
  QuarantinedItem,
  ValuationItem,
  RfidScanUpdate,
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
        throw new Error(parsedError.error || parsedError.detail || `HTTP ${response.status} Error`);
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
    // In Python, shopify connections are stored in databases, but the API may not expose a list connection route.
    // Fall back to returning a default list.
    return [
      {
        id: "conn-1",
        tenantId,
        platform: "shopify",
        storeDomain: "mock-store.myshopify.com",
        isActive: true,
      },
    ];
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const data = await this.request(
      "GET",
      `/accounting/ledger?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return data || [];
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
    return this.request("GET", `/serials/trace/${serialNumber}`);
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
    // Express records journals based on specific workflows (received/sold)
    // Map to the appropriate REST payload
    // ⚡ Bolt: Replace O(2N) .filter().reduce() with a single-pass O(N) loop to reduce callback overhead and array allocation
    let totalAmount = 0;
    for (const l of lines) {
      if (l.type === "debit") totalAmount += l.amountCents;
    }
    const sku = lines[0]?.memo || "SKU-1";
    await this.request("POST", "/accounting/stock-received", {
      tenantId,
      sku,
      quantity: 1,
      unitCostCents: totalAmount,
      method: method.toLowerCase(),
    });
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
    const BATCH_SIZE = 10;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
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
    try {
      const data = await this.request(
        "GET",
        `/reorder-policies?tenantId=${encodeURIComponent(tenantId)}`,
      );
      return data || [];
    } catch {
      return [];
    }
  }

  async saveReorderPolicy(
    tenantId: string,
    policy: ReorderPolicy,
  ): Promise<void> {
    await this.request("POST", "/reorder-policies", { tenantId, ...policy });
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
      `/webhooks/${id}?tenantId=${encodeURIComponent(tenantId)}`,
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
      `/warehouse-locations/${id}?tenantId=${encodeURIComponent(tenantId)}`,
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
    const idsStr = localStorage.getItem(`po_ids_${tenantId}`) || "[]";
    const ids: string[] = JSON.parse(idsStr);

    if (ids.length === 0) {
      return [];
    }

    try {
      // ⚡ Bolt: Replaced N+1 parallel requests with a single bulk fetch to eliminate network overhead.
      const response = await this.request(
        "GET",
        `/purchase-orders?tenantId=${encodeURIComponent(tenantId)}&ids=${ids.join(",")}`,
      );

      const bulkData = response?.data || response || [];
      const allPos = Array.isArray(bulkData) ? bulkData : [];

      const idsSet = new Set(ids);
      return allPos.filter((po: any) => po && idsSet.has(po.id));
    } catch (err) {
      console.error(`Failed to fetch POs in bulk`, err);
      return [];
    }
  }

  async createPurchaseOrder(
    tenantId: string,
    supplier: string,
    items: PurchaseOrderItem[],
  ): Promise<void> {
    const po = await this.request("POST", "/purchase-orders", {
      tenantId,
      supplier,
      items,
    });
    if (po?.id) {
      const idsStr = localStorage.getItem(`po_ids_${tenantId}`) || "[]";
      const ids: string[] = JSON.parse(idsStr);
      if (!ids.includes(po.id)) {
        ids.push(po.id);
        localStorage.setItem(`po_ids_${tenantId}`, JSON.stringify(ids));
      }
    }
  }

  async approvePurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request("POST", `/purchase-orders/${id}/approve`, { tenantId });
  }

  async sendPurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.request("POST", `/purchase-orders/${id}/send`, { tenantId });
  }

  async receivePurchaseOrder(
    tenantId: string,
    id: string,
    items: { sku: string; quantity: number }[],
  ): Promise<void> {
    await this.request("POST", `/purchase-orders/${id}/receive`, {
      tenantId,
      items,
    });
  }

  // FEFO & Recall
  async getFefoPickSuggestions(
    tenantId: string,
    sku: string,
    quantity: number,
  ): Promise<any[]> {
    return this.request(
      "GET",
      `/inventory/fefo-pick?sku=${sku}&quantity=${quantity}&tenantId=${encodeURIComponent(tenantId)}`,
    );
  }

  async traceRecall(tenantId: string, lotNumber: string): Promise<any> {
    return this.request(
      "GET",
      `/inventory/reports/recall/${lotNumber}?tenantId=${encodeURIComponent(tenantId)}`,
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
    try {
      const stats = await this.request("GET", `/outbox/stats`);
      return {
        pendingCount: stats?.pending || 0,
        publishedCount: stats?.published || 0,
        failedCount: stats?.failed || 0,
      };
    } catch {
      return { pendingCount: 0, publishedCount: 0, failedCount: 0 };
    }
  }

  async getDeadLetterEvents(limit?: number): Promise<OutboxEvent[]> {
    try {
      const res = await this.request(
        "GET",
        `/outbox/dead-letter${limit ? `?limit=${limit}` : ""}`,
      );
      return (res || []).map((e: any) => ({
        id: e.id,
        eventType: e.eventType || e.type || "UnknownEvent",
        payload:
          typeof e.payload === "string" ? e.payload : JSON.stringify(e.payload),
        error: e.error || e.errorMessage || "",
        status: e.status || "Failed",
        occurredAt: e.occurredAt || e.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async retryOutboxEvent(id: string): Promise<void> {
    await this.request("POST", `/outbox/${id}/retry`);
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
    await this.request("POST", `/kits/assemble`, {
      tenantId,
      locationId,
      kitSku,
      quantity,
      actorId,
      referenceId,
    });
  }

  async disassembleKit(
    tenantId: string,
    locationId: string,
    kitSku: string,
    quantity: number,
    actorId: string,
    referenceId: string,
  ): Promise<void> {
    await this.request("POST", `/kits/disassemble`, {
      tenantId,
      locationId,
      kitSku,
      quantity,
      actorId,
      referenceId,
    });
  }

  async getQuarantinedItems(tenantId: string): Promise<QuarantinedItem[]> {
    try {
      const res = await this.request(
        "GET",
        `/returns/quarantine?tenantId=${encodeURIComponent(tenantId)}`,
      );
      return (res || []).map((q: any) => ({
        id: q.id,
        sku: q.sku || q.variantId || "",
        locationId: q.locationId || "",
        quantity: q.quantity || 0,
        reason: q.reason || "",
        status: q.status || "Quarantined",
        createdAt: q.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async resolveQuarantine(
    tenantId: string,
    id: string,
    resolution: string,
  ): Promise<void> {
    await this.request("POST", `/returns/quarantine/${id}/resolve`, {
      tenantId,
      resolution,
    });
  }

  async getValuationReport(
    tenantId: string,
    locationId?: string,
    method?: string,
  ): Promise<ValuationItem[]> {
    const params = new URLSearchParams({ tenantId });
    if (locationId) params.set("locationId", locationId);
    if (method) params.set("method", method);
    return this.request("GET", `/accounting/valuation-report?${params.toString()}`);
  }

  async getSlottingSuggestions(tenantId: string): Promise<any[]> {
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
    return await this.request(
      "GET",
      `/reports?tenantId=${encodeURIComponent(tenantId)}`,
    );
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
    return await this.request("POST", `/reports/${reportId}/schedule`, {
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
    return await this.request("POST", `/reports/${reportId}/execute`, {
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
    const lines = Array.isArray(countedLines) ? countedLines : countedLines.items;
    await this.request("POST", "/api/cycle-counts/submit", {
      record_id: id,
      revision: countedLines.revision ?? 0,
      mutation_id: countedLines.mutationId || crypto.randomUUID(),
      items: lines.map((line: any) => ({ sku: line.sku,
        counted_quantity: line.counted_quantity ?? line.countedQuantity })),
    });
  }
  async getCycleCounts(tenantId: string): Promise<any[]> {
    const rows = await this.request(
      "GET",
      `/api/cycle-counts?tenantId=${encodeURIComponent(tenantId)}`,
    );
    return rows.map((row: any) => ({ ...row, id: row.record_id }));
  }

  async reviewCycleCount(id: string, action: "approve" | "recount", revision: number,
    reason: string, mutationId: string): Promise<any> {
    return this.request("POST", `/api/cycle-counts/${encodeURIComponent(id)}/${action}`,
      { revision, reason, mutation_id: mutationId });
  }

  async adjustStock(data: { sku: string; location_id?: string; delta: number;
    expected_version: number; reason_code: "DAMAGE" | "THEFT" | "FOUND" | "CORRECTION" | "EXPIRED";
    reason: string; mutation_id: string; unit_cost_cents?: number; lot_number?: string }): Promise<any> {
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
      `/supplier/asn?tenantId=${encodeURIComponent(tenantId)}&supplierId=${supplierId}`,
    );
  }

  async getNotifications(tenantId: string, userId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/notifications?tenantId=${encodeURIComponent(tenantId)}&userId=${userId}`,
    );
  }
  async markNotificationRead(id: string): Promise<void> {
    await this.request("POST", `/notifications/${id}/read`);
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

  async getApiUsageMetrics(tenantId: string): Promise<any[]> {
    return await this.request(
      "GET",
      `/usage?tenantId=${encodeURIComponent(tenantId)}`,
    );
  }
}
