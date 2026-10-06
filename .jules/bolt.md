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

## Prevention Directives for Automated Refactoring
- **Never Overwrite Complete Files**: Always use range-scoped replacement chunks for edits to `schema.prisma`, `index.ts`, `public/index.php`, `db/schema.rb`, or DDL SQL scripts.
- **Do Not Remove Core Declarations**: Do not delete existing route registrations or database DDL tables.
- **Environment Isolation Compatibility**: When replacing fallback secrets, preserve test environment execution via `!getenv('APP_ENV')` or `getenv('APP_ENV') === 'testing'`.
- **No Scratch Files**: Never stage or commit `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `test.js` files to git.
- **No Unresolved Conflict Markers**: Never stage or commit files containing Git merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`, `|||||||`). Always resolve conflicts cleanly before committing.

## Completeness & Verification Directives
- **Explicit Parameter & Contract Validation**: When creating or modifying API endpoints (Express, Fastify, Rails, Laravel), always implement explicit parameter and request body validation schemas (e.g. `z.string().uuid()`) to prevent unhandled 404/500 fallthroughs.
- **Database Indexing for Queries**: When addressing query bottlenecks or adding query lookup filters, always implement native database index migrations rather than loading collections into memory and performing array filtering (`.filter()`, `.select`).
- **Co-Occurring Dependency Auditing**: When bumping any dependency version, verify that other transitive dependencies do not carry high/critical security advisories (e.g. run `bundler-audit`, `npm audit`). Never introduce a version bump that breaks underlying framework APIs.
- **Self-Verification Before Commit**: Always run syntax checks (`bash -n` for shell scripts, `tsc --noEmit` for TypeScript, linter checks) and targeted test runners locally before opening or updating a PR.

## Hallucinatory Task & Empty PR Directives
- **Zero-Diff Task Termination**: If the requested optimization, refactor, or fix is ALREADY natively present in the target branch, DO NOT create an empty pull request or commit an acknowledgment PR. Exit the task cleanly without opening a PR.
- **Stale Suggestion Guard**: Always verify the current code on `main`/`master` before planning changes. If no actionable diff is required, cancel task execution immediately.
## 2024-11-20 - Avoid Consecutive Map and Filter Operations Inside Event Handlers
**Learning:** Found a sequence of array `.map().filter()` inside a component event handler (`handleOptimizePickRoute` in `App.tsx`) to process a comma-separated string input. This causes redundant iterations and unnecessary array memory allocations on the main thread during execution.
**Action:** Replace consecutive `.map().filter()` chains with a single-pass `.reduce()` loop when processing data or user input, improving performance by avoiding multiple array traversals and intermediate allocations.

