import { InventoryClient } from './client';

export interface QueuedScan {
  id?: number;
  value: string;
  context: string;
  amount: number;
  actualQuantity: number;
  tenantId: string;
  locationId: string;
  actorId: string;
  timestamp: string;
}

const DB_NAME = 'inventory-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'scans';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addScanToQueue(scan: Omit<QueuedScan, 'timestamp'>): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const queuedScan: QueuedScan = {
      ...scan,
      timestamp: new Date().toISOString()
    };
    const request = store.add(queuedScan);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function getQueuedScans(): Promise<QueuedScan[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteScan(id: number): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function syncOfflineQueue(client: InventoryClient): Promise<{ successCount: number; failedCount: number; errors: string[] }> {
  const scans = await getQueuedScans();
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const scan of scans) {
    if (!scan.id) continue;
    try {
      await client.scanBarcode(
        scan.value,
        scan.context,
        scan.amount,
        scan.actualQuantity,
        scan.tenantId,
        scan.locationId,
        scan.actorId
      );
      await deleteScan(scan.id);
      successCount++;
    } catch (err: any) {
      failedCount++;
      errors.push(`Scan ${scan.value} failed: ${err.message}`);
    }
  }

  return { successCount, failedCount, errors };
}
