import { vi } from "vitest";

// Next.js の "server-only" パッケージをモック
// サーバー専用ファイルのユニットテストで必要
vi.mock("server-only", () => ({}));

// jsdom には ResizeObserver が無い。Radix UI（Switch など）の描画テストで必要
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
