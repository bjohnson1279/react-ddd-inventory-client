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

export type BackendType = 'graphql' | 'express' | 'laravel';
export type Tab = 'dashboard' | 'onboarding' | 'products' | 'scanning' | 'ledger' | 'serials' | 'shopify' | 'forecasting';

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
