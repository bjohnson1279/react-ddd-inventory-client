const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');
code = code.replace("  plugins: [react()],\n\n})", "  plugins: [react()],\n  test: {\n    environment: 'jsdom',\n    globals: true,\n    pool: 'threads',\n    poolOptions: {\n      threads: {\n        singleThread: true\n      }\n    }\n  }\n})");
fs.writeFileSync('vite.config.ts', code);
