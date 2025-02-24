import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    'process.env': {}
  },
  resolve: {
    alias: {
      buffer: "buffer",
      stream: 'stream-browserify'
    }
  },
  optimizeDeps: {
    include: ['buffer', '@solana/web3.js', '@solana/spl-token'],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
  }
});