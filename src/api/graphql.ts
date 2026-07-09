import { createClient } from 'graphql-ws';
import { InventoryClient, InventoryItem, Product, StockOnboarding, JournalEntry, ShopifyConnection, SerializedItem, JournalLine, Item, ForecastingReportItem, FulfillmentPlan, ReorderPolicy, WebhookSubscription, WebhookDeliveryLog, WarehouseLocation, PutawaySuggestion, PurchaseOrder, PurchaseOrderItem } from './client';

const GRAPHQL_HTTP_URL = 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = 'ws://localhost:4000/graphql';

export class GraphQLAdapter implements InventoryClient {
  private getHeaders(customToken?: string): Record<string, string> {
    const activeToken = customToken || localStorage.getItem('auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeToken && activeToken !== 'NONE') {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  private async fetchGraphql(query: string, variables = {}, customToken?: string): Promise<any> {
    try {
      const response = await fetch(GRAPHQL_HTTP_URL, {
        method: 'POST',
        headers: this.getHeaders(customToken),
        body: JSON.stringify({ query, variables })
      });
      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      return result.data;
    } catch (err: any) {
      console.error('GraphQL HTTP Adapter Error:', err);
      throw err;
    }
  }

  async login(tenantId: string, actorId: string, role?: string, password?: string): Promise<string> {
    const data = await this.fetchGraphql(`mutation Login($tenant: ID!, $actor: ID!, $role: String, $password: String) {
      login(tenantId: $tenant, actorId: $actor, role: $role, password: $password)
    }`, { tenant: tenantId, actor: actorId, role, password }, 'NONE');
    return data.login;
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    const data = await this.fetchGraphql(`query { inventoryItems { id sku locationId quantity version } }`);
    return data.inventoryItems || [];
  }

  async getProducts(): Promise<Product[]> {
    const prodData = await this.fetchGraphql(`query { 
      products { 
        id name 
        variants { 
          id sku trackingMode 
          attributes { name value } 
        } 
      } 
    }`);
    const rawProducts = prodData.products || [];
    
    // Resolve barcodes for variants to complete product models
    return Promise.all(rawProducts.map(async (p: Product) => {
      const variants = await Promise.all(p.variants.map(async (v) => {
        try {
          const bcData = await this.fetchGraphql(`query GetBarcodes($sku: String!) {
            barcodeSet(sku: $sku) {
              assignments { id sku barcode { value symbology } source isPrimary assignedAt }
            }
          }`, { sku: v.sku });
          return { ...v, barcodes: bcData.barcodeSet?.assignments || [] };
        } catch {
          return { ...v, barcodes: [] };
        }
      }));
      return { ...p, variants };
    }));
  }

  async getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]> {
    const data = await this.fetchGraphql(`query GetShopify($tenant: ID!) {
      shopifyConnections(tenantId: $tenant) { id tenantId platform storeDomain isActive }
    }`, { tenant: tenantId });
    return data.shopifyConnections || [];
  }

