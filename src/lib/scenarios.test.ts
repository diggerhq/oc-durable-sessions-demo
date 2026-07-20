import { describe, expect, it } from "vitest";
import { scenarioById, scenarios } from "./scenarios";

describe("demo scenarios", () => {
  it("keeps six unique examples", () => {
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(6);
  });

  it("marks every proposed or preview contract as a stand-in", () => {
    for (const scenario of scenarios) {
      expect(scenario.requiresStandIn).toBe(scenario.contractKind !== "public");
    }
  });

  it("uses the exact public session call for saved and Flue agents", () => {
    expect(scenarioById.saved.code).toContain("oc.sessions.create");
    expect(scenarioById.saved.code).toContain("agent: process.env.SUPPORT_AGENT_ID!");
    expect(scenarioById.flue.code).toContain("agent: process.env.FLUE_AGENT_ID!");
  });
});
