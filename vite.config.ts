import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'forks',
    fileParallelism: false,
        environment: 'jsdom',
    globals: true,
  },
})