  async getJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    const data = await this.fetchGraphql(`query GetGL($tenant: ID!) {
      journalEntries(tenantId: $tenant) { 
        id tenantId date description method referenceId 
        lines { accountCode amountCents type memo }
      }
    }`, { tenant: tenantId });
    return data.journalEntries || [];
  }

  async getStockOnboardings(tenantId: string): Promise<StockOnboarding[]> {
    const data = await this.fetchGraphql(`query GetOnboardings($tenant: ID!) {
      stockOnboardings(tenantId: $tenant) {
        id tenantId locationId status asOfDate
        items { variantId quantity unitCostCents }
      }
    }`, { tenant: tenantId });
    return data.stockOnboardings || [];
  }

  async createProduct(id: string, name: string): Promise<void> {
    await this.fetchGraphql(`mutation CreateProd($id: ID!, $name: String!) {
      createProduct(id: $id, name: $name)
    }`, { id, name });
  }

  async addProductVariant(productId: string, sku: string, trackingMode: string, attributes: { name: string; value: string }[]): Promise<void> {
    await this.fetchGraphql(`mutation AddVar($productId: ID!, $sku: String!, $attributes: [AttributeInput!]!, $trackingMode: TrackingMode!) {
      addProductVariant(productId: $productId, sku: $sku, attributes: $attributes, trackingMode: $trackingMode)
    }`, { productId, sku, attributes, trackingMode });
  }

  async assignBarcode(sku: string, value: string, symbology: string, source: string, makePrimary: boolean): Promise<void> {
    await this.fetchGraphql(`mutation AssignBC($input: AssignBarcodeInput!) {
      assignBarcode(input: $input)
    }`, {
      input: { sku, barcodeValue: value, symbology, source, makePrimary }
    });
  }

  async generateInternalBarcode(sku: string, tenantId: string): Promise<string> {
    const data = await this.fetchGraphql(`mutation GenBC($sku: String!, $tenant: ID!) {
      generateInternalBarcode(sku: $sku, tenantId: $tenant)
    }`, { sku, tenant: tenantId });
    return data.generateInternalBarcode;
  }

  async scanBarcode(value: string, context: string, amount: number, actualQuantity: number, tenantId: string, locationId: string, actorId: string): Promise<any> {
    return this.fetchGraphql(`mutation Scan($input: BarcodeScanInput!) {
      scanBarcode(input: $input) {
        status matchedSku quantityChange details occurredAt referenceId
      }
    }`, {
      input: {
        barcodeValue: value,
        context,
        scannedAmount: amount,
        actualQuantity,
        tenantId,
        locationId,
        actorId
      }
    });
  }

  async traceSerialHistory(serialNumber: string): Promise<SerializedItem> {
    const data = await this.fetchGraphql(`query Trace($serial: String!) {
      traceSerialHistory(serialNumber: $serial) {
        id variantId serialNumber tenantId locationId status
        history { from to reason actor occurredAt referenceId }
      }
    }`, { serial: serialNumber });
    return data.traceSerialHistory;
  }

  async connectShopify(tenantId: string, storeDomain: string, accessToken: string): Promise<void> {
    await this.fetchGraphql(`mutation ConnShopify($tenant: ID!, $store: String!, $token: String!) {
      connectShopify(tenantId: $tenant, storeDomain: $store, accessToken: $token)
    }`, { tenant: tenantId, store: storeDomain, token: accessToken });
  }

  async createJournalEntry(tenantId: string, description: string, method: string, lines: JournalLine[]): Promise<void> {
    // Format lines to conform to GraphQL schema input types
    const formattedLines = lines.map(l => ({
      accountCode: l.accountCode,
      amountCents: l.amountCents,
      type: l.type.toUpperCase(),
      memo: l.memo
    }));
    await this.fetchGraphql(`mutation CreateJournal($tenant: ID!, $desc: String!, $method: AccountingMethod!, $lines: [JournalLineInput!]!) {
      createJournalEntry(tenantId: $tenant, description: $desc, method: $method, lines: $lines)
    }`, { tenant: tenantId, desc: description, method: method.toUpperCase(), lines: formattedLines });
  }

  async createStockOnboarding(tenantId: string, locationId: string, asOfDate: string, items: Item[]): Promise<void> {
    const formattedItems = items.map(i => ({
      variantId: i.variantId,
      quantity: i.quantity,
      unitCostCents: i.unitCostCents
    }));
    await this.fetchGraphql(`mutation CreateOnboard($tenant: ID!, $location: ID!, $date: String!, $items: [OnboardingItemInput!]!) {
      createStockOnboarding(tenantId: $tenant, locationId: $location, asOfDate: $date, items: $items) { id }
    }`, { tenant: tenantId, location: locationId, date: asOfDate, items: formattedItems });
  }

  async submitStockOnboarding(onboardingId: string): Promise<void> {
    await this.fetchGraphql(`mutation SubmitOnboard($id: ID!) {
      submitStockOnboarding(id: $id)
    }`, { id: onboardingId });
  }

  async getForecastingReport(locationId: string): Promise<ForecastingReportItem[]> {
    const data = await this.fetchGraphql(`query GetReport($location: String!) {
      demandPlanningReport(locationId: $location) {
        sku
        currentStock
        averageDailySales7d
        averageDailySales30d
        averageDailySales90d
        forecastedDemand30d
        reorderPoint
        safetyStock
      }
    }`, { location: locationId });
    
    const rawReport = data.demandPlanningReport || [];
    return rawReport.map((item: any) => ({
      sku: item.sku,
      name: `SKU: ${item.sku}`,
      currentStock: item.currentStock,
      salesVelocity7d: item.averageDailySales7d,
      salesVelocity30d: item.averageDailySales30d,
      salesVelocity90d: item.averageDailySales90d,
      forecastedDemand: item.forecastedDemand30d,
      suggestedROP: item.reorderPoint,
      safetyStock: item.safetyStock
    }));
  }

  subscribeBarcodeScans(tenantId: string, onScan: (scan: any) => void): () => void {
    const wsClient = createClient({
      url: GRAPHQL_WS_URL,
      connectionParams: () => {
        const activeToken = localStorage.getItem('auth_token');
        return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
      },
    });

    const unsubscribe = wsClient.subscribe(
      {
        query: `subscription OnBarcodeScanned($tenant: ID!) {
          barcodeScanned(tenantId: $tenant) {
            scanValue symbology context status time
          }
        }`,
        variables: { tenant: tenantId },
      },
      {
        next: (data: any) => {
          const scan = data?.data?.barcodeScanned;
          if (scan) {
            onScan(scan);
          }
        },
        error: (err: any) => console.error('GQL WS Subscription Error:', err),
        complete: () => {}
      }
    );

    return () => {
      unsubscribe();
      wsClient.dispose();
    };
  }

  // --- Advanced Admin Operations for GraphQL ---

  // Order Routing
  async routeOrder(sku: string, quantity: number, destinationAddress: string, strategyName: string): Promise<FulfillmentPlan> {
    const res = await this.fetchGraphql(`query RouteOrder($sku: String!, $quantity: Int!, $address: String!, $strategy: String) {
      routeOrder(sku: $sku, quantity: $quantity, destinationAddress: $address, strategyName: $strategy) {
        allocations {
          locationId
          quantity
        }
        totalCost
        totalDistance
        splitCount
      }
    }`, { sku, quantity, address: destinationAddress, strategy: strategyName });
    return res.routeOrder;
  }

  // Reorder Policies
  async getReorderPolicies(tenantId: string): Promise<ReorderPolicy[]> {
    const local = localStorage.getItem(`gql_reorder_policies_${tenantId}`);
    return local ? JSON.parse(local) : [];
  }

  async saveReorderPolicy(tenantId: string, policy: ReorderPolicy): Promise<void> {
    const policies = await this.getReorderPolicies(tenantId);
    const existingIdx = policies.findIndex(p => p.sku === policy.sku && p.locationId === policy.locationId);
    if (existingIdx >= 0) {
      policies[existingIdx] = policy;
    } else {
      policies.push(policy);
    }
    localStorage.setItem(`gql_reorder_policies_${tenantId}`, JSON.stringify(policies));
  }

  async evaluateReorderPolicies(tenantId: string): Promise<void> {
    // Simulated ROP tuning action
    return Promise.resolve();
  }

  // Webhooks
  async getWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const res = await this.fetchGraphql(`query {
      webhookSubscriptions {
        id
        targetUrl
        eventTypes
      }
    }`);
    return (res.webhookSubscriptions || []).map((w: any) => ({
      id: w.id,
      tenantId,
      url: w.targetUrl || w.url,
      eventTypes: w.eventTypes
    }));
  }

  async createWebhook(tenantId: string, url: string, eventTypes: string[]): Promise<void> {
    await this.fetchGraphql(`mutation CreateSub($url: String!, $events: [String!]!) {
      createWebhookSubscription(targetUrl: $url, secret: "secret-key", eventTypes: $events) { id }
    }`, { url, events: eventTypes });
  }

  async deleteWebhook(tenantId: string, id: string): Promise<void> {
    await this.fetchGraphql(`mutation DeleteSub($id: ID!) {
      deleteWebhookSubscription(id: $id)
    }`, { id });
  }

  async getWebhookDeliveries(tenantId: string): Promise<WebhookDeliveryLog[]> {
    const local = localStorage.getItem(`gql_webhook_deliveries_${tenantId}`);
    return local ? JSON.parse(local) : [];
  }

  // WMS Layout
  async getWarehouseLocations(tenantId: string): Promise<WarehouseLocation[]> {
    const local = localStorage.getItem(`gql_wms_locations_${tenantId}`);
    return local ? JSON.parse(local) : [
      { id: 'LOC-CENTRAL', warehouseId: 'WH-CENTRAL', zone: 'A', maxWeightGrams: 50000, maxVolumeCubicMeters: 10 },
      { id: 'LOC-EAST', warehouseId: 'WH-EAST', zone: 'B', maxWeightGrams: 50000, maxVolumeCubicMeters: 10 }
    ];
  }

  async saveWarehouseLocation(tenantId: string, location: WarehouseLocation): Promise<void> {
    const locations = await this.getWarehouseLocations(tenantId);
    const existingIdx = locations.findIndex(l => l.id === location.id);
    if (existingIdx >= 0) {
      locations[existingIdx] = location;
    } else {
      locations.push(location);
    }
    localStorage.setItem(`gql_wms_locations_${tenantId}`, JSON.stringify(locations));
  }

  async deleteWarehouseLocation(tenantId: string, id: string): Promise<void> {
    const locations = await this.getWarehouseLocations(tenantId);
    const filtered = locations.filter(l => l.id !== id);
    localStorage.setItem(`gql_wms_locations_${tenantId}`, JSON.stringify(filtered));
  }

  async getPutawaySuggestions(tenantId: string, sku: string, quantity: number): Promise<PutawaySuggestion[]> {
    return [
      { locationId: 'LOC-CENTRAL', sku, suggestedQuantity: quantity }
    ];
  }

  async getOptimizedPickRoute(tenantId: string, skus: string[]): Promise<string[]> {
    return [...skus].sort((a, b) => a.localeCompare(b));
  }

  // Procurement (PO)
  async getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    try {
      const res = await this.fetchGraphql(`query GetPOs($tenant: ID!) {
        purchaseOrders(tenantId: $tenant) {
          id
          status
          createdAt
          items {
            sku
            quantity
            unitCostCents
          }
        }
      }`, { tenant: tenantId });
      return (res.purchaseOrders || []).map((po: any) => ({
        id: po.id,
        tenantId,
        supplier: 'System Supplier',
        status: po.status.toLowerCase(),
        createdAt: po.createdAt,
        items: (po.items || []).map((i: any) => ({
          sku: i.sku,
          quantity: i.quantity,
          unitCostCents: i.unitCostCents
        }))
      }));
    } catch {
      return [];
    }
  }

  async createPurchaseOrder(tenantId: string, supplier: string, items: PurchaseOrderItem[]): Promise<void> {
    const formattedItems = items.map(i => ({
      sku: i.sku,
      quantity: i.quantity,
      unitCostCents: i.unitCostCents
    }));
    await this.fetchGraphql(`mutation CreatePO($input: CreatePurchaseOrderInput!) {
      createPurchaseOrder(input: $input) { id }
    }`, { input: { supplier, items: formattedItems } });
  }

  async approvePurchaseOrder(tenantId: string, id: string): Promise<void> {
    await this.fetchGraphql(`mutation PlacePO($id: ID!) {
      placePurchaseOrder(id: $id) { id }
    }`, { id });
  }

  async sendPurchaseOrder(tenantId: string, id: string): Promise<void> {
    // Maps to sent state natively or resolved immediately
    return Promise.resolve();
  }

  async receivePurchaseOrder(tenantId: string, id: string, items: { sku: string; quantity: number }[]): Promise<void> {
    await this.fetchGraphql(`mutation ReceivePO($id: ID!, $actor: ID!, $tenant: ID!) {
      receivePurchaseOrder(id: $id, actorId: $actor, tenantId: $tenant) { id }
    }`, { id, actor: 'admin-user', tenant: tenantId });
  }

  // FEFO & Recall
  async getFefoPickSuggestions(tenantId: string, sku: string, quantity: number): Promise<any[]> {
    return [
      { sku, lotNumber: 'LOT-MOCK-999', locationId: 'LOC-EAST', expiryDate: '2028-06-30', quantity }
    ];
  }

  async traceRecall(tenantId: string, lotNumber: string): Promise<any> {
    return {
      lotNumber,
      sku: 'ROUTE-SKU',
      affectedItems: 5,
      dispatchedCustomersCount: 2
    };
  }
}
