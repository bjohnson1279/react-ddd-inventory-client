import { GraphQLAdapter } from './src/api/graphql';

async function run() {
  const api = new GraphQLAdapter('url', 'token');

  // Mock fetchGraphql and getProducts
  const numProducts = 1000;
  const numVariantsPerProduct = 10;
  const numLineItems = 5000;

  const products = [];
  for (let i = 0; i < numProducts; i++) {
    const variants = [];
    for (let j = 0; j < numVariantsPerProduct; j++) {
      variants.push({ id: `v_${i}_${j}`, sku: `sku_${i}_${j}`, attributes: [{ value: 'Attr' }] });
    }
    products.push({ id: `p_${i}`, name: `Product ${i}`, variants });
  }

  const lineItems = [];
  for (let i = 0; i < numLineItems; i++) {
    // Pick a random variant
    const pIdx = Math.floor(Math.random() * numProducts);
    const vIdx = Math.floor(Math.random() * numVariantsPerProduct);
    lineItems.push({
      variantId: `v_${pIdx}_${vIdx}`,
      sku: `sku_${pIdx}_${vIdx}`,
      quantityOnHand: 10,
      unitCostCents: 100,
      totalValueCents: 1000
    });
  }

  api.fetchGraphql = async () => ({
    stockValuationReport: {
      lineItems,
      method: 'FIFO'
    }
  });

  api.getProducts = async () => products as any;

  console.log(`Starting benchmark with ${numProducts} products, ${numVariantsPerProduct} variants each, and ${numLineItems} line items.`);
  const start = performance.now();
  await api.getValuationReport('tenant1', 'loc1');
  const end = performance.now();

  console.log(`Time taken: ${(end - start).toFixed(2)} ms`);
}

run().catch(console.error);
