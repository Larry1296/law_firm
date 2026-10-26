import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { env } from 'node:process';

const devPort = Number(env.VITE_DEV_PORT || 5173);

export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    globals: true,
  },

  server: {
    host: 'localhost',
    port: devPort,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: devPort,
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
