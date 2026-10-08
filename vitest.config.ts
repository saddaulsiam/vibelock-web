import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/empty.js'),
      'next/cache': path.resolve(__dirname, './tests/mocks/next-cache.js'),
      'next/server': path.resolve(__dirname, './tests/empty.js')
    }
  }
});
