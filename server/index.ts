import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import process from "node:process";
import { OpenComputer } from "@opencomputer/sdk";
import {
  isScenarioId,
  scenarioById,
  scenarios,
  type DemoScenario,
} from "../src/lib/scenarios";
import type {
  DemoConfig,
  ScenarioConfig,
  SessionReceipt,
} from "../src/lib/api";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Optional local config.
  }
}

type DemoMode = DemoConfig["mode"];

const port = Number(process.env.DEMO_API_PORT ?? 8789);
const apiKey = process.env.OPENCOMPUTER_API_KEY?.trim();
const apiUrl =
  process.env.OPENCOMPUTER_API_URL?.trim() ||
  "https://api.opencomputer.dev/v3";
const dashboardBase = (
  process.env.OPENCOMPUTER_DASHBOARD_URL?.trim() ||
  "https://app.opencomputer.dev"
).replace(/\/+$/, "");
const mode = parseMode(process.env.DEMO_MODE);

function parseMode(value: string | undefined): DemoMode {
  return value === "live" || value === "mock" ? value : "auto";
}

function configuredAgent(scenario: DemoScenario): string | undefined {
  return process.env[scenario.agentEnv]?.trim() || undefined;
}

function scenarioConfig(scenario: DemoScenario): ScenarioConfig {
  if (mode === "mock") {
    return {
      execution: "simulated",
      detail: "DEMO_MODE=mock; no OpenComputer request will be made.",
    };
  }

  if (!apiKey || !configuredAgent(scenario)) {
    if (mode === "live") {
      return {
        execution: "unavailable",
        detail: `Live mode needs OPENCOMPUTER_API_KEY and ${scenario.agentEnv}.`,
      };
    }
    return {
      execution: "simulated",
      detail: `Add OPENCOMPUTER_API_KEY and ${scenario.agentEnv} for a live run.`,
    };
  }

  if (scenario.requiresStandIn) {
    return {
      execution: "stand-in",
      detail:
        "Creates a real session on the configured equivalent agent; the displayed SDK shape is proposed.",
    };
  }

  return {
    execution: "live",
    detail: "The displayed SDK call and the request both use the public API.",
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
    if (bytes > 32 * 1024) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function configResponse(): DemoConfig {
  return {
    mode,
    scenarios: Object.fromEntries(
      scenarios.map((scenario) => [scenario.id, scenarioConfig(scenario)]),
    ) as DemoConfig["scenarios"],
  };
}

async function simulatedReceipt(
  scenario: DemoScenario,
): Promise<SessionReceipt> {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 520));
  const id = `ses_${randomBytes(12).toString("hex")}`;
  const agentId = `agt_${randomBytes(12).toString("hex")}`;

  return {
    execution: "simulated",
    durationMs: Date.now() - startedAt,
    session: {
      id,
      status: "queued",
      agentId,
      runtime: scenario.runtime,
      revision: scenario.id === "repository" ? 7 : 1,
    },
    response: {
      session: {
        id,
        status: "queued",
        agentId,
        runtime: scenario.runtime,
        head: 1,
      },
      note: "Simulated response — no OpenComputer request was made.",
    },
  };
}

async function liveReceipt(args: {
  scenario: DemoScenario;
  input: string;
  requestId: string;
  execution: "live" | "stand-in";
}): Promise<SessionReceipt> {
  const agentId = configuredAgent(args.scenario);
  if (!apiKey || !agentId) {
    throw new Error(
      `Live mode needs OPENCOMPUTER_API_KEY and ${args.scenario.agentEnv}.`,
    );
  }

  const startedAt = Date.now();
  const oc = new OpenComputer({
    apiKey,
    baseUrl: apiUrl,
  });
  const session = await oc.sessions.create({
    agent: agentId,
    input: args.input,
    idempotencyKey: `demo:${args.scenario.id}:${args.requestId}`,
  });
  const snapshot = session.snapshot;
  const dashboardUrl = `${dashboardBase}/sessions/${encodeURIComponent(session.id)}`;

  return {
    execution: args.execution,
    durationMs: Date.now() - startedAt,
    session: {
      id: session.id,
      status: session.status,
      agentId: snapshot.agentId ?? agentId,
      runtime: snapshot.agentSnapshot?.runtime ?? args.scenario.runtime,
      revision: snapshot.agentSnapshot?.revision,
    },
    dashboardUrl,
    response: {
      session: {
        id: session.id,
        status: session.status,
        agentId: snapshot.agentId ?? agentId,
        runtime: snapshot.agentSnapshot?.runtime ?? args.scenario.runtime,
        revision: snapshot.agentSnapshot?.revision ?? null,
        head: snapshot.head ?? null,
      },
      dashboardUrl,
    },
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, configResponse());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/run") {
    try {
      const body = (await readJson(request)) as Record<string, unknown>;
      if (!isScenarioId(body.scenario)) {
        sendJson(response, 400, {
          error: { message: "Unknown demo scenario." },
        });
        return;
      }
      if (typeof body.input !== "string" || !body.input.trim()) {
        sendJson(response, 400, {
          error: { message: "A task is required." },
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

      const scenario = scenarioById[body.scenario];
      const config = scenarioConfig(scenario);
      if (config.execution === "unavailable") {
        sendJson(response, 503, { error: { message: config.detail } });
        return;
      }

      const receipt =
        config.execution === "simulated"
          ? await simulatedReceipt(scenario)
          : await liveReceipt({
              scenario,
              input: body.input.trim(),
              requestId: body.requestId,
              execution: config.execution,
            });
      sendJson(response, 201, receipt);
    } catch (error) {
      sendJson(response, 500, {
        error: {
          message:
            error instanceof Error
              ? error.message
              : "The local demo adapter failed.",
        },
      });
    }
    return;
  }

  sendJson(response, 404, { error: { message: "Not found." } });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Demo API listening on http://127.0.0.1:${port} (${mode})`);
});

