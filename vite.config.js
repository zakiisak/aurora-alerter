import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  server: {
    port: 4748,
    proxy: {
      '/api': {
        target: 'http://localhost:4747',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  define: {
    global: 'globalThis',
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
});

