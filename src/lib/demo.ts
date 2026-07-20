import fullRunnerSource from "./naive-sandbox-run.ts?raw";

export type CodeViewId = "concept" | "source";

export interface DemoCodeView {
  id: CodeViewId;
  label: string;
  filename: string;
  code: string;
  emphasisLines: number[];
}

export interface DemoSlide {
  id: "naive-sandbox";
  navLabel: string;
  codeViews: DemoCodeView[];
  defaultMessage: string;
}

const conceptCode = `const sandbox = await Sandbox.create();

// 1. Give Claude Code a repository.
await sandbox.exec.run(
  \`git clone \${repoUrl} /workspace/repo\`,
  { env: { GH_TOKEN } },
);

// 2. Turn the Slack message into a task.
await sandbox.files.write(
  "/tmp/task.txt",
  \`Implement, test, and open a pull request.

\${slackMessage}\`,
);

// 3. Let Claude Code work.
await sandbox.exec.run(
  "claude -p < /tmp/task.txt",
  {
    cwd: "/workspace/repo",
    env: { ANTHROPIC_API_KEY, GH_TOKEN },
  },
);`;

export const slides: DemoSlide[] = [
  {
    id: "naive-sandbox",
    navLabel: "Naive sandbox",
    codeViews: [
      {
        id: "concept",
        label: "Concept",
        filename: "handle-slack-message.ts",
        code: conceptCode,
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
    defaultMessage:
      "Support milliseconds (ms) in parseDuration, so 250ms returns 250. Add coverage for combined values like 1s250ms.",
  },
];

export const activeSlide = slides[0];
