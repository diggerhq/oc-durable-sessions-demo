import type { ScenarioId } from "./scenarios";

export type ExecutionMode =
  | "checking"
  | "live"
  | "stand-in"
  | "simulated"
  | "unavailable";

export interface ScenarioConfig {
  execution: Exclude<ExecutionMode, "checking">;
  detail: string;
}

export interface DemoConfig {
  mode: "auto" | "mock" | "live";
  scenarios: Record<ScenarioId, ScenarioConfig>;
}

export interface SessionReceipt {
  execution: "live" | "stand-in" | "simulated";
  durationMs: number;
  session: {
    id: string;
    status: string;
    agentId: string;
    runtime: string;
    revision?: number;
  };
  dashboardUrl?: string;
  response: Record<string, unknown>;
}

interface ApiError {
  error?: {
    message?: string;
  };
}

export async function loadDemoConfig(): Promise<DemoConfig> {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Could not read the local demo configuration.");
  return response.json() as Promise<DemoConfig>;
}

export async function createDemoSession(args: {
  scenario: ScenarioId;
  input: string;
  requestId: string;
}): Promise<SessionReceipt> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? `Run failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<SessionReceipt>;
}

