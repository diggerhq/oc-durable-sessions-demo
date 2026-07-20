import { OpenComputer, type Event, type SessionStatus } from "@opencomputer/sdk";

export interface DurableSessionRunInput {
  apiKey: string;
  apiUrl?: string;
  agentId: string;
  message: string;
  requestId: string;
}

export interface DurableSessionStarted {
  id: string;
  status: SessionStatus;
}

export interface DurableSessionEventUpdate {
  id: string;
  seq: number;
  type: string;
  level: string;
  at: string;
  summary: string;
}

export interface DurableSessionRunResult {
  id: string;
  status: SessionStatus;
  outcome: string;
  result?: string;
}

const SESSION_TIMEOUT_MS = 10 * 60 * 1_000;

function bodyValue(event: Event, key: string): unknown {
  return (event.body as Record<string, unknown>)[key];
}

function stringValue(event: Event, key: string): string | undefined {
  const value = bodyValue(event, key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(event: Event, key: string): number | undefined {
  const value = bodyValue(event, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function summarizeEvent(event: Event): string {
  const direct = stringValue(event, "text") ?? stringValue(event, "summary");
  if (direct) return direct.slice(0, 4_000);

  if (event.type === "tool.call") {
    const tool = stringValue(event, "tool") ?? "tool";
    const args = stringValue(event, "argsSummary");
    return args ? `${tool} · ${args}` : tool;
  }

  if (event.type === "exec.completed") {
    const command = stringValue(event, "command") ?? "command";
    const exitCode = numberValue(event, "exitCode");
    return `${command} · exit ${exitCode ?? "?"}`;
  }

  if (event.type === "turn.started") return "Turn started";
  if (event.type === "turn.completed") {
    return `Turn ${terminalOutcome(event)}`;
  }

  const message = stringValue(event, "message");
  if (message) return message.slice(0, 4_000);

  const compact = JSON.stringify(event.body);
  return compact === "{}" ? "" : compact.slice(0, 1_000);
}

export function projectSessionEvent(event: Event): DurableSessionEventUpdate {
  return {
    id: event.id,
    seq: event.seq,
    type: event.type,
    level: event.level,
    at: event.ts,
    summary: summarizeEvent(event),
  };
}

function terminalOutcome(event: Event): string {
  return (
    stringValue(event, "yieldReason") ??
    stringValue(event, "outcome") ??
    "completed"
  );
}

/**
 * The exact Durable Agent Sessions path used by the demo: one idempotent create,
 * followed by the SDK's replaying SSE iterator until this turn is terminal.
 */
export async function runDurableSession(
  input: DurableSessionRunInput,
  onStarted: (session: DurableSessionStarted) => void,
  onEvent: (event: DurableSessionEventUpdate) => void,
): Promise<DurableSessionRunResult> {
  const oc = new OpenComputer({
    apiKey: input.apiKey,
    ...(input.apiUrl ? { baseUrl: input.apiUrl } : {}),
  });
  const session = await oc.sessions.create({
    agent: input.agentId,
    input: input.message,
    idempotencyKey: input.requestId,
  });
  onStarted({ id: session.id, status: session.status });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
  let outcome: string | undefined;

  try {
    for await (const event of session.events({
      level: "progress",
      signal: controller.signal,
    })) {
      onEvent(projectSessionEvent(event));
      if (event.type === "turn.completed") {
        outcome = terminalOutcome(event);
        break;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!outcome) {
    throw new Error("Timed out before the durable session emitted turn.completed.");
  }

  await session.refresh();
  const resolved = await session.result();
  const result = resolved.result
    ? stringValue(resolved.result, "text") ?? stringValue(resolved.result, "summary")
    : undefined;

  return {
    id: session.id,
    status: session.status,
    outcome,
    ...(result ? { result } : {}),
  };
}
