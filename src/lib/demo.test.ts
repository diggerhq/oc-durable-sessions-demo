import { describe, expect, it } from "vitest";
import { activeSlide, slides } from "./demo";

describe("durability demo", () => {
  it("starts with the naive run and follows with message delivery", () => {
    expect(slides.map((slide) => slide.id)).toEqual([
      "naive-sandbox",
      "message-delivery",
      "credential-security",
      "durable-session",
    ]);
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

  it("shows the exact stdout relay behind message delivery", () => {
    const delivery = slides.find((slide) => slide.id === "message-delivery");
    const concept = delivery?.codeViews.find((view) => view.id === "concept");
    const source = delivery?.codeViews.find((view) => view.id === "source");

    expect(concept?.code).toContain("onStdout(bytes)");
    expect(concept?.code).toContain("new ClaudeJsonLines()");
    expect(concept?.code).toContain("--output-format stream-json");
    expect(concept?.code).toContain("run.messages[message.id] = message");
    expect(concept?.code).toContain("runs.set(run.id, run)");
    expect(source?.code).toContain("export async function streamClaudeMessages");
    expect(source?.code).toContain("content_block_delta");
  });

  it("shows fake raw credentials and the exact safe security runner", () => {
    const security = slides.find(
      (slide) => slide.id === "credential-security",
    );
    const concept = security?.codeViews.find((view) => view.id === "concept");
    const source = security?.codeViews.find((view) => view.id === "source");

    expect(security?.runKind).toBe("security");
    expect(concept?.code).toContain(
      'ANTHROPIC_API_KEY: "demo-llm-key-not-real"',
    );
    expect(concept?.code).toContain('GH_TOKEN: "demo-git-token-not-real"');
    expect(concept?.code).toContain("WEBHOOK_URL: sink.url");
    expect(source?.filename).toBe("security-sandbox-run.ts");
    expect(source?.code).toContain("export async function runSecuritySandbox");
    expect(source?.code).toContain('name: "run_in_sandbox"');
    expect(source?.code).toContain("FAKE_ANTHROPIC_API_KEY");
    expect(source?.code).toContain("FAKE_GH_TOKEN");
  });

  it("ends with the exact durable session runner used by the server", () => {
    const durable = slides.find((slide) => slide.id === "durable-session");
    const concept = durable?.codeViews.find((view) => view.id === "concept");
    const source = durable?.codeViews.find((view) => view.id === "source");

    expect(durable?.runKind).toBe("session");
    expect(durable?.outputView).toBe("events");
    expect(concept?.code).toContain("oc.sessions.create");
    expect(concept?.code).toContain("session.events");
    expect(concept?.code).toContain('event.type === "turn.completed"');
    expect(concept?.code).not.toContain("Sandbox.create");
    expect(source?.filename).toBe("durable-session-run.ts");
    expect(source?.code).toContain("export async function runDurableSession");
    expect(source?.code).toContain('level: "progress"');
  });
});
