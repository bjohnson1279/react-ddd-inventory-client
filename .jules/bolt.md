## 2024-05-18 - Avoid O(N*M) list filtering inside render loops
**Learning:** Found a major performance bottleneck where `inventoryItems.filter` was called inside `wmsLocations.map` during the warehouse layout render. This caused an O(N * M) operation blocking the main thread (1000 locations * 50,000 items took ~1.3 seconds to process on a test dataset).
**Action:** Replace nested loops/filters in render functions with an O(N + M) grouping strategy. Group elements into a `Map` structure prior to iterating the second collection. This reduced the operation time from ~1.3 seconds to ~10 milliseconds (100x speedup) on the same dataset.

## 2024-06-25 - Memoize derived data Hash Maps inside render loop
**Learning:** Even an optimized O(N+M) loop for deriving data (like grouping variants or items) inside the render loop can cause severe UI stutter when other state changes (such as hover events that trigger state updates like `setHoveredSuggestion`) run frequently.
**Action:** Extract the creation of derived Hash Maps into `useMemo` hooks with proper dependencies to ensure expensive O(N+M) groupings run only when the underlying arrays change, preventing frame drops during rapid state-updating interactions like hovering.

## 2024-05-17 - [Memoize inline filter lengths in massive dashboard]
**Learning:** Found an anti-pattern in the large React component `App.tsx` where `.filter().length` was used directly inside JSX render loops for critical inventory and dashboard stats (e.g. `inventoryItems.filter(...)`). In a large dashboard component (4000+ lines) where state updates frequently, recalculating derived state synchronously inside render can cause notable main thread blocking, even if the array isn't massive, due to cumulative re-renders.
**Action:** Always memoize derived state (like counts resulting from filtering arrays) at the top of the component using `useMemo` so it's only recalculated when its dependency array changes, rather than on every single render pass of the large component.

## 2026-08-04 - Optimize Offline Queue Sync
**Learning:** Processing a large array of async tasks (like queue syncs) directly with `Promise.all` creates unbounded concurrency that could crash the browser or the target server.
 **Action:** Instead of unbounded parallelism, slice arrays into smaller chunks and `await Promise.all()` on each batch (e.g. batch size of 10) to maintain high performance with predictable load.

## 2024-08-04 - Pre-calculate mapping data outside render loop instead of O(N*M) lookups
**Learning:** Found a major performance bottleneck where `pickRouteResult.findIndex(path => path.includes(loc.id))` was called inside `wmsLocations.map` during the warehouse layout render. In a large dashboard where states like `hoveredSuggestion` trigger frequent re-renders, this O(N * M) operation causes severe main thread blocking. Also found inline calculation of `Array.from(new Set(wmsLocations.map(l => l.zone)))` doing redundant mapping and set creation on every frame.
**Action:** Always extract O(N*M) loop searches into a single `useMemo` block that produces a `Map` (or Set/String) to provide O(1) lookups during the render phase. Inline `Array.map` and `new Set` constructions should also be strictly extracted into `useMemo` hooks.

## 2024-05-18 - Memoize inline array filtering inside render loops
**Learning:** Found multiple instances where array filtering (`.filter()`) was performed directly inside the render loop, specifically to calculate counts (e.g., `inventoryItems.filter(item => item.quantity < 10).length`) or list filtered elements (e.g., `graphqlQueries.filter(q => q.name.includes(searchQuery))`). This causes an O(N) operation to run synchronously on every render, which degrades performance, especially in components with text inputs that trigger frequent re-renders on keystrokes.
**Action:** Extract inline array filtering operations in React components into `useMemo` hooks, ensuring they only recalculate when their dependencies change.

## 2024-05-19 - [Inline Array Traversals blocking render]
**Learning:** Performing `Array.filter` and `Array.some` directly inside the render block blocks the main thread with O(N) operations during every component re-render. Since `App.tsx` contains heavy state that forces re-renders, operations such as filtering `wmsLocations` and `purchaseOrders` cause significant frame drops on larger datasets.
**Action:** Extract nested/inline array filtering into `useMemo` hooks, allowing derived arrays (e.g. `sentPurchaseOrders`, `filteredWmsLocations`) to safely skip recalculation as long as their dependencies remain unchanged.

## 2024-08-07 - Memoize O(N) reductions on continuous data streams
**Learning:** Found continuous event streams (like RFID scanning) triggering O(N) recalculations on every render using unmemoized `reduce()`.
**Action:** Always memoize derived statistics (counts, averages) derived from growing event streams with `useMemo` to prevent render blocking as the stream grows.

