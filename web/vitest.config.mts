import { defineConfig } from "vitest/config";
import path from "path";
import { coverageExclude } from "./vitest.shared";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    globals: true,
    // Node 25 以降はグローバルに localStorage（Web Storage）があり、jsdom の localStorage を隠してしまうため切る
    poolOptions: {
      forks: { execArgv: ["--no-experimental-webstorage"] },
      threads: { execArgv: ["--no-experimental-webstorage"] },
    },
    exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: coverageExclude,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
