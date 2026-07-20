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

const messageDeliveryConcept = `const lines = new JsonLineStream();

const process = await sandbox.exec.start(
  "claude -p --output-format stream-json",
  {
    onStdout(bytes) {                  // Sandbox → local API.
      for (const event of lines.write(bytes)) {
        const text = readTextDelta(event);
        if (text) run.messages.append(text); // Browser polls this.
      }
    },
  },
);

await process.done;
lines.end();`;

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
