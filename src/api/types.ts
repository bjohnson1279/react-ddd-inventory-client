// --- Inventory Core Types (Base) ---
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
  weightGrams?: number;
  volumeCubicMeters?: number;
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
// --- Inventory Core Types (Base) ---
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
  weightGrams?: number;
  volumeCubicMeters?: number;
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
