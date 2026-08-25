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

export async function deleteScans(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    ids.forEach(id => {
      store.delete(id);
    });
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
  const BATCH_SIZE = 10;

  for (let i = 0; i < scans.length; i += BATCH_SIZE) {
    const batch = scans.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (scan) => {
      if (scan.id === undefined) return null;
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
        return { success: true, value: scan.value, id: scan.id };
      } catch (err: any) {
        return { success: false, value: scan.value, message: err.message, id: scan.id };
      }
    });

    const results = await Promise.all(promises);

    // ⚡ Bolt: Batch deleting successful scans to prevent sequential IndexedDB I/O overhead.
    // ⚡ Bolt: Single pass traversal over results array for O(N) performance and eliminating intermediate allocations.
    const successfulIds: number[] = [];

    for (const result of results) {
      if (!result) continue;
      if (result.success) {
        successCount++;
        if (result.id !== undefined) {
          successfulIds.push(result.id);
        }
      } else {
        failedCount++;
        errors.push(`Scan ${result.value} failed: ${result.message}`);
      }
    }

    if (successfulIds.length > 0) {
      await deleteScans(successfulIds);
    }
  }

  return { successCount, failedCount, errors };
}
