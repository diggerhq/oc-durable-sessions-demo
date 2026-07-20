import { describe, expect, it } from "vitest";
import {
  ClaudeJsonLineRelay,
  type ClaudeMessageUpdate,
} from "./stream-claude-messages";

describe("ClaudeJsonLineRelay", () => {
  it("reassembles JSON Lines and UTF-8 split across arbitrary byte chunks", () => {
    const updates: ClaudeMessageUpdate[] = [];
    const relay = new ClaudeJsonLineRelay((update) => updates.push(update));
    const payload = [
      { type: "stream_event", event: { type: "message_start" } },
      {
        type: "stream_event",
        event: {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        },
      },
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "Hello " },
        },
      },
      {
        type: "stream_event",
        event: {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "🌍" },
        },
      },
      {
        type: "stream_event",
        event: { type: "content_block_stop", index: 0 },
      },
      {
        type: "result",
        subtype: "success",
        session_id: "claude-session-1",
        result: "Hello 🌍",
        is_error: false,
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n");
    const bytes = new TextEncoder().encode(payload);

    for (let offset = 0; offset < bytes.length; offset += 5) {
      relay.write(bytes.slice(offset, offset + 5));
    }
    const result = relay.end();

    expect(updates.at(-1)).toEqual({
      id: "message-1",
      text: "Hello 🌍",
      done: true,
    });
    expect(result).toMatchObject({
      result: "Hello 🌍",
      sessionId: "claude-session-1",
      isError: false,
    });
  });

  it("reports malformed stdout without throwing from a WebSocket callback", () => {
    const relay = new ClaudeJsonLineRelay(() => undefined);
    relay.write(new TextEncoder().encode("not-json\n"));

    expect(relay.end().error?.message).toContain(
      "Could not parse Claude's stdout stream",
    );
  });
});
