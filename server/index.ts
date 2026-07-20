import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import process from "node:process";
import { Sandbox } from "@opencomputer/sdk";
import { Image } from "@opencomputer/sdk/node";
import type {
  DemoConfig,
  DemoRun,
  RunStage,
} from "../src/lib/api";

function loadLocalEnv(file: string): void {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]?.trim()) continue;
      const raw = match[2].trim();
      process.env[match[1]] =
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
          ? raw.slice(1, -1)
          : raw;
    }
  } catch {
    // Local configuration is optional; /api/config reports missing keys.
  }
}

for (const file of [".env.local", ".env"]) loadLocalEnv(file);

const port = Number(process.env.DEMO_API_PORT ?? 8789);
const apiKey = process.env.OPENCOMPUTER_API_KEY?.trim();
const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
const githubToken = (
  process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
)?.trim();
const sandboxApiUrl =
  process.env.OPENCOMPUTER_SANDBOX_API_URL?.trim() ||
  "https://app.opencomputer.dev";
const dashboardBase = (
  process.env.OPENCOMPUTER_DASHBOARD_URL?.trim() ||
  "https://app.opencomputer.dev"
).replace(/\/+$/, "");
const targetRepo = normalizeRepo(
  process.env.DEMO_TARGET_REPO?.trim() ||
    "diggerhq/oc-agent-demo-target",
);
const targetBranch = normalizeRef(
  process.env.DEMO_TARGET_BRANCH?.trim() || "main",
);
const targetRepoUrl = `https://github.com/${targetRepo}.git`;

const runs = new Map<string, DemoRun>();
const requestRuns = new Map<string, string>();
const secretValues = [apiKey, anthropicApiKey, githubToken].filter(
  (value): value is string => Boolean(value),
);

function normalizeRepo(value: string): string {
  const normalized = value
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new Error("DEMO_TARGET_REPO must be a GitHub owner/repository.");
  }
  return normalized;
}

function normalizeRef(value: string): string {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,120}$/.test(value) ||
    value.includes("..") ||
    value.endsWith("/") ||
    value.endsWith(".")
  ) {
    throw new Error("DEMO_TARGET_BRANCH is not a valid Git ref.");
  }
  return value;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function missingConfig(): string[] {
  return [
    !apiKey && "OPENCOMPUTER_API_KEY",
    !anthropicApiKey && "ANTHROPIC_API_KEY",
    !githubToken && "GITHUB_TOKEN",
  ].filter((value): value is string => Boolean(value));
}

function configResponse(): DemoConfig {
  const missing = missingConfig();
  return {
    execution: missing.length === 0 ? "live" : "unavailable",
    missing,
    targetRepo,
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(json);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 16 * 1024) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function safeText(value: string, maxLength = 2_000): string {
  let safe = value;
  for (const secret of secretValues) {
    safe = safe.replaceAll(secret, "[redacted]");
  }
  return safe.length > maxLength
    ? `${safe.slice(0, maxLength - 1)}…`
    : safe;
}

function errorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "The live demo run failed.";
  const htmlBoundary = raw.search(/<!doctype html|<html[\s>]/i);
  return safeText(
    htmlBoundary >= 0
      ? `${raw.slice(0, htmlBoundary).trim()} (HTML error page omitted)`
      : raw,
  );
}

function transition(run: DemoRun, stage: RunStage, label: string): void {
  const now = new Date().toISOString();
  run.stage = stage;
  run.updatedAt = now;
  run.durationMs = Date.now() - Date.parse(run.startedAt);
  run.progress.push({ stage, label, at: now });
}

function currentRun(run: DemoRun): DemoRun {
  return {
    ...run,
    durationMs:
      run.state === "running"
        ? Date.now() - Date.parse(run.startedAt)
        : run.durationMs,
    progress: run.progress.map((item) => ({ ...item })),
    sandbox: run.sandbox ? { ...run.sandbox } : undefined,
  };
}

function assertSuccess(
  result: { exitCode: number; stdout: string; stderr: string },
  action: string,
): void {
  if (result.exitCode === 0) return;
  const detail = safeText(result.stderr.trim() || result.stdout.trim(), 1_000);
  throw new Error(
    `${action} failed with exit code ${result.exitCode}${
      detail ? `: ${detail}` : "."
    }`,
  );
}

function parseClaudeResult(stdout: string): {
  result?: string;
  sessionId?: string;
} {
  const trimmed = stdout.trim();
  if (!trimmed) return {};
  try {
    const value = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      result:
        typeof value.result === "string"
          ? safeText(value.result)
          : safeText(trimmed),
      sessionId:
        typeof value.session_id === "string" ? value.session_id : undefined,
    };
  } catch {
    return { result: safeText(trimmed) };
  }
}

function validPullRequestUrl(value: string): string | undefined {
  const match = value.match(
    new RegExp(
      `https://github\\.com/${targetRepo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/pull/\\d+`,
    ),
  );
  return match?.[0];
}

