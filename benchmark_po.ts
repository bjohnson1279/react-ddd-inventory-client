import { ExpressRESTAdapter } from './src/api/express.js';
import { performance } from 'perf_hooks';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
(global as any).localStorage = localStorageMock;

(global as any).fetch = async (url: string) => {
  await new Promise(r => setTimeout(r, 50));
  return {
    ok: true,
    json: async () => ({ id: url.split('/').pop()?.split('?')[0], status: 'pending' })
  };
};

async function run() {
  const adapter = new ExpressRESTAdapter();
  const tenantId = 'tenant-1';
  const ids = Array.from({ length: 20 }, (_, i) => `po-${i}`);
  localStorage.setItem(`po_ids_${tenantId}`, JSON.stringify(ids));

  const start = performance.now();
  await adapter.getPurchaseOrders(tenantId);
  const end = performance.now();
  console.log(`Time taken: ${end - start} ms`);
}

run();
