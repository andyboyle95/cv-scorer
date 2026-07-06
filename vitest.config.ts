import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest config. Kept intentionally minimal — we test pure functions right
// now (prose sanitiser, whitelist resolver), not React components. Path
// alias mirrors the tsconfig so `@/lib/...` imports resolve the same way.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
