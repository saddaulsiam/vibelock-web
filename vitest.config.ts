import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup-env.ts"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/empty.js"),
      "next/cache": path.resolve(__dirname, "./tests/mocks/next-cache.js"),
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
    },
  },
});
