1. **Optimize IntercompanyPanel.tsx**
   - I will use a custom script to modify `src/panels/IntercompanyPanel.tsx` to add `useMemo` and map `entities` array.
   ```bash
   cat << 'EOC' > update.cjs
   const fs = require('fs');
   const path = require('path');
   const filePath = path.join(__dirname, 'src', 'panels', 'IntercompanyPanel.tsx');
   let content = fs.readFileSync(filePath, 'utf8');

   content = content.replace(
     "import React, { useEffect, useState } from 'react';",
     "import React, { useEffect, useState, useMemo } from 'react';"
   );

   const loadDataBlock = `  const loadData = async () => {`;
   const useMemoBlock = `  // ⚡ Bolt: Replace O(N*M) array find inside render loop with O(N+M) Map lookup for entity names
  const entityMap = useMemo(() => {
    const map = new Map();
    entities.forEach(e => map.set(e.id, e.name));
    return map;
  }, [entities]);

  const loadData = async () => {`;
   content = content.replace(loadDataBlock, useMemoBlock);

   content = content.replace(
     "<td className=\"py-3 px-6 text-slate-700\">{entities.find(e => e.id === t.fromEntityId)?.name || t.fromEntityId}</td>",
     "<td className=\"py-3 px-6 text-slate-700\">{entityMap.get(t.fromEntityId) || t.fromEntityId}</td>"
   );

   content = content.replace(
     "<td className=\"py-3 px-6 text-slate-700\">{entities.find(e => e.id === t.toEntityId)?.name || t.toEntityId}</td>",
     "<td className=\"py-3 px-6 text-slate-700\">{entityMap.get(t.toEntityId) || t.toEntityId}</td>"
   );

   fs.writeFileSync(filePath, content, 'utf8');
   EOC
   node update.cjs && rm -f update.cjs
   ```

2. **Verify changes**
   - Run `sed -n '20,40p' src/panels/IntercompanyPanel.tsx` and `sed -n '150,170p' src/panels/IntercompanyPanel.tsx` to verify the code logic and replaced strings.

3. **Update Bolt journal**
   - I will update `.jules/bolt.md` using the exact bash command using append redirection:
   ```bash
   cat << 'EOC' >> .jules/bolt.md
   ## 2024-09-19 - Replace O(N*M) array find with O(N+M) Map lookup in render loops
   **Learning:** Found a major performance bottleneck where `entities.find` was called twice inside `transfers.map` during the React component render in `IntercompanyPanel`. This causes an O(N * M) operation blocking the main thread on every render.
   **Action:** Replace nested loops/finds in render functions with an O(N + M) grouping strategy. Convert the smaller array into a `Map` structure using `useMemo` prior to iterating the second collection, resulting in O(1) lookups.
   EOC
   ```

4. **Run unit tests**
   - Run `pnpm run test:unit`

5. **Type checking validation**
   - Run `npx tsc --noEmit` to verify type safety.

6. **End-to-End Testing**
   - Run `pnpm exec playwright install` and `pnpm run test:e2e`

7. **Complete pre-commit steps**
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit Pull Request**
   - Call submit with:
     - Branch name: `bolt-perf-intercompany`
     - Title: `⚡ Bolt: [performance improvement] Replace O(N*M) array find with O(N+M) Map lookup in IntercompanyPanel`
     - Description:
       ```
       💡 What: Replaced inline `entities.find` inside `transfers.map` loop with an O(1) `useMemo` Map lookup.
       🎯 Why: To fix an O(N * M) performance bottleneck inside a render loop where `find` was being called twice on every iteration, leading to expensive re-renders.
       📊 Impact: Reduces time complexity from O(N * M) to O(N + M), significantly lowering CPU load and preventing main-thread blocking on larger datasets.
       🔬 Measurement: Verified with existing unit and end-to-end tests that no functionality was broken.
       ```