async function executeRun(run: DemoRun, message: string): Promise<void> {
  let sandbox: Sandbox | undefined;
  try {
    if (!apiKey || !anthropicApiKey || !githubToken) {
      throw new Error(`Missing ${missingConfig().join(", ")}.`);
    }

    transition(run, "preparing_image", "Creating sandbox");
    const image = Image.base()
      .aptInstall(["gh"])
      .runCommands(
        "sudo node /usr/lib/node_modules/@anthropic-ai/claude-code/install.cjs",
      );
    sandbox = await Sandbox.create({
      apiKey,
      apiUrl: sandboxApiUrl,
      image,
      timeout: 15 * 60,
      memoryMB: 4_096,
      metadata: {
        demo: "durable-sessions-naive",
        run: run.id,
      },
    });

    run.sandbox = {
      id: sandbox.id,
      dashboardUrl: `${dashboardBase}/sandboxes/${encodeURIComponent(sandbox.id)}`,
    };

    const branch = `oc-demo/naive-${run.id.slice(0, 8)}`;
    run.branch = branch;
    transition(run, "preparing_repository", "Checking out repository");

    const prepare = await sandbox.exec.run(
      [
        "set -eu",
        "gh auth setup-git",
        `git config --global user.name ${shellQuote("OpenComputer Demo")}`,
        `git config --global user.email ${shellQuote("demo@opencomputer.dev")}`,
        "rm -rf /workspace/repo",
        `git clone --depth 1 --branch ${shellQuote(targetBranch)} ${shellQuote(targetRepoUrl)} /workspace/repo`,
        `git -C /workspace/repo switch -c ${shellQuote(branch)}`,
      ].join("\n"),
      {
        timeout: 120,
        env: { GH_TOKEN: githubToken },
      },
    );
    assertSuccess(prepare, "Repository checkout");

    const task = [
      "You are handling a software change requested in Slack.",
      `The repository is checked out on branch ${branch}.`,
      "Implement only the request below.",
      "Run the relevant tests.",
      "Commit the intended changes and push this branch to origin.",
      `Open a non-draft pull request against ${targetBranch} with gh pr create.`,
      "Do not stop until the pull request exists.",
      "End your response with the pull request URL.",
      "",
      "Slack message:",
      message,
    ].join("\n");
    await sandbox.files.write("/tmp/task.txt", task);

    transition(run, "running_claude", "Claude Code is working");
    const claude = await sandbox.exec.run(
      [
        "claude --print",
        "--bare",
        "--dangerously-skip-permissions",
        "--max-turns 30",
        "--max-budget-usd 3",
        "--output-format json",
        "< /tmp/task.txt",
      ].join(" "),
      {
        cwd: "/workspace/repo",
        timeout: 10 * 60,
        env: {
          ANTHROPIC_API_KEY: anthropicApiKey,
          GH_TOKEN: githubToken,
        },
      },
    );
    assertSuccess(claude, "Claude Code");

    const parsed = parseClaudeResult(claude.stdout);
    run.result = parsed.result;
    run.claudeSessionId = parsed.sessionId;
    transition(run, "verifying_pull_request", "Verifying pull request");

    const pullRequest = await sandbox.exec.run(
      [
        "gh pr list",
        `--repo ${shellQuote(targetRepo)}`,
        `--head ${shellQuote(branch)}`,
        "--state open",
        "--json url",
        "--jq '.[0].url'",
      ].join(" "),
      {
        cwd: "/workspace/repo",
        timeout: 60,
        env: { GH_TOKEN: githubToken },
      },
    );
    assertSuccess(pullRequest, "Pull request verification");

    const pullRequestUrl =
      validPullRequestUrl(pullRequest.stdout) ||
      validPullRequestUrl(run.result ?? "");
    if (!pullRequestUrl) {
      throw new Error("Claude Code finished without opening a pull request.");
    }

    run.pullRequestUrl = pullRequestUrl;
    run.state = "succeeded";
    transition(run, "completed", "Pull request opened");
  } catch (error) {
    run.state = "failed";
    run.error = errorMessage(error);
    transition(run, "failed", "Run failed");
  }
}

function beginRun(message: string, requestId: string): DemoRun {
  const existingId = requestRuns.get(requestId);
  const existing = existingId ? runs.get(existingId) : undefined;
  if (existing) return existing;

  const id = randomUUID();
  const now = new Date().toISOString();
  const run: DemoRun = {
    id,
    state: "running",
    stage: "queued",
    startedAt: now,
    updatedAt: now,
    durationMs: 0,
    progress: [
      {
        stage: "queued",
        label: "Run accepted",
        at: now,
      },
    ],
  };

  runs.set(id, run);
  requestRuns.set(requestId, id);
  void executeRun(run, message);

  while (runs.size > 25) {
    const oldest = runs.keys().next().value as string | undefined;
    if (!oldest || oldest === id) break;
    runs.delete(oldest);
  }

  return run;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, configResponse());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/runs") {
    try {
      const missing = missingConfig();
      if (missing.length > 0) {
        sendJson(response, 503, {
          error: { message: `Missing ${missing.join(", ")}.` },
        });
        return;
      }

      const body = (await readJson(request)) as Record<string, unknown>;
      if (
        typeof body.message !== "string" ||
        !body.message.trim() ||
        body.message.length > 2_000
      ) {
        sendJson(response, 400, {
          error: { message: "Slack message must contain 1–2,000 characters." },
        });
        return;
      }
      if (
        typeof body.requestId !== "string" ||
        !/^[a-zA-Z0-9-]{8,80}$/.test(body.requestId)
      ) {
        sendJson(response, 400, {
          error: { message: "A valid request id is required." },
        });
        return;
      }

      sendJson(
        response,
        202,
        currentRun(beginRun(body.message.trim(), body.requestId)),
      );
    } catch (error) {
      sendJson(response, 500, {
        error: { message: errorMessage(error) },
      });
    }
    return;
  }

  const runMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]+)$/);
  if (request.method === "GET" && runMatch) {
    const run = runs.get(runMatch[1]);
    if (!run) {
      sendJson(response, 404, {
        error: { message: "Run not found in this local process." },
      });
      return;
    }
    sendJson(response, 200, currentRun(run));
    return;
  }

  sendJson(response, 404, { error: { message: "Not found." } });
});

server.listen(port, "127.0.0.1", () => {
  const status =
    missingConfig().length === 0
      ? `live target=${targetRepo}`
      : `unavailable missing=${missingConfig().join(",")}`;
  console.log(`Demo API listening on http://127.0.0.1:${port} (${status})`);
});
