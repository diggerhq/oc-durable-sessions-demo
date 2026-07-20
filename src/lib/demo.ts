import fullRunnerSource from "./naive-sandbox-run.ts?raw";
import messageRelaySource from "./stream-claude-messages.ts?raw";

export type CodeViewId = "concept" | "source";
export type DemoSlideId = "naive-sandbox" | "message-delivery";

export interface DemoCodeView {
  id: CodeViewId;
  label: string;
  filename: string;
  code: string;
  emphasisLines: number[];
}

export interface DemoSlide {
  id: DemoSlideId;
  navLabel: string;
  outputView: "progress" | "messages";
  codeViews: DemoCodeView[];
  defaultMessage: string;
}

const naiveSandboxConcept = `const sandbox = await Sandbox.create();

await sandbox.exec.run(      // 1. Clone the repository.
  \`git clone \${repoUrl} /workspace/repo\`,
  { env: { GH_TOKEN } },
);

await sandbox.files.write(   // 2. Write the task.
  "/tmp/task.txt",
  \`Implement, test, and open a pull request.

\${slackMessage}\`,
);

await sandbox.exec.run(      // 3. Run Claude Code.
  "claude -p < /tmp/task.txt",
  {
    cwd: "/workspace/repo",
    env: { ANTHROPIC_API_KEY, GH_TOKEN },
  },
);`;

const messageDeliveryConcept = `const command =
  "claude --print --output-format stream-json --verbose " +
  "--include-partial-messages < /tmp/task.txt"; // Inside sandbox.

const decoder = new TextDecoder();
let pending = "";
const agentMessage = { text: "" };       // State owned by our app.
run.messages.push(agentMessage);

const process = await sandbox.exec.start("sh", {
  args: ["-c", command],
  onStdout(bytes) {
    pending += decoder.decode(bytes, { stream: true });
    const lines = pending.split("\\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      const event = JSON.parse(line);    // Claude-specific output.
      const delta = event.event?.delta;
      if (delta?.type !== "text_delta") continue;

      agentMessage.text += delta.text;
      runs.set(run.id, run);              // Browser polls our state.
    }
  },
});

await process.done;`;

const defaultMessage =
  "Support milliseconds (ms) in parseDuration, so 250ms returns 250. Add coverage for combined values like 1s250ms.";

export const slides: DemoSlide[] = [
  {
    id: "naive-sandbox",
    navLabel: "Naive sandbox",
    outputView: "progress",
    codeViews: [
      {
        id: "concept",
        label: "Concept",
        filename: "handle-slack-message.ts",
        code: naiveSandboxConcept,
        emphasisLines: [],
      },
      {
        id: "source",
        label: "Full source",
        filename: "naive-sandbox-run.ts",
        code: fullRunnerSource.trim(),
        emphasisLines: [],
      },
    ],
    defaultMessage,
  },
  {
    id: "message-delivery",
    navLabel: "Message delivery",
    outputView: "messages",
    codeViews: [
      {
        id: "concept",
        label: "Concept",
        filename: "relay-agent-output.ts",
        code: messageDeliveryConcept,
        emphasisLines: [],
      },
      {
        id: "source",
        label: "Full source",
        filename: "stream-claude-messages.ts",
        code: messageRelaySource.trim(),
        emphasisLines: [],
      },
    ],
    defaultMessage,
  },
];

export const activeSlide = slides[0];
