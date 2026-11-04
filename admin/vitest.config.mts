import { defineConfig } from "vitest/config";
import path from "path";

const nodeMajor = Number(process.versions.node.split(".")[0]);
const nodeExecArgv = nodeMajor >= 22 ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Node 25 以降はグローバルに localStorage（Web Storage）があり、jsdom の localStorage を隠してしまうため切る。
    // このフラグは Node 22 で入ったので、それより古い Node（CI の 20 など）では付けない
    poolOptions: {
      forks: { execArgv: nodeExecArgv },
      threads: { execArgv: nodeExecArgv },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
