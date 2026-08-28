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
// --- Backend Client Interfaces (New) ---
export interface InventoryClient {
  // Stock management
  getItems(tenantId: string): Promise<InventoryItem[]>;
  incrementForSaleBatch(tenantId: string, locationId: string, items: { variantId: string; quantity: number }[], memo?: string, actorId?: ActorId): Promise<void>;
  decrementForSaleBatch(tenantId: string, locationId: string, items: { variantId: string; quantity: number }[], referenceId: string, actorId: ActorId): Promise<void>;

  // ERP & Accounting
  getJournals(tenantId: string, dateFrom?: string, dateTo?: string): Promise<JournalEntry[]>;
  createJournalEntry(tenantId: string, date: string, description: string, lines: JournalLine[], method?: 'cash' | 'accrual', referenceId?: string): Promise<void>;

  // Serialized Items
  getSerializedItems(tenantId: string): Promise<SerializedItem[]>;
  traceSerial(tenantId: string, serialNumber: string): Promise<any>;

  // Shopify Integration
  getShopifyConnections(tenantId: string): Promise<ShopifyConnection[]>;
  createShopifyConnection(tenantId: string, domain: string, token: string, webhookUrl?: string): Promise<void>;
  sendOrderToShopify(tenantId: string, connectionId: string, orderId: string, items: { variantId: string; quantity: number }[]): Promise<void>;

  // Real-time events (WebSocket)
  connectWsUrl: string;
  subscribe(topic: string): () => void;
  disconnect(): void;

  // Admin portal operations
  getUsers(tenantId: string): Promise<User[]>;
  inviteUser(tenantId: string, email: string, role?: string): Promise<{ userId: string; temporaryPassword?: string }>;
  updateUserRole(tenantId: string, userId: string, role: string): Promise<void>;

  // RBAC management
  getRoles(tenantId: string): Promise<Role[]>;
  getPermissions(): Promise<Permission[]>;
  createRole(tenantId: string, name: string, description?: string, permissionIds?: string[]): Promise<Role>;
  updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
  deleteRole(roleId: string): Promise<void>;

  // Approval workflows
  getApprovalWorkflows(): Promise<any[]>;
  toggleApprovalWorkflow(id: string): Promise<any>;
  getPendingApprovals(): Promise<any[]>;
  submitApprovalDecision(id: string, decision: string, notes?: string): Promise<any>;

  // Audit & reconciliation
  runAudit(tenantId: string): Promise<any>;
  getDiscrepancies(tenantId: string): Promise<AuditDiscrepancy[]>;
  resolveDiscrepancy(tenantId: string, id: string, notes: string): Promise<void>;

  // Outbox & dead letter handling
  getOutboxStats(): Promise<OutboxStats>;
  getDeadLetterEvents(limit?: number): Promise<OutboxEvent[]>;
  retryOutboxEvent(id: string): Promise<void>;

  // Tenant configuration
  getTenantConfig(tenantId: string): Promise<TenantAccountingConfig>;
  saveTenantConfig(tenantId: string, config: { accountingMethod: string; costingMethod: string }): Promise<void>;

  // Kit assembly/disassembly
  assembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: ActorId, referenceId?: string): Promise<void>;
  disassembleKit(tenantId: string, locationId: string, kitSku: string, quantity: number, actorId: ActorId, referenceId?: string): Promise<void>;

  // Quarantine management
  getQuarantinedItems(tenantId: string): Promise<QuarantinedItem[]>;
  resolveQuarantine(tenantId: string, id: string, resolution: string): Promise<void>;

  // Valuation reports
  getValuationReport(tenantId: string, locationId?: string, method?: 'FIFO' | 'LIFO' | 'WAC'): Promise<ValuationItem[]>;

  // RFID operations
  getRfidTags(tenantId: string): Promise<RfidTag[]>;
  assignRfidTag(tenantId: string, epc: string, sku: string, serialNumber?: string): Promise<void>;
  simulateRfidScan(tenantId: string, locationId: string, tags: string[]): Promise<void>;
  subscribeRfidScans(tenantId: string, onScan: (event: RfidScanUpdate) => void): () => void;

  // Intelligent insights
  analyzeInventoryAnomalies(tenantId: string, startDate?: string, endDate?: string): Promise<any>;
  getRebalanceMatrix(tenantId: string): Promise<any>;
}