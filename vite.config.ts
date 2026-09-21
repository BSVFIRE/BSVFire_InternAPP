import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // wasm-plugin + es2022-mål trengs for PowerSync (SQLite i nettleseren via WebAssembly, web workers og top-level await)
  plugins: [wasm(), react()],
  build: { target: 'es2022' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Pakkene inneholder web workers og WASM som ikke skal pre-bundles
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
    include: ['@powersync/web > js-logger'],
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
})