## 2024-05-20 - Replace inline `.some` with `length` check when memoized array exists
**Learning:** Found an O(N) array iteration `purchaseOrders.some(po => po.status === 'sent')` happening on every render inside `src/components/Panels.tsx`, despite a memoized array `sentPurchaseOrders` (which filters by the exact same condition) already existing in the component.
**Action:** Replace inline boolean checks like `.some()` that re-evaluate derived state on every render with O(1) checks (e.g. `memoizedArray.length > 0`) when a pre-memoized version of that exact filtered data is available.

## 2024-05-21 - Extract static arrays used in useMemo dependencies
**Learning:** Found static arrays defined inside a React component (`ApiSpecViewerPanel`) that were being passed into `useMemo` dependency arrays. Defining static arrays inside a component body causes them to be re-instantiated on every render (creating a new reference), which guarantees the shallow equality check (`old !== new`) in `useMemo` will always fail, causing the expensive calculations to run continuously anyway.
**Action:** Always hoist static arrays, objects, and objects that don't depend on component state or props outside the component definition to maintain referential stability.

## 2026-09-07 - N+1 Bulk Fetch Replacement
**Learning:** Found a systemic N+1 parallel query issue in `getPurchaseOrders` inside `laravel.ts`, where doing parallel `Promise.all` over N network requests is highly inefficient and overloads the backend.
**Action:** Replace `Promise.all` maps containing HTTP requests with single chunked or bulk backend fetch queries (`GET /resource?ids=...`) when possible to eliminate network round-trip overhead.

## 2024-10-27 - Sequential vs Concurrent Network Bottlenecks in Express Adapters
**Learning:** In the `ExpressRESTAdapter.getProducts` implementation, `/barcodes` and `/inventory` endpoints were being fetched sequentially, causing a measurable latency bottleneck (the total duration was the sum of both network calls). Additionally, mapping an array to extract properties just to pass into a `Set` for deduping is an inefficient O(N) pattern when you can just track existence directly within a standard loop using a dictionary or map.
**Action:** Always identify independent network requests within API adapters and convert them to concurrent execution using `Promise.all`. Replace two-pass mapping/deduping patterns with single-pass iteration loops where possible to shave milliseconds off high-volume data processing.

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks (`StartLine`/`EndLine`) for edits to `schema.prisma`, `index.ts`, `public/index.php`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.

## 2024-11-20 - Batch O(N) array traversals during websocket/stream events
**Learning:** Found an O(N) array traversal (`prev.findIndex`) inside the state setter for both WebSocket and Server-Sent Events (SSE) `onmessage` handlers in `App.tsx`. When handling a burst of high-frequency events (e.g. `stock_changed` updates for large inventories), performing O(N) lookups inside an unbatched sequential state setter causes O(N*M) time complexity and massive main thread blocking. Even if React batches the final DOM render, the JavaScript execution of the state updater functions will compound and lag the browser.
**Action:** Always introduce an `updateBuffer` and `requestAnimationFrame`/`setTimeout` batching mechanism for WebSockets, and loop-level batching for SSE streams. Accumulate incoming messages into a buffer/Map, then apply all updates in a single `setXYZ` call using an O(N+M) pass, eliminating consecutive O(N) lookups per message.

## 2024-05-22 - Replace chained array iterations with a single-pass loop
**Learning:** Found a sequence of array `.filter().reduce()` that iterated over the entire array twice to compute a single sum in `src/api/express.ts`. This double iteration introduces redundant processing and allocates an intermediate array, which increases garbage collection pressure on high-volume data streams.
**Action:** Replace consecutive `.filter().reduce()` or `.filter().map()` chains with a single-pass `for...of` loop or `reduce()` that performs the filtering condition inline before accumulating the value, lowering the complexity from O(2N) to O(N) and eliminating the intermediate array allocation.
## 2024-05-18 - Avoid Consecutive Map and Filter Array Operations
**Learning:** Chaining array methods like `.map().filter()` causes the JS engine to allocate intermediate arrays and perform redundant iterations, causing subtle O(N) overhead during React renders when parsing large datasets or user inputs.
**Action:** Replace consecutive `.map().filter()` (or similar chains) with a single-pass `.reduce()` or `for...of` loop to optimize execution time and reduce memory allocation overhead, avoiding unnecessary intermediate array artifacts.
