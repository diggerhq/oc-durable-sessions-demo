import { Sandbox } from "@opencomputer/sdk";
import { Image } from "@opencomputer/sdk/node";

export async function runNaiveSandbox(
  config: NaiveSandboxRunConfig,
  onEvent: (event: NaiveSandboxRunEvent) => void,
): Promise<NaiveSandboxRunResult> {
  onEvent({ stage: "preparing_image", label: "Creating sandbox" });

  const image = Image.base()
    .aptInstall(["gh"])
    .runCommands(
      "sudo node /usr/lib/node_modules/@anthropic-ai/claude-code/install.cjs",
    );
  const sandbox = await Sandbox.create({
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    image,
    timeout: 15 * 60,
    memoryMB: 4_096,
    metadata: { demo: "durable-sessions-naive", run: config.runId },
  });

  const branch = `oc-demo/naive-${config.runId.slice(0, 8)}`;
  onEvent({
    stage: "preparing_repository",
    label: "Checking out repository",
    sandboxId: sandbox.id,
    branch,
  });

  const repoUrl = `https://github.com/${config.targetRepo}.git`;
  const prepare = await sandbox.exec.run(
    [
      "set -eu",
      "gh auth setup-git",
      `git config --global user.name ${shellQuote("OpenComputer Demo")}`,
      `git config --global user.email ${shellQuote("demo@opencomputer.dev")}`,
      "rm -rf /workspace/repo",
      `git clone --depth 1 --branch ${shellQuote(config.targetBranch)} ${shellQuote(repoUrl)} /workspace/repo`,
      `git -C /workspace/repo switch -c ${shellQuote(branch)}`,
    ].join("\n"),
    { timeout: 120, env: { GH_TOKEN: config.githubToken } },
  );
  assertSuccess(prepare, "Repository checkout");

  const task = [
    "You are handling a software change requested in Slack.",
    `The repository is checked out on branch ${branch}.`,
    "Implement only the request below.",
    "Run the relevant tests.",
    "Commit the intended changes and push this branch to origin.",
    `Open a non-draft pull request against ${config.targetBranch} with gh pr create.`,
    "Do not stop until the pull request exists.",
    "End your response with the pull request URL.",
    "",
    "Slack message:",
    config.message,
  ].join("\n");
  await sandbox.files.write("/tmp/task.txt", task);

  onEvent({ stage: "running_claude", label: "Claude Code is working" });
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
        ANTHROPIC_API_KEY: config.anthropicApiKey,
        GH_TOKEN: config.githubToken,
      },
    },
  );
  assertSuccess(claude, "Claude Code");
  const parsed = parseClaudeResult(claude.stdout);

  onEvent({
    stage: "verifying_pull_request",
    label: "Verifying pull request",
  });
  const pullRequest = await sandbox.exec.run(
    [
      "gh pr list",
      `--repo ${shellQuote(config.targetRepo)}`,
      `--head ${shellQuote(branch)}`,
      "--state open",
      "--json url",
      "--jq '.[0].url'",
    ].join(" "),
    {
      cwd: "/workspace/repo",
      timeout: 60,
      env: { GH_TOKEN: config.githubToken },
    },
  );
  assertSuccess(pullRequest, "Pull request verification");

  const verifiedUrl =
    pullRequestUrl(pullRequest.stdout, config.targetRepo) ||
    pullRequestUrl(parsed.result ?? "", config.targetRepo);
  if (!verifiedUrl) {
    throw new Error("Claude Code finished without opening a pull request.");
  }

  return {
    sandboxId: sandbox.id,
    branch,
    pullRequestUrl: verifiedUrl,
    result: parsed.result,
    claudeSessionId: parsed.sessionId,
  };
}

export interface NaiveSandboxRunConfig {
  apiKey: string;
  apiUrl: string;
  anthropicApiKey: string;
  githubToken: string;
  targetRepo: string;
  targetBranch: string;
  message: string;
  runId: string;
}

export interface NaiveSandboxRunEvent {
  stage:
    | "preparing_image"
    | "preparing_repository"
    | "running_claude"
    | "verifying_pull_request";
  label: string;
  sandboxId?: string;
  branch?: string;
}

export interface NaiveSandboxRunResult {
  sandboxId: string;
  branch: string;
  pullRequestUrl: string;
  result?: string;
  claudeSessionId?: string;
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function assertSuccess(result: CommandResult, action: string): void {
  if (result.exitCode === 0) return;
  const detail = result.stderr.trim() || result.stdout.trim();
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
      result: typeof value.result === "string" ? value.result : trimmed,
      sessionId:
        typeof value.session_id === "string" ? value.session_id : undefined,
    };
  } catch {
    return { result: trimmed };
  }
}

function pullRequestUrl(value: string, targetRepo: string): string | undefined {
  const escapedRepo = targetRepo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.match(
    new RegExp(`https://github\\.com/${escapedRepo}/pull/\\d+`),
  )?.[0];
}
