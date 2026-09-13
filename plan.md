1. **Analyze Panels.tsx**
   - In `Panels.tsx` at line 1896, there is an operation: `const manualEpcs = unregisteredTagsText.split('\n').map(x => x.trim()).filter(x => x.length > 0);`
   - This creates an intermediate array in `.map` and iterates over it again in `.filter`.
   - The memory rule states: "Replacing consecutive `.reduce()` or `.filter()` calls on the same array with a single-pass `for...of` loop optimizes React render cycles by eliminating redundant iterations and callback overhead." While it doesn't explicitly state `map().filter()`, the logic applies perfectly here to avoid an intermediate array.
   - Another performance opportunity in `Panels.tsx` (line 1401) is inside the `onChange` handler for `receivePoId`: `const po = purchaseOrders.find(p => p.id === id);`. This `<select>` element only displays `sentPurchaseOrders`. Searching through the smaller `sentPurchaseOrders` array instead of the larger `purchaseOrders` array reduces the O(N) lookup size. We will optimize this array lookup as well.

2. **Update Panels.tsx**
   - Replace the `purchaseOrders.find` with `sentPurchaseOrders.find` at line 1401 to reduce the O(N) array search size.
   - Replace the `.map().filter()` chain at line 1896 with a single-pass `reduce` or `for` loop to eliminate redundant iteration and array allocation.
   - Add a comment explaining the performance optimization using the format `// ⚡ Bolt: ...`.

3. **Verify Changes**
   - Run type checks (`npx tsc --noEmit` if possible, though tests are run with vitest).
   - Run tests using `pnpm run test:unit`.
   - Ensure the code still functions identically.

4. **Complete Pre-commit Steps**
   - Ensure proper testing, verification, review, and reflection are done.

5. **Submit PR**
   - Create a PR with title "⚡ Bolt: Optimize array lookup and iteration in Panels".
   - Include description required for Bolt agents.
