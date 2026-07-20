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
  kind: "assistant" | "tool";
  name?: string;
  text: string;
  done: boolean;
  isError?: boolean;
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

interface ToolMessage {
  id: string;
  name: string;
  input: string;
  done: boolean;
}

export class ClaudeJsonLineRelay {
  private readonly decoder = new TextDecoder();
  private readonly blocks = new Map<number, TextBlock>();
  private readonly emittedAssistantIds = new Set<string>();
  private readonly tools = new Map<string, ToolMessage>();
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
      this.completeTools();
      if (this.emittedAssistantIds.size === 0 && this.result) {
        this.emit({
          id: "message-1",
          kind: "assistant",
          text: this.result,
          done: true,
        });
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
    if (!message) return;
    const type = asString(message.type);
    this.sessionId = asString(message.session_id) ?? this.sessionId;

    if (type === "result") {
      this.result = asString(message.result) ?? this.result;
      this.isError = message.is_error === true;
      this.completeAll();
      return;
    }
    if (type === "assistant") {
      this.captureToolUses(message);
      return;
    }
    if (type === "user") {
      this.captureToolResults(message);
      return;
    }
    if (type !== "stream_event") return;

    const event = asRecord(message.event);
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
      if (block.text) this.emitAssistant(block, false);
      return;
    }
    if (eventType === "content_block_delta" && index !== undefined) {
      const delta = asRecord(event?.delta);
      if (delta?.type !== "text_delta") return;
      const text = asString(delta.text);
      if (!text) return;
      const block = this.blocks.get(index) ?? this.createAndStoreBlock(index);
      block.text += text;
      this.emitAssistant(block, false);
      return;
    }
    if (eventType === "content_block_stop" && index !== undefined) {
      this.complete(index);
      return;
    }
    if (eventType === "message_stop") this.completeAll();
  }

  private captureToolUses(message: Record<string, unknown>): void {
    for (const content of messageContent(message)) {
      if (content.type !== "tool_use") continue;
      const toolUseId = asString(content.id);
      const name = asString(content.name);
      if (!toolUseId || !name || this.tools.has(toolUseId)) continue;
      this.emitToolUse(toolUseId, name, jsonText(content.input));
    }
  }

  private captureToolResults(message: Record<string, unknown>): void {
    for (const content of messageContent(message)) {
      if (content.type !== "tool_result") continue;
      const toolUseId = asString(content.tool_use_id);
      if (!toolUseId) continue;
      const tool = this.tools.get(toolUseId);
      const output = boundedText(contentText(content.content) || "No output");
      const input = tool?.input || "{}";
      const update: ToolMessage = {
        id: tool?.id ?? `tool-${toolUseId}`,
        name: tool?.name ?? "Tool",
        input,
        done: true,
      };
      this.tools.set(toolUseId, update);
      this.emit({
        id: update.id,
        kind: "tool",
        name: update.name,
        text: `Input\n${input}\n\nOutput\n${output}`,
        done: true,
        isError: content.is_error === true,
      });
    }
  }

  private emitToolUse(toolUseId: string, name: string, input: string): void {
    if (this.tools.has(toolUseId)) return;
    const normalized = boundedText(input || "{}");
    const tool = {
      id: `tool-${toolUseId}`,
      name,
      input: normalized,
      done: false,
    };
    this.tools.set(toolUseId, tool);
    this.emit({
      id: tool.id,
      kind: "tool",
      name,
      text: `Input\n${normalized}`,
      done: false,
    });
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
    if (block.text) this.emitAssistant(block, true);
    this.blocks.delete(index);
  }

  private completeAll(): void {
    for (const index of [...this.blocks.keys()]) this.complete(index);
  }

  private completeTools(): void {
    for (const [toolUseId, tool] of this.tools) {
      if (tool.done) continue;
      tool.done = true;
      this.tools.set(toolUseId, tool);
      this.emit({
        id: tool.id,
        kind: "tool",
        name: tool.name,
        text: `Input\n${tool.input}`,
        done: true,
      });
    }
  }

  private emitAssistant(block: TextBlock, done: boolean): void {
    this.emit({ ...block, kind: "assistant", done });
  }

  private emit(update: ClaudeMessageUpdate): void {
    if (!update.text) return;
    if (update.kind === "assistant") this.emittedAssistantIds.add(update.id);
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

function messageContent(
  message: Record<string, unknown>,
): Record<string, unknown>[] {
  const body = asRecord(message.message);
  return Array.isArray(body?.content)
    ? body.content.map(asRecord).filter((value) => value !== undefined)
    : [];
}

function jsonText(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return jsonText(value);
  return value
    .map((item) => {
      const block = asRecord(item);
      return asString(block?.text) ?? jsonText(item);
    })
    .filter(Boolean)
    .join("\n");
}

function boundedText(value: string, maxLength = 2_000): string {
  const text = value.trim();
  if (text.length <= maxLength) return text;
  const half = Math.floor((maxLength - 21) / 2);
  return `${text.slice(0, half)}\n… output truncated …\n${text.slice(-half)}`;
}
