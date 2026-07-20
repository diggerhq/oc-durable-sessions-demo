export type ScenarioId =
  | "claude"
  | "codex"
  | "inline"
  | "saved"
  | "repository"
  | "flue";

export type ContractKind = "proposed" | "public" | "preview";

export interface DemoScenario {
  id: ScenarioId;
  navLabel: string;
  runtime: "claude" | "codex" | "flue";
  contractKind: ContractKind;
  contractLabel: string;
  requiresStandIn: boolean;
  agentEnv: string;
  code: string;
  emphasisLines: number[];
  defaultInput: string;
}

const sharedInput =
  "Turn these customer notes into a crisp action plan with the next best action.";

export const scenarios: DemoScenario[] = [
  {
    id: "claude",
    navLabel: "Claude",
    runtime: "claude",
    contractKind: "proposed",
    contractLabel: "Proposed inline API",
    requiresStandIn: true,
    agentEnv: "OC_DEMO_CLAUDE_AGENT_ID",
    code: `import { OpenComputer } from "@opencomputer/sdk";

const oc = new OpenComputer({
  apiKey: process.env.OPENCOMPUTER_API_KEY!,
});

const session = await oc.sessions.create({
  agent: { runtime: "claude" },
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [8],
    defaultInput: sharedInput,
  },
  {
    id: "codex",
    navLabel: "Codex",
    runtime: "codex",
    contractKind: "proposed",
    contractLabel: "Proposed inline API",
    requiresStandIn: true,
    agentEnv: "OC_DEMO_CODEX_AGENT_ID",
    code: `import { OpenComputer } from "@opencomputer/sdk";

const oc = new OpenComputer({
  apiKey: process.env.OPENCOMPUTER_API_KEY!,
});

const session = await oc.sessions.create({
  agent: { runtime: "codex" },
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [8],
    defaultInput: sharedInput,
  },
  {
    id: "inline",
    navLabel: "Inline config",
    runtime: "codex",
    contractKind: "proposed",
    contractLabel: "Proposed inline API",
    requiresStandIn: true,
    agentEnv: "OC_DEMO_INLINE_AGENT_ID",
    code: `const session = await oc.sessions.create({
  agent: {
    runtime: "codex",
    model: "openai/gpt-5-codex",
    prompt: \`You are Acme's support operations agent.
Classify the issue, find the policy that applies, and
produce a concise action plan. Never invent policy.\`,
    skills: [
      {
        path: "triage/SKILL.md",
        content: \`# Triage
1. Identify urgency and customer impact.
2. Separate facts from assumptions.
3. Name one owner and one next action.\`,
      },
      {
        path: "voice/SKILL.md",
        content: \`# Voice
Be direct, calm, and specific. Avoid filler.
Quote policy only when a source is available.\`,
      },
    ],
  },
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    defaultInput: sharedInput,
  },
  {
    id: "saved",
    navLabel: "Agent",
    runtime: "claude",
    contractKind: "public",
    contractLabel: "Public API",
    requiresStandIn: false,
    agentEnv: "OC_DEMO_SAVED_AGENT_ID",
    code: `import { OpenComputer } from "@opencomputer/sdk";

const oc = new OpenComputer({
  apiKey: process.env.OPENCOMPUTER_API_KEY!,
});

const session = await oc.sessions.create({
  agent: process.env.SUPPORT_AGENT_ID!,
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [8],
    defaultInput: sharedInput,
  },
  {
    id: "repository",
    navLabel: "Repo agent",
    runtime: "claude",
    contractKind: "preview",
    contractLabel: "Source profile preview",
    requiresStandIn: true,
    agentEnv: "OC_DEMO_REPO_AGENT_ID",
    code: `import { OpenComputer } from "@opencomputer/sdk";

const oc = new OpenComputer({
  apiKey: process.env.OPENCOMPUTER_API_KEY!,
});

// Definition: github.com/acme/support-agent @ main
const session = await oc.sessions.create({
  agent: process.env.REPO_AGENT_ID!,
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [7, 9],
    defaultInput: sharedInput,
  },
  {
    id: "flue",
    navLabel: "Flue",
    runtime: "flue",
    contractKind: "public",
    contractLabel: "Public API",
    requiresStandIn: false,
    agentEnv: "OC_DEMO_FLUE_AGENT_ID",
    code: `import { OpenComputer } from "@opencomputer/sdk";

const oc = new OpenComputer({
  apiKey: process.env.OPENCOMPUTER_API_KEY!,
});

// Deployed from GitHub or with: oc agent deploy
const session = await oc.sessions.create({
  agent: process.env.FLUE_AGENT_ID!,
  input: "Turn these customer notes into a crisp action plan.",
});

console.log(session.id);`,
    emphasisLines: [7, 9],
    defaultInput: sharedInput,
  },
];

export const scenarioById = Object.fromEntries(
  scenarios.map((scenario) => [scenario.id, scenario]),
) as Record<ScenarioId, DemoScenario>;

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && value in scenarioById;
}
