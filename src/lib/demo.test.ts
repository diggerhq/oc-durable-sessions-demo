import { describe, expect, it } from "vitest";
import { activeSlide, slides } from "./demo";

describe("durability demo", () => {
  it("starts with only the real naive sandbox example", () => {
    expect(slides).toHaveLength(1);
    expect(activeSlide.id).toBe("naive-sandbox");
  });

  it("shows the same public primitives used by the live adapter", () => {
    expect(activeSlide.code).toContain("Sandbox.create");
    expect(activeSlide.code).toContain("sandbox.exec.run");
    expect(activeSlide.code).toContain("sandbox.files.write");
    expect(activeSlide.code).toContain("claude -p");
    expect(activeSlide.code).not.toMatch(/mock|stand-in|sessions\.create/i);
  });
});
