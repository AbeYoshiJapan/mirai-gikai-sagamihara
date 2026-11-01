import { DEFAULT_SITE_SETTINGS } from "@mirai-gikai/shared/site-settings/defaults";
import { SITE_SETTINGS_SECTIONS } from "@mirai-gikai/shared/site-settings/schema";
import { describe, expect, it } from "vitest";
import { getSectionDefinition, SECTION_DEFINITIONS } from "./field-definitions";

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((cursor, key) => {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    return (cursor as Record<string, unknown>)[key];
  }, obj);
}

function collectLeafPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return [prefix];
  }
  return Object.entries(obj).flatMap(([key, value]) =>
    collectLeafPaths(value, prefix ? `${prefix}.${key}` : key)
  );
}

describe("SECTION_DEFINITIONS", () => {
  it("全セクションに定義がある", () => {
    for (const section of SITE_SETTINGS_SECTIONS) {
      expect(() => getSectionDefinition(section)).not.toThrow();
    }
    expect(SECTION_DEFINITIONS).toHaveLength(SITE_SETTINGS_SECTIONS.length);
  });

  it("項目のパスはすべて既定値に存在する（打ち間違い防止）", () => {
    for (const definition of SECTION_DEFINITIONS) {
      const defaults = DEFAULT_SITE_SETTINGS[definition.section];
      for (const group of definition.groups) {
        for (const field of group.fields) {
          expect(
            getByPath(defaults, field.name),
            `${definition.section}.${field.name}`
          ).not.toBeUndefined();
        }
        if (group.custom) {
          expect(
            Array.isArray(getByPath(defaults, group.custom.name)),
            `${definition.section}.${group.custom.name}`
          ).toBe(true);
        }
      }
    }
  });

  it("既定値の項目はすべてフォームに出る（設定できない項目を作らない）", () => {
    for (const definition of SECTION_DEFINITIONS) {
      const defaults = DEFAULT_SITE_SETTINGS[definition.section];
      const covered = new Set<string>();
      for (const group of definition.groups) {
        for (const field of group.fields) covered.add(field.name);
        if (group.custom) covered.add(group.custom.name);
      }
      for (const path of collectLeafPaths(defaults)) {
        expect(covered.has(path), `${definition.section}.${path}`).toBe(true);
      }
    }
  });

  it("select と image には必要な付随情報がある", () => {
    for (const definition of SECTION_DEFINITIONS) {
      for (const group of definition.groups) {
        for (const field of group.fields) {
          if (field.kind === "select") {
            expect(field.options?.length, field.name).toBeGreaterThan(0);
          }
          if (field.kind === "image") {
            expect(field.assetKind, field.name).toBeDefined();
          }
        }
      }
    }
  });
});
