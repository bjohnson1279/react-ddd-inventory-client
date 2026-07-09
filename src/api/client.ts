import { createContext, useContext } from 'react';

// --- Core Interface Definitions ---
export interface Item {
  variantId: string;
  quantity: number;
  unitCostCents: number;
}

export interface StockOnboarding {
  id: string;
  tenantId: string;
  locationId: string;
  status: 'draft' | 'submitted';
  asOfDate: string;
  items: Item[];
}

export interface Barcode {
  value: string;
  symbology: string;
}

export interface BarcodeAssignment {
  id: string;
  sku: string;
  barcode: Barcode;
  source: string;
  isPrimary: boolean;
  assignedAt: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  trackingMode: 'quantity' | 'serial' | 'lot';
  attributes: { name: string; value: string }[];
  barcodes?: BarcodeAssignment[];
}

export interface Product {
  id: string;
  name: string;
  variants: ProductVariant[];
}

export interface JournalLine {
  accountCode: string;
  amountCents: number;
  type: 'debit' | 'credit';
  memo?: string;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  date: string;
  description: string;
  method: 'cash' | 'accrual';
  referenceId?: string;
  lines: JournalLine[];
}

export interface StatusTransition {
  from: string;
  to: string;
  reason: string;
  actor: string;
  occurredAt: string;
  referenceId?: string;
}

export interface SerializedItem {
  id: string;
  variantId: string;
  serialNumber: string;
  tenantId: string;
  locationId: string;
  status: string;
  history: StatusTransition[];
}

export interface ShopifyConnection {
  id: string;
  tenantId: string;
  platform: string;
  storeDomain: string;
  isActive: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  locationId: string;
  quantity: number;
  version: number;
}

export interface ForecastingReportItem {
  sku: string;
  name: string;
  currentStock: number;
  salesVelocity7d: number;
  salesVelocity30d: number;
  salesVelocity90d: number;
  forecastedDemand: number;
  suggestedROP: number;
  safetyStock: number;
}

// --- New Features Interfaces ---

export interface FulfillmentAllocation {
  locationId: string;
  quantity: number;
}

export interface FulfillmentPlan {
  allocations: FulfillmentAllocation[];
  totalCost: number;
  totalDistance: number;
  splitCount: number;
}

export interface ReorderPolicy {
  sku: string;
  locationId: string;
  reorderPoint: number;
  safetyStock: number;
  economicOrderQuantity: number;
}

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  eventTypes: string[];
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  eventName: string;
  status: string;
  statusCode?: number;
  occurredOn: string;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  zone: string;
  maxWeightGrams: number;
  maxVolumeCubicMeters: number;
}

export interface PutawaySuggestion {
  locationId: string;
  sku: string;
  suggestedQuantity: number;
}

export interface PurchaseOrderItem {
  sku: string;
  quantity: number;
  unitCostCents: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  supplier: string;
  status: 'draft' | 'approved' | 'sent' | 'received';
  items: PurchaseOrderItem[];
  createdAt: string;
}

export type BackendType = 'graphql' | 'express' | 'laravel';
export type Tab = 'dashboard' | 'onboarding' | 'products' | 'scanning' | 'ledger' | 'serials' | 'shopify' | 'forecasting' | 'routing' | 'procurement' | 'warehouse' | 'webhooks';

// --- Abstract Client Interface ---
export interface InventoryClient {
  login(tenantId: string, actorId: string, role?: string, password?: string): Promise<string>;
  getInventoryItems(): Promise<InventoryItem[]>;
  getProducts(): Promise<Product[]>;
  getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]>;
  getJournalEntries(tenantId: string): Promise<JournalEntry[]>;
  getStockOnboardings(tenantId: string): Promise<StockOnboarding[]>;
  createProduct(id: string, name: string): Promise<void>;
  addProductVariant(productId: string, sku: string, trackingMode: string, attributes: { name: string; value: string }[]): Promise<void>;
  assignBarcode(sku: string, value: string, symbology: string, source: string, makePrimary: boolean): Promise<void>;
  generateInternalBarcode(sku: string, tenantId: string): Promise<string>;
  scanBarcode(value: string, context: string, amount: number, actualQuantity: number, tenantId: string, locationId: string, actorId: string): Promise<any>;
  traceSerialHistory(serialNumber: string): Promise<SerializedItem>;
  connectShopify(tenantId: string, storeDomain: string, accessToken: string): Promise<void>;
  createJournalEntry(tenantId: string, description: string, method: string, lines: JournalLine[]): Promise<void>;
  createStockOnboarding(tenantId: string, locationId: string, asOfDate: string, items: Item[]): Promise<void>;
  submitStockOnboarding(onboardingId: string): Promise<void>;
  
  // Dynamic Forecasting Feature
  getForecastingReport(locationId: string): Promise<ForecastingReportItem[]>;

  // Real-time Barcode Scanning
  subscribeBarcodeScans(tenantId: string, onScan: (scan: any) => void): () => void;

  // --- Advanced Admin Operations ---
  
  // Order Routing
  routeOrder(sku: string, quantity: number, destinationAddress: string, strategyName: string): Promise<FulfillmentPlan>;

  // Reorder Policies
  getReorderPolicies(tenantId: string): Promise<ReorderPolicy[]>;
  saveReorderPolicy(tenantId: string, policy: ReorderPolicy): Promise<void>;
  evaluateReorderPolicies(tenantId: string): Promise<void>;

  // Webhooks
  getWebhooks(tenantId: string): Promise<WebhookSubscription[]>;
  createWebhook(tenantId: string, url: string, eventTypes: string[]): Promise<void>;
  deleteWebhook(tenantId: string, id: string): Promise<void>;
  getWebhookDeliveries(tenantId: string): Promise<WebhookDeliveryLog[]>;

  // WMS Layout
  getWarehouseLocations(tenantId: string): Promise<WarehouseLocation[]>;
  saveWarehouseLocation(tenantId: string, location: WarehouseLocation): Promise<void>;
  deleteWarehouseLocation(tenantId: string, id: string): Promise<void>;
  getPutawaySuggestions(tenantId: string, sku: string, quantity: number): Promise<PutawaySuggestion[]>;
  getOptimizedPickRoute(tenantId: string, skus: string[]): Promise<string[]>;

  // Procurement (PO)
  getPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]>;
  createPurchaseOrder(tenantId: string, supplier: string, items: PurchaseOrderItem[]): Promise<void>;
  approvePurchaseOrder(tenantId: string, id: string): Promise<void>;
  sendPurchaseOrder(tenantId: string, id: string): Promise<void>;
  receivePurchaseOrder(tenantId: string, id: string, items: { sku: string; quantity: number }[]): Promise<void>;

  // FEFO & Recall
  getFefoPickSuggestions(tenantId: string, sku: string, quantity: number): Promise<any[]>;
  traceRecall(tenantId: string, lotNumber: string): Promise<any>;
}

// --- React Context Infrastructure ---
export interface ClientContextType {
  client: InventoryClient;
  backendType: BackendType;
  setBackendType: (type: BackendType) => void;
}

export const InventoryClientContext = createContext<ClientContextType | null>(null);

export const useInventory = () => {
  const context = useContext(InventoryClientContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryClientProvider');
  }
  return context;
};
