import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.js')
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife'
      }
    },
    emptyOutDir: false,
    minify: 'esbuild',
    modulePreload: { polyfill: false }
  }
});
