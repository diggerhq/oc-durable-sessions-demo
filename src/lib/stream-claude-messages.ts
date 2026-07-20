import type { Sandbox } from "@opencomputer/sdk";
import NodeWebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  Object.assign(globalThis, { WebSocket: NodeWebSocket });
}

export async function streamClaudeMessages(
  sandbox: Sandbox,
  config: ClaudeStreamConfig,
  onMessage: (update: ClaudeMessageUpdate) => void,
): Promise<ClaudeStreamResult> {
  const relay = new ClaudeJsonLineRelay(onMessage);
  const stderrDecoder = new TextDecoder();
  let stderr = "";

  const process = await sandbox.exec.start("sh", {
    args: [
      "-c",
      [
        "exec claude --print",
        "--bare",
        "--dangerously-skip-permissions",
        "--max-turns 30",
        "--max-budget-usd 3",
        "--output-format stream-json",
        "--verbose",
        "--include-partial-messages",
        `< ${shellQuote(config.promptPath)}`,
      ].join(" "),
    ],
    cwd: config.cwd,
    timeout: 10 * 60,
    maxRunAfterDisconnect: 30,
    env: {
      ANTHROPIC_API_KEY: config.anthropicApiKey,
      GH_TOKEN: config.githubToken,
    },
    // This callback runs in the local API; the command above runs in the box.
    onStdout: (bytes) => relay.write(bytes),
    onStderr: (bytes) => {
      stderr += stderrDecoder.decode(bytes, { stream: true });
      if (stderr.length > 8_000) stderr = stderr.slice(-8_000);
    },
  });

  const exitCode = await process.done;
  process.close();
  stderr += stderrDecoder.decode();
  const parsed = relay.end();

  if (exitCode !== 0) {
    throw new Error(
      `Claude Code failed with exit code ${exitCode}${
        stderr.trim() ? `: ${stderr.trim()}` : "."
      }`,
    );
  }
  if (parsed.error) throw parsed.error;
  if (parsed.isError) {
    throw new Error(parsed.result || "Claude Code returned an error result.");
  }

  return {
    execSessionId: process.sessionId,
    result: parsed.result,
    claudeSessionId: parsed.sessionId,
  };
}

export interface ClaudeStreamConfig {
  anthropicApiKey: string;
  githubToken: string;
  cwd: string;
  promptPath: string;
}

export interface ClaudeMessageUpdate {
  id: string;
  text: string;
  done: boolean;
}

export interface ClaudeStreamResult {
  execSessionId: string;
  result?: string;
  claudeSessionId?: string;
}

interface ParsedClaudeStream {
  result?: string;
  sessionId?: string;
  isError: boolean;
  error?: Error;
}

interface TextBlock {
  id: string;
  text: string;
}

export class ClaudeJsonLineRelay {
  private readonly decoder = new TextDecoder();
  private readonly blocks = new Map<number, TextBlock>();
  private readonly emittedMessageIds = new Set<string>();
  private buffer = "";
  private messageNumber = 0;
  private result?: string;
  private sessionId?: string;
  private isError = false;
  private error?: Error;

  constructor(
    private readonly onMessage: (update: ClaudeMessageUpdate) => void,
  ) {}

  write(bytes: Uint8Array): void {
    if (this.error) return;
    this.buffer += this.decoder.decode(bytes, { stream: true });
    this.drain(false);
  }

  end(): ParsedClaudeStream {
    if (!this.error) {
      this.buffer += this.decoder.decode();
      this.drain(true);
      this.completeAll();
      if (this.emittedMessageIds.size === 0 && this.result) {
        this.emit({ id: "message-1", text: this.result, done: true });
      }
    }
    return {
      result: this.result,
      sessionId: this.sessionId,
      isError: this.isError,
      error: this.error,
    };
  }

  private drain(includeRemainder: boolean): void {
    const lines = this.buffer.split("\n");
    const remainder = lines.pop() ?? "";
    for (const line of lines) this.parseLine(line);
    if (includeRemainder) {
      this.buffer = "";
      this.parseLine(remainder);
    } else {
      this.buffer = remainder;
    }
  }

  private parseLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed || this.error) return;
    try {
      this.handle(JSON.parse(trimmed));
    } catch (error) {
      this.error = new Error(
        `Could not parse Claude's stdout stream: ${
          error instanceof Error ? error.message : "invalid JSON"
        }`,
      );
    }
  }

  private handle(value: unknown): void {
    const message = asRecord(value);
    const type = asString(message?.type);
    this.sessionId = asString(message?.session_id) ?? this.sessionId;

    if (type === "result") {
      this.result = asString(message?.result) ?? this.result;
      this.isError = message?.is_error === true;
      this.completeAll();
      return;
    }
    if (type !== "stream_event") return;

    const event = asRecord(message?.event);
    const eventType = asString(event?.type);
    const index = asNumber(event?.index);

    if (eventType === "message_start") {
      this.completeAll();
      return;
    }
    if (eventType === "content_block_start" && index !== undefined) {
      const content = asRecord(event?.content_block);
      if (content?.type !== "text") return;
      const block = this.createBlock();
      block.text = asString(content.text) ?? "";
      this.blocks.set(index, block);
      if (block.text) this.emit({ ...block, done: false });
      return;
    }
    if (eventType === "content_block_delta" && index !== undefined) {
      const delta = asRecord(event?.delta);
      if (delta?.type !== "text_delta") return;
      const text = asString(delta.text);
      if (!text) return;
      const block = this.blocks.get(index) ?? this.createAndStoreBlock(index);
      block.text += text;
      this.emit({ ...block, done: false });
      return;
    }
    if (eventType === "content_block_stop" && index !== undefined) {
      this.complete(index);
      return;
    }
    if (eventType === "message_stop") this.completeAll();
  }

  private createBlock(): TextBlock {
    this.messageNumber += 1;
    return { id: `message-${this.messageNumber}`, text: "" };
  }

  private createAndStoreBlock(index: number): TextBlock {
    const block = this.createBlock();
    this.blocks.set(index, block);
    return block;
  }

  private complete(index: number): void {
    const block = this.blocks.get(index);
    if (!block) return;
    if (block.text) this.emit({ ...block, done: true });
    this.blocks.delete(index);
  }

  private completeAll(): void {
    for (const index of [...this.blocks.keys()]) this.complete(index);
  }

  private emit(update: ClaudeMessageUpdate): void {
    if (!update.text) return;
    this.emittedMessageIds.add(update.id);
    this.onMessage(update);
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
