export type RunStage =
  | "queued"
  | "preparing_image"
  | "preparing_repository"
  | "running_claude"
  | "verifying_pull_request"
  | "completed"
  | "failed";

export interface DemoConfig {
  execution: "live" | "unavailable";
  missing: string[];
  targetRepo: string;
}

export interface RunProgress {
  stage: RunStage;
  label: string;
  at: string;
}

export interface DemoRun {
  id: string;
  state: "running" | "succeeded" | "failed";
  stage: RunStage;
  startedAt: string;
  updatedAt: string;
  durationMs: number;
  sandbox?: {
    id: string;
    dashboardUrl: string;
  };
  branch?: string;
  claudeSessionId?: string;
  pullRequestUrl?: string;
  result?: string;
  error?: string;
  progress: RunProgress[];
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
