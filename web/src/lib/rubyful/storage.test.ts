// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getRubyEnabledFromStorage,
  resolveRubyEnabled,
  setRubyEnabledToStorage,
} from "./storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getRubyEnabledFromStorage", () => {
    it("localStorage未設定の場合falseを返す", () => {
      expect(getRubyEnabledFromStorage()).toBe(false);
    });

    it('localStorage="true"の場合trueを返す', () => {
      localStorage.setItem("rubyful-enabled", "true");
      expect(getRubyEnabledFromStorage()).toBe(true);
    });

    it('localStorage="false"の場合falseを返す', () => {
      localStorage.setItem("rubyful-enabled", "false");
      expect(getRubyEnabledFromStorage()).toBe(false);
    });

    it('localStorage="other"の場合falseを返す', () => {
      localStorage.setItem("rubyful-enabled", "other");
      expect(getRubyEnabledFromStorage()).toBe(false);
    });
  });

  describe("サイトの設定（管理画面のふりがな）", () => {
    it("最初から表示する設定なら、未保存の人には表示する", () => {
      expect(
        getRubyEnabledFromStorage({ available: true, defaultOn: true })
      ).toBe(true);
    });

    it("見る人がオフを選んでいれば、最初から表示する設定でも表示しない", () => {
      localStorage.setItem("rubyful-enabled", "false");
      expect(
        getRubyEnabledFromStorage({ available: true, defaultOn: true })
      ).toBe(false);
    });

    it("ふりがなを使わない設定なら、オンを選んでいた人にも表示しない", () => {
      localStorage.setItem("rubyful-enabled", "true");
      expect(
        getRubyEnabledFromStorage({ available: false, defaultOn: true })
      ).toBe(false);
    });
  });

  describe("resolveRubyEnabled", () => {
    it.each([
      [null, true, false, false],
      [null, true, true, true],
      ["true", true, false, true],
      ["false", true, true, false],
      ["other", true, true, true],
      ["true", false, true, false],
      [null, false, true, false],
    ] as const)("保存=%s 使える=%s 最初から=%s → %s", (stored, available, defaultOn, expected) => {
      expect(resolveRubyEnabled(stored, { available, defaultOn })).toBe(
        expected
      );
    });
  });

  describe("setRubyEnabledToStorage", () => {
    it('enabled=trueでlocalStorageに"true"を保存する', () => {
      setRubyEnabledToStorage(true);
      expect(localStorage.getItem("rubyful-enabled")).toBe("true");
    });

    it('enabled=falseでlocalStorageに"false"を保存する', () => {
      setRubyEnabledToStorage(false);
      expect(localStorage.getItem("rubyful-enabled")).toBe("false");
    });
  });
});
