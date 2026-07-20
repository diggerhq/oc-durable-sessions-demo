# Durable Agent Sessions demo

A local, code-first demo. The first screen creates a real OpenComputer sandbox,
checks out a disposable repository, runs Claude Code on a Slack-style request,
and opens a real pull request. The second shows the code required to get the
agent's live messages out of that sandbox and into the app.

There is no mock mode.

## Run it

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

Add three credentials to `.env.local`:

```bash
OPENCOMPUTER_API_KEY=osb_...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=github-token-with-push-access
```

`GITHUB_TOKEN` needs permission to push branches and open pull requests in
`diggerhq/oc-agent-demo-target`. If the local GitHub CLI is authenticated with
the right account, run the app without copying that token into the file:

```bash
GITHUB_TOKEN="$(gh auth token)" npm run dev
```

The browser never receives these values.

## What Run does

1. Builds or reuses a cached sandbox image containing GitHub CLI and a working
   Claude Code binary.
2. Creates a 4 GB sandbox with a 15-minute idle timeout.
3. Passes the GitHub token to the checkout command and clones
   `diggerhq/oc-agent-demo-target` onto a unique branch.
4. Starts Claude Code with streaming JSON output and both raw tokens.
5. Receives stdout bytes over the sandbox exec WebSocket, frames JSON Lines,
   and assembles Claude text deltas into an in-memory message list.
6. Lets the browser poll that local message list while Claude works.
7. Verifies the PR through GitHub CLI and exposes links to the sandbox and PR.

The sandbox is intentionally left available so it can be opened in the
OpenComputer dashboard during the recording. Close rehearsal PRs, delete their
branches, and stop their sandboxes when they are no longer useful.

## Controls

- switch between **Naive sandbox** and **Message delivery**;
- switch each screen between the spacious **Concept** view and the exact
  **Full source** imported by the local API;
- edit the Slack message;
- click **Run** or press `R` while focus is outside the editor;
- open the sandbox as soon as it exists;
- open the verified PR when the run completes.

## Repository map

```text
src/lib/demo.ts                    code shown on screen
src/lib/naive-sandbox-run.ts       exact source shown and executed
src/lib/stream-claude-messages.ts  exact stdout relay shown and executed
src/components/                    code and live-run panels
server/index.ts                    local API and run projection
notes/demo-script.md               recording sequence
notes/api-gap-ledger.md            contracts and durability gaps
notes/durability-pivot-prompt.md   durability-focused brief
notes/original-prompt.md           original broader brief
```

## Verify

```bash
npm test
npm run build
```
