import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react(),
    // Vite 向けの Node.js ポリフィルプラグイン
    nodePolyfills({
      protocolImports: true,
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  server: {
    host: true,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer',
      events: 'events',
      path: 'path-browserify',
      os: 'os-browserify/browser',
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      '@solana/web3.js',
      '@solana/spl-token',
      'crypto-browserify',
      'react',
      'react-dom',
      'stream-browserify',
      'events',
      'path-browserify',
      'os-browserify/browser',
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
      ],
    },
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
