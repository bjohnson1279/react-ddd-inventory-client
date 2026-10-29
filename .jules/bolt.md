## 2024-05-30 - Optimize Array Chaining in Render Loops
**Learning:** Consecutive array methods (`.split().map().filter()`) inside a component render loop trigger unnecessary intermediate array allocations, blocking the main thread and impacting performance in heavily re-rendered components like `PythonWorkforcePanel`.
**Action:** Always replace chained array methods with a single-pass `.reduce()` and memoize the result with `useMemo` when calculating derived values from primitive inputs during renders.
