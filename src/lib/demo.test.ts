import { describe, expect, it } from "vitest";
import { activeSlide, slides } from "./demo";

describe("durability demo", () => {
  it("starts with only the real naive sandbox example", () => {
    expect(slides).toHaveLength(1);
    expect(activeSlide.id).toBe("naive-sandbox");
  });

  it("shows the same public primitives used by the live adapter", () => {
    const concept = activeSlide.codeViews.find((view) => view.id === "concept");
    expect(concept?.code).toContain("Sandbox.create");
    expect(concept?.code).toContain("sandbox.exec.run");
    expect(concept?.code).toContain("sandbox.files.write");
    expect(concept?.code).toContain("claude -p");
    expect(concept?.code).not.toMatch(/^\s*\/\//m);
    expect(concept?.code).not.toMatch(/mock|stand-in|sessions\.create/i);
  });

  it("exposes the exact runner source used by the server", () => {
    const source = activeSlide.codeViews.find((view) => view.id === "source");
    expect(source?.filename).toBe("naive-sandbox-run.ts");
    expect(source?.code).toContain("export async function runNaiveSandbox");
    expect(source?.code).toContain("Claude Code finished without opening");
  });
});
