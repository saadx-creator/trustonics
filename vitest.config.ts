import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(".") } },
  test: {
    server: { deps: { inline: ["next-auth"] } },
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: "threads",
    maxWorkers: 1,
    minWorkers: 1,
  },
});
