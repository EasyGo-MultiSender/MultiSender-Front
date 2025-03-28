/// <reference types="vitest" />
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { splashScreen } from 'vite-plugin-splash-screen';
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
    splashScreen({
      logoSrc: 'logo.html',
      loaderType: 'dots',
      loaderBg: '#ffffff',
      splashBg: '#17062e',
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
  test: {
    environment: 'jsdom', // React コンポーネントをテストするために jsdom を使用
    globals: true, // Jest のように 'describe', 'test', 'expect' などをグローバルに使用できる
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setupTests.ts'], // テスト前に実行するファイル（後述）
  },
});
