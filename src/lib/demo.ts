export interface DemoSlide {
  id: "naive-sandbox";
  navLabel: string;
  filename: string;
  contractLabel: string;
  code: string;
  emphasisLines: number[];
  defaultMessage: string;
}

export const slides: DemoSlide[] = [
  {
    id: "naive-sandbox",
    navLabel: "Naive sandbox",
    filename: "handle-slack-message.ts",
    contractLabel: "Public API",
    code: `import { Sandbox } from "@opencomputer/sdk";
import { Image } from "@opencomputer/sdk/node";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const GH_TOKEN = process.env.GITHUB_TOKEN!;
const image = Image.base()
  .aptInstall(["gh"])
  .runCommands(
    "sudo node /usr/lib/node_modules/@anthropic-ai/claude-code/install.cjs",
  );
const sandbox = await Sandbox.create({ image, timeout: 15 * 60 });
await sandbox.exec.run(\`
  gh auth setup-git
  git clone \${REPO_URL} /workspace/repo
\`, { env: { GH_TOKEN } });
await sandbox.files.write("/tmp/task.txt", \`
Implement this request. Test it, commit, push the branch,
and open a pull request with gh.
\${slackMessage}
\`);
await sandbox.exec.run(
  "claude -p --bare --dangerously-skip-permissions < /tmp/task.txt",
  {
    cwd: "/workspace/repo",
    timeout: 10 * 60,
    env: { ANTHROPIC_API_KEY, GH_TOKEN },
  },
);`,
    emphasisLines: [11, 12, 13, 14, 15, 21, 22, 23, 24, 25, 26, 27, 28],
    defaultMessage:
      "Support milliseconds (ms) in parseDuration, so 250ms returns 250. Add coverage for combined values like 1s250ms.",
  },
];

export const activeSlide = slides[0];