## 2024-05-15 - Optimize purchase order fetch using Set
**Learning:** Checking for ID presence using `Array.prototype.includes` inside a `.filter` or `.map` causes an O(N*M) lookup bottleneck.
**Action:** Replace `ids.includes(id)` with a `Set` to provide O(1) checks, turning the operation into O(N+M) and improving performance.
## 2024-09-19 - Replace O(N*M) array find with O(N+M) Map lookup in render loops
**Learning:** Found a major performance bottleneck where `entities.find` was called twice inside `transfers.map` during the React component render in `IntercompanyPanel`. This causes an O(N * M) operation blocking the main thread on every render.
**Action:** Replace nested loops/finds in render functions with an O(N + M) grouping strategy. Convert the smaller array into a `Map` structure using `useMemo` prior to iterating the second collection, resulting in O(1) lookups.
## 2026-09-20 - Optimize health data resolution with Map lookup
**Learning:** Inside frequently executed operations like polling `setInterval`, placing an O(N) `.find()` search inside an O(M) `.map()` loop creates an O(N*M) bottleneck.
**Action:** Pre-compute a `Map` of the search array before mapping to achieve an O(1) inner lookup and an overall O(N+M) time complexity.
## 2026-09-22 - Optimize hasPermission string splitting
**Learning:** When evaluating authorization or permission checks repeatedly (like  inside  render cycle), inline string manipulations like `.split(':')` inside array `.some()` loops create significant allocation overhead. This was an O(N) check with dynamic allocations.
**Action:** Use `useMemo` to pre-parse the permissions array into a fast O(1) `Map<string, Set<string>>` lookup dictionary. This ensures string splitting only occurs when the actual permissions array changes, drastically speeding up authorization checks across the app.
## 2024-05-19 - Optimize hasPermission string splitting
**Learning:** When evaluating authorization or permission checks repeatedly (like `hasPermission` inside `App.tsx` render cycle), inline string manipulations like `.split(':')` inside array `.some()` loops create significant allocation overhead. This was an O(N) check with dynamic allocations.
**Action:** Use `useMemo` to pre-parse the permissions array into a fast O(1) `Map<string, Set<string>>` lookup dictionary. This ensures string splitting only occurs when the actual permissions array changes, drastically speeding up authorization checks across the app.
## 2024-10-24 - Array.prototype.includes vs Set.has inside render loops
**Learning:** Calling `Array.prototype.includes()` inside `.map()` or `.filter()` results in O(N*M) time complexity during render, which can cause frame drops and lag when dealing with many items, as the browser has to iterate through the entire array for each item.
**Action:** Replace `Array.prototype.includes()` with `Set.has()` by memoizing the array into a Set outside the loop to achieve O(1) lookups, resolving O(N*M) bottlenecks.
## 2024-11-20 - Batch N+1 HTTP Requests in LaravelRESTAdapter
**Learning:** Found that `LaravelRESTAdapter.getProducts` was executing an un-chunked array of parallel `Promise.all` requests (launching an N+1 HTTP barrage for every product variant's barcode resolution).
**Action:** Replaced the nested un-chunked maps with a single flat loop iterating over chunks (`CHUNK_SIZE = 10`) of `Promise.all` concurrent execution, storing results in an O(1) Map before final object assembly.
## 2024-11-20 - Avoid N+1 bottlenecks in backend APIs fetching aggregate arrays
**Learning:** In backend client adapters (like `LaravelRESTAdapter`), fetching full collections and triggering N+1 child lookups (like barcodes via `this.getProducts()`) is extremely slow and inefficient when the caller only needs high-level properties from the parent collection (e.g. matching a SKU to a variantId).
**Action:** When mapping data or matching IDs, prefer fetching raw untransformed data points directly from backend listing endpoints (like `/api/catalog/products`) instead of reusing heavy aggregate collection methods that cascade multiple nested N+1 requests, significantly eliminating unnecessary network calls.

## Assertiveness, Decisive PR Execution & Comparative Recommendations
- **Proactive & Decisive PR Submission**: Do NOT repeatedly pause to ask permission to open a pull request (e.g., avoid "Would you like me to open a PR for this?", "Can I submit the PR?", "Should I go ahead and create the PR?"). When an optimization, fix, or feature satisfies requirements, passes local test runners/linters, and preserves architectural invariants, proceed decisively to create and submit the Pull Request with a clear, structured summary and rationale.
- **Explicit Recommendations on Options**: When presenting multiple implementation strategies or architecture options (e.g., Option A vs. Option B), NEVER leave the choice open-ended or passive. Always make an explicit, reasoned recommendation (prefixed with `(Recommended)`) based on **overall technical effectiveness**:
  1. *Algorithmic & Complexity Gains*: Time and space complexity impact (O(N*M) -> O(N+M), reduction of nested scans).
  2. *Resource Overhead*: Heap allocations, memory pressure, and GC pause reduction.
  3. *Domain & Architecture Invariants*: Strict backward compatibility, contract stability, and prevention of regression risks.
  4. *Security & Reliability*: Input validation, cryptographic safety, and concurrency safety.
- **Lead with Recommended Path**: State clearly why the recommended solution delivers the highest net value and immediately execute or propose it as the primary course of action rather than asking open-ended questions.

## Scope Verification, Minimal Churn & CI Protection Directives
- **Scope Verification Before Variable Binding**: When adding interactive states or accessibility attributes (e.g. `disabled={loading}`, `aria-busy={loading}`, `isSubmitting`), NEVER assume a variable identifier exists. Always inspect component props, local state hooks (`useState`), or declaration scope first. If not defined, declare the state hook or reuse an existing scope variable. Never introduce TS2304 / TS2552 ("Cannot find name") compile errors.
- **Surgical Edits Only (No Whole-File Formatting)**: Never run whole-file code formatters (Prettier, Black, Pint, rustfmt) across unmodified lines. Changes must be strictly range-scoped and limited to the minimal AST block needed. Avoid noisy quote/whitespace churn that masks real logic changes and causes merge conflicts. Verify with `git diff -w` that non-functional churn is zero.
- **Zero Scratch File Commits**: Never stage or commit ad-hoc verification, patch, or debug scripts (`test.cjs`, `fix_*.cjs`, `fix_*.php`, `patch_*.py`, `patch_*.sh`, `scratch_*`). Execute checks via the project's native test commands (`npm test`, `pytest`, `phpunit`, etc.) and delete temporary scripts before creating git commits.
- **Never Weaken CI Workflows**: Do not modify `.github/workflows/**` to bypass failures (e.g. adding `|| true`, setting `continue-on-error: true`, or commenting out assertions). Always resolve the defect in the source code or test fixture.
- **Explicit Parameter & Variable Types**: In TypeScript files, avoid implicit `any` by always providing explicit types on functions, parameters, and arrow callbacks (e.g. `(id: string) => ...`). Verify zero type errors with `tsc --noEmit` before committing.

## 2026-09-29 - Surgical Optimization Edits and No Scratch Script Commits
**Learning:** Running whole-file formatters or regenerating entire components while performing performance optimizations introduces massive whitespace/formatting diffs (1,000+ lines), masking the real optimization, invalidating git blame, and causing painful merge conflicts with concurrent PRs. Additionally, committing scratch benchmark or patch scripts (`patch_*.py`, `test.cjs`) pollutes production repositories and triggers CI guardrail failures.
**Action:** Restrict all algorithmic and performance optimizations to strictly scoped replacement chunks. Diff size must reflect only the functional optimization. Always clean up temporary benchmark or patch scripts with `git rm -f` before committing.

## Additive Documentation & Scratch Cleanliness Directives
- **Strictly Additive Journal Updates**: When updating `.jules/*.md`, strictly append new dated entries (`## YYYY-MM-DD - Title`). NEVER delete, truncate, or overwrite historical learnings or previous entries.
- **Substantive Code Diff Requirement**: Pull requests must include substantive code changes in `src/`, `app/`, `lib/`, or `tests/`. Never open PRs that modify only `.jules/*.md` journals or root scratch scripts.
- **Zero Scratch File Commits**: Never commit `*.diff`, `*.patch`, `test_*.ts`, `test_*.js`, `test.cjs`, `fix_*.php`, or `patch_*.py` files. Always remove temporary debugging or verification scripts prior to committing.

## Scope Quarantine, Journaling & Security Test Invariants
- **Strictly Append-Only Journaling**: When adding learnings to `.jules/*.md`, append strictly at the end of the file. Do not rewrite, deduplicate, or remove lines beginning with `## YYYY-MM-DD`.
- **Surgical Scope Quarantine**: Modify only the files directly involved in the issue and their corresponding test fixtures. Do not delete, rename, or perform drive-by cleanups of unrelated root-level scripts or legacy files.
- **Coupled Test Fixture Awareness for Security Invariants**: When changing fail-open fallback behavior (such as hardening decryption to fail closed), always update upstream test mocks that rely on plaintext credentials or mock values.
## 2024-05-18 - Chunking Promise.all for HTTP Request Concurrency
**Learning:** In frontend API adapters handling massive catalogs, `Promise.all` triggers a thundering herd of HTTP connections. This often results in socket exhaustion (e.g., `EMFILE` or `EADDRNOTAVAIL`), proxy overloads, and N+1 API stalls, defeating the intended concurrency benefits.
**Action:** When making concurrent HTTP requests inside iteration loops, replace raw `Promise.all` arrays with chunked arrays that process requests in limited batches (e.g., `CHUNK_SIZE = 10`) sequentially, or use connection pooling where supported.

## 2025-05-18 - GraphQL Variant Name Mapping Cache in Valuation Report
**Learning:** Calling `getProducts()` inside `getValuationReport` incurred N+1 barcode set fetching network queries and O(N*M) loop re-computation for variant name formatting on every invocation.
**Action:** Replaced `getProducts()` in `getValuationReport` with a cached targeted `GetProductVariantNames` GraphQL query, eliminating barcode requests and enabling O(1) map lookups on subsequent report generations.
