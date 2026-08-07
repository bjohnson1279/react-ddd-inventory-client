1. **Identify Performance Bottlenecks**: Review `src/App.tsx` for inline array traversals (`.filter()`, `.some()`) that run on every render pass.
2. **Implement Memoization optimizations**:
    - Memoize `sentPurchaseOrders` to replace inline `purchaseOrders.some(...)` and `purchaseOrders.filter(...)` inside the render loop of the 'procurement' tab.
    - Memoize `filteredWmsLocations` to replace the inline `wmsLocations.filter(...)` inside the 'warehouse' map rendering.
3. **Add explanatory comments**: Annotate the optimized code with `// ⚡ Bolt: ` as per guidelines.
4. **Update Journal**: Add a new entry to `.jules/bolt.md` detailing the performance patterns optimized (memoizing inline filtering to prevent main thread blocking).
5. **Pre-commit verification**: Run test/lint equivalents (or pre-commit instructions) to ensure code quality and safety.
6. **Submit PR**: Submit the changes with appropriate title and description as "Bolt".
