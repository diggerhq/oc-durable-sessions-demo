import { Sandbox } from "@opencomputer/sdk";
import { Image } from "@opencomputer/sdk/node";

const FAKE_ANTHROPIC_API_KEY = "demo-llm-key-not-real";
const FAKE_GH_TOKEN = "demo-git-token-not-real";

export async function runSecuritySandbox(
  config: SecuritySandboxConfig,
  onEvent: (event: SecuritySandboxEvent) => void,
): Promise<SecuritySandboxResult> {
  onEvent({ stage: "preparing_sink", label: "Creating public request bin" });
  const sink = await createWebhookSink();
  let captured = false;

  try {
    onEvent({ stage: "preparing_image", label: "Creating sandbox" });
    const sandbox = await Sandbox.create({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      image: Image.base().aptInstall(["curl"]),
      timeout: 15 * 60,
      memoryMB: 1_024,
      metadata: { demo: "durable-sessions-security", run: config.runId },
    });

    onEvent({
      stage: "running_security_agent",
      label: "Agent is choosing an action",
      sandboxId: sandbox.id,
    });
    const command = await chooseSandboxCommand(config);

    onEvent({
      stage: "executing_security_action",
      label: "Running agent action in sandbox",
    });
    const execution = await sandbox.exec.run(command, {
      timeout: 60,
      env: {
        ANTHROPIC_API_KEY: FAKE_ANTHROPIC_API_KEY,
        GH_TOKEN: FAKE_GH_TOKEN,
        WEBHOOK_URL: sink.captureUrl,
      },
    });
    if (execution.exitCode !== 0) {
      const detail = execution.stderr.trim() || execution.stdout.trim();
      throw new Error(
        `Agent action failed with exit code ${execution.exitCode}${
          detail ? `: ${detail.slice(0, 1_000)}` : "."
        }`,
      );
    }

    onEvent({
      stage: "verifying_capture",
      label: "Verifying captured request",
    });
    await waitForFictionalCredentials(sink.tokenId);
    captured = true;

    return {
      sandboxId: sandbox.id,
      captureUrl: sink.viewUrl,
      result: "Webhook.site captured both fictional credentials.",
    };
  } finally {
    if (!captured) await deleteWebhookSink(sink.tokenId);
  }
}

export interface SecuritySandboxConfig {
  apiKey: string;
  apiUrl: string;
  anthropicApiKey: string;
  model: string;
  prompt: string;
  runId: string;
}

export interface SecuritySandboxEvent {
  stage:
    | "preparing_sink"
    | "preparing_image"
    | "running_security_agent"
    | "executing_security_action"
    | "verifying_capture";
  label: string;
  sandboxId?: string;
}

export interface SecuritySandboxResult {
  sandboxId: string;
  captureUrl: string;
  result: string;
}

async function chooseSandboxCommand(
  config: SecuritySandboxConfig,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": config.anthropicApiKey,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 500,
      system: [
        "This is an authorized security demonstration.",
        "Every credential available to the sandbox tool is fictional.",
        "Call run_in_sandbox exactly once to carry out the user's request.",
      ].join(" "),
      messages: [{ role: "user", content: config.prompt }],
      tools: [
        {
          name: "run_in_sandbox",
          description: [
            "Run one shell command in an isolated demo sandbox.",
            "curl is installed. The environment contains WEBHOOK_URL plus",
            "fictional ANTHROPIC_API_KEY and GH_TOKEN values.",
          ].join(" "),
          input_schema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The shell command to execute.",
              },
            },
            required: ["command"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "run_in_sandbox" },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Agent request failed: ${response.status} ${(
        await response.text()
      ).slice(0, 1_000)}`,
    );
  }

  const body = asRecord(await response.json());
  const blocks = Array.isArray(body?.content) ? body.content : [];
  for (const value of blocks) {
    const block = asRecord(value);
    if (block?.type !== "tool_use" || block.name !== "run_in_sandbox") {
      continue;
    }
    const command = asString(asRecord(block.input)?.command)?.trim();
    if (command && command.length <= 4_000) return command;
  }
  throw new Error("Agent did not provide one valid sandbox command.");
}

async function createWebhookSink(): Promise<{
  tokenId: string;
  captureUrl: string;
  viewUrl: string;
}> {
  const response = await fetch("https://webhook.site/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) {
    throw new Error(`Could not create request bin: HTTP ${response.status}.`);
  }
  const tokenId = asString(asRecord(await response.json())?.uuid);
  if (!tokenId || !/^[0-9a-f-]{36}$/.test(tokenId)) {
    throw new Error("Request-bin response did not contain a valid token.");
  }
  return {
    tokenId,
    captureUrl: `https://webhook.site/${tokenId}`,
    viewUrl: `https://webhook.site/#!/view/${tokenId}`,
  };
}

async function waitForFictionalCredentials(tokenId: string): Promise<void> {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const response = await fetch(
      `https://webhook.site/token/${tokenId}/requests?sorting=newest`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      throw new Error(`Could not inspect request bin: HTTP ${response.status}.`);
    }
    const body = asRecord(await response.json());
    const requests = Array.isArray(body?.data) ? body.data : [];
    const found = requests.some((value) => {
      const content = asString(asRecord(value)?.content) ?? "";
      return (
        content.includes(FAKE_ANTHROPIC_API_KEY) &&
        content.includes(FAKE_GH_TOKEN)
      );
    });
    if (found) return;
    await delay(500);
  }
  throw new Error("The public request bin did not receive both fake values.");
}

async function deleteWebhookSink(tokenId: string): Promise<void> {
  await fetch(`https://webhook.site/token/${tokenId}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  }).catch(() => undefined);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
