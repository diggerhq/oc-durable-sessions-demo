export type RunStage =
  | "queued"
  | "creating_session"
  | "streaming_session"
  | "preparing_sink"
  | "preparing_image"
  | "preparing_repository"
  | "running_claude"
  | "running_security_agent"
  | "executing_security_action"
  | "verifying_pull_request"
  | "verifying_capture"
  | "completed"
  | "failed";

export type DemoRunKind = "agent" | "security" | "session";

export interface DemoConfig {
  execution: "live" | "unavailable";
  missing: string[];
  targetRepo: string;
  durableSession: {
    execution: "live" | "unavailable";
    missing: string[];
    agentId: string;
  };
}

export interface RunProgress {
  stage: RunStage;
  label: string;
  at: string;
}

export interface SandboxMessage {
  id: string;
  kind: "assistant" | "tool";
  name?: string;
  text: string;
  state: "streaming" | "complete";
  isError?: boolean;
  at: string;
  updatedAt: string;
}

export interface DurableSessionEvent {
  id: string;
  seq: number;
  type: string;
  level: string;
  at: string;
  summary: string;
}

export interface DemoRun {
  id: string;
  kind: DemoRunKind;
  state: "running" | "succeeded" | "failed";
  stage: RunStage;
  startedAt: string;
  updatedAt: string;
  durationMs: number;
  sandbox?: {
    id: string;
    dashboardUrl: string;
  };
  session?: {
    id: string;
    dashboardUrl: string;
    status: string;
    outcome?: string;
  };
  branch?: string;
  claudeSessionId?: string;
  pullRequestUrl?: string;
  captureUrl?: string;
  result?: string;
  error?: string;
  progress: RunProgress[];
  messages: SandboxMessage[];
  events: DurableSessionEvent[];
}

interface ApiError {
  error?: {
    message?: string;
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(
      body.error?.message ?? `Request failed with HTTP ${response.status}.`,
    );
  }
  return response.json() as Promise<T>;
}

export async function loadDemoConfig(): Promise<DemoConfig> {
  return readResponse<DemoConfig>(await fetch("/api/config"));
}

export async function startDemoRun(args: {
  kind: DemoRunKind;
  message: string;
  requestId: string;
}): Promise<DemoRun> {
  return readResponse<DemoRun>(
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    }),
  );
}

export async function getDemoRun(runId: string): Promise<DemoRun> {
  return readResponse<DemoRun>(
    await fetch(`/api/runs/${encodeURIComponent(runId)}`),
  );
}
