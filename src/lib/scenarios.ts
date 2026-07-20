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
  step: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  runtime: "claude" | "codex" | "flue";
  contractKind: ContractKind;
  contractLabel: string;
  requiresStandIn: boolean;
  agentEnv: string;
  code: string;
  emphasisLines: number[];
  defaultInput: string;
  presenterNote: string;
}

const sharedInput =
  "Turn these customer notes into a crisp action plan with the next best action.";

export const scenarios: DemoScenario[] = [
  {
    id: "claude",
    step: "01",
    navLabel: "Claude",
    eyebrow: "The smallest useful start",
    title: "One call. A durable session.",
    description:
      "Choose a runtime, give it work, and get an addressable session back immediately.",
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
    presenterNote:
      "The call returns a durable session id; the agent keeps working after this page closes.",
  },
  {
    id: "codex",
    step: "02",
    navLabel: "Codex",
    eyebrow: "Runtime is a choice",
    title: "Same session. Different engine.",
    description:
      "The application keeps the same durable contract while the runtime changes underneath it.",
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
    presenterNote:
      "This is the portability beat: change one line, keep the session lifecycle and event log.",
  },
  {
    id: "inline",
    step: "03",
    navLabel: "Inline behavior",
    eyebrow: "The complexity arrives",
    title: "Useful agents need more than a model.",
    description:
      "Prompts and skills can be sent inline—but repeating the whole definition is the wrong boundary.",
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
    presenterNote:
      "Let the code feel too large. The next beat is the relief: give this behavior an identity and history.",
  },
  {
    id: "saved",
    step: "04",
    navLabel: "Saved agent",
    eyebrow: "Define behavior once",
    title: "The application gets small again.",
    description:
      "A saved agent owns its prompt, runtime, model, skills, and immutable revision history.",
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
    presenterNote:
      "Open the agent in the dashboard: edit the prompt, save, and show the new immutable revision.",
  },
  {
    id: "repository",
    step: "05",
    navLabel: "Agent from repo",
    eyebrow: "Definition meets version control",
    title: "An agent is a repository.",
    description:
      "Prompt and skill changes become reviewable commits and deploy into new agent revisions.",
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
    presenterNote:
      "Push a small prompt or skill change in GitHub, then show the resulting deployment and revision in OpenComputer.",
  },
  {
    id: "flue",
    step: "06",
    navLabel: "Flue app",
    eyebrow: "Own the implementation",
    title: "Custom framework. Same session call.",
    description:
      "A deployed Flue application can own control flow and use Pi underneath without changing its caller.",
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
    presenterNote:
      "Show the Flue repo or `oc agent deploy`, then open the resulting session and its neutral event log.",
  },
];

export const scenarioById = Object.fromEntries(
  scenarios.map((scenario) => [scenario.id, scenario]),
) as Record<ScenarioId, DemoScenario>;

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && value in scenarioById;
}

