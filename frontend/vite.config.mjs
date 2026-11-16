import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// REACT_APP_* names are kept so existing Docker build args and scripts still work.
export default defineConfig({
  base: process.env.PUBLIC_URL || '/',
  envPrefix: ['VITE_', 'REACT_APP_'],
  plugins: [react()],
  build: {
    outDir: 'build',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
