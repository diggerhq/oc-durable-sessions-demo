import { describe, expect, it } from "vitest";
import type { Event } from "@opencomputer/sdk";
import { projectSessionEvent } from "./durable-session-run";

function event(type: string, body: Record<string, unknown>): Event {
  return {
    id: `evt_${type}`,
    seq: 7,
    ts: "2026-07-20T22:00:00.000Z",
    session: "ses_demo",
    actor: { id: "agent", type: "agent" },
    level: "progress",
    refs: {},
    type,
    body,
  } as Event;
}

describe("projectSessionEvent", () => {
  it("keeps the durable cursor and readable agent output", () => {
    expect(projectSessionEvent(event("agent.message", { text: "Done." }))).toEqual({
      id: "evt_agent.message",
      seq: 7,
      type: "agent.message",
      level: "progress",
      at: "2026-07-20T22:00:00.000Z",
      summary: "Done.",
    });
  });

  it("summarizes terminal events without parsing prose", () => {
    expect(
      projectSessionEvent(
        event("turn.completed", {
          turnId: "trn_demo",
          yieldReason: "completed",
        }),
      ).summary,
    ).toBe("Turn completed");
  });
});
