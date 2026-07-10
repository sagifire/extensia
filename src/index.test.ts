import { describe, expect, it } from "vitest";

describe("package entry point", () => {
  it("loads as an ESM module", async () => {
    const packageModule = await import("./index.js");

    expect(Object.keys(packageModule)).toEqual([]);
  });
});
