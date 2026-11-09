import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "./missing-schema-error";

describe("isMissingSchemaError", () => {
  it("表や列が無いときのエラーだけを見分ける", () => {
    expect(isMissingSchemaError({ code: "42P01" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST205" })).toBe(true);
    expect(isMissingSchemaError({ code: "42703" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST204" })).toBe(true);
    expect(isMissingSchemaError({ code: "23505" })).toBe(false);
    expect(isMissingSchemaError({ code: null })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
  });
});
