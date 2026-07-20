# Durable Agent Sessions demo

A local, code-first demo. The first screen creates a real OpenComputer sandbox,
checks out a disposable repository, runs Claude Code on a Slack-style request,
and opens a real pull request. The second shows the code required to get the
agent's live messages out of that sandbox and into the app. The third sends
fictional model and Git credentials from a real sandbox to a fresh public
request bin. The fourth replaces the application-owned orchestration with one
Durable Agent Sessions create call and its replaying event stream.

There is no mock mode.

## Quick start

Prerequisites:

- Git;
- Node.js 20 or newer and npm;
- `unzip` when using the team environment bundle.

Clone and install:

```bash
git clone https://github.com/diggerhq/oc-durable-sessions-demo.git
cd oc-durable-sessions-demo
npm install
```

Then choose one environment setup path.

### A. Team bundle — fastest

Get these through separate private channels:

1. `oc-durable-sessions-demo.env.zip`;
2. its password.

The archive is intentionally not stored in Git. Install it from any local path:

```bash
npm run env:install -- ~/Downloads/oc-durable-sessions-demo.env.zip
```

`unzip` prompts for the password and the script writes `.env.local` with
owner-only permissions. It refuses to overwrite an existing `.env.local`.
Neither the password nor any credential belongs in a command, chat log, commit,
or agent transcript.

### B. Manual credentials

Create the local file:

```bash
cp .env.example .env.local
```

Fill these four required values:

| Variable | Where it comes from | Used by |
| --- | --- | --- |
| `OPENCOMPUTER_API_KEY` | OpenComputer organization API key | All four screens |
| `ANTHROPIC_API_KEY` | Anthropic API key | Naive sandbox, Message delivery, Credential security |
| `GITHUB_TOKEN` | GitHub token with push and pull-request access to the configured demo repository | Naive sandbox, Message delivery |
| `DEMO_SESSION_AGENT_ID` | Deployed OpenComputer agent id (`agt_…`) | Durable session |

The default writable target is `diggerhq/oc-agent-demo-target`. Change
`DEMO_TARGET_REPO` and `DEMO_TARGET_BRANCH` in `.env.local` only if you have a
different disposable target.

If GitHub CLI is already logged into the right account, you can avoid storing
its token and keep it only in the current terminal:

```bash
export GITHUB_TOKEN="$(gh auth token)"
npm run doctor
npm run dev
# Run this after stopping the demo:
unset GITHUB_TOKEN
```

The browser never receives the OpenComputer, Anthropic, or GitHub credentials.

## Ready check

Run these from the repository root:

```bash
npm run doctor
npm test
npm run dev
```

`doctor` checks required variable names and formats without printing their
values. Then open [http://localhost:4173](http://localhost:4173). The Run panel
should say **Live** on every screen.

If port `4173` is occupied, Vite prints the replacement URL. If `doctor` reports
a missing variable, install the bundle again after moving the existing
`.env.local`, or fill that variable manually.

## Hand this repository to an agent

Give the agent the repository and the local path to the separately received
archive. This prompt is sufficient:

```text
Read AGENTS.md and README.md first. Set up and verify the demo using the
encrypted environment bundle at <absolute-path>. Never print .env.local,
credential values, or the archive password. Run npm install, install the bundle
with npm run env:install, run npm run doctor and npm test, then start npm run dev
and report the local URL. Ask me to enter the bundle password when prompted.
```

The agent should not need product or infrastructure repository context.

## Create a team bundle

On a machine with a working `.env.local`:

```bash
npm run doctor
npm run env:bundle
```

`zip` prompts twice for a new password and creates the ignored,
owner-readable-only `oc-durable-sessions-demo.env.zip`. Share the archive out of
band and send its password separately. Never add the archive to Git, even
though it is encrypted.

To use another output name:

```bash
npm run env:bundle -- local-name.env.zip
```

## Configuration details

The complete local configuration is:

```bash
OPENCOMPUTER_API_KEY=osb_...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=github-token-with-push-access
DEMO_SESSION_AGENT_ID=agt_...

DEMO_TARGET_REPO=diggerhq/oc-agent-demo-target
DEMO_TARGET_BRANCH=main
DEMO_SECURITY_MODEL=claude-haiku-4-5

OPENCOMPUTER_SANDBOX_API_URL=https://app.opencomputer.dev
OPENCOMPUTER_SESSIONS_API_URL=https://api.opencomputer.dev/v3
OPENCOMPUTER_DASHBOARD_URL=https://app.opencomputer.dev
DEMO_API_PORT=8789
```

The URLs, target branch, security model, and port already have working defaults.
`DEMO_SESSION_AGENT_ID` is an identifier rather than a credential. Do not expose
or commit the other three values.

## What Run does

1. Builds or reuses a cached sandbox image containing GitHub CLI and a working
   Claude Code binary.
2. Creates a 4 GB sandbox with a 15-minute idle timeout.
3. Passes the GitHub token to the checkout command and clones
   `diggerhq/oc-agent-demo-target` onto a unique branch.
4. Starts Claude Code with streaming JSON output and both raw tokens.
5. Receives stdout bytes over the sandbox exec WebSocket, frames JSON Lines,
   and assembles Claude text deltas, tool calls, and tool results into an
   in-memory activity list.
6. Lets the browser poll that local message list while Claude works.
7. Verifies the PR through GitHub CLI and exposes links to the sandbox and PR.

The sandbox is intentionally left available so it can be opened in the
OpenComputer dashboard during the recording. Close rehearsal PRs, delete their
branches, and stop their sandboxes when they are no longer useful.

The security run is deliberately safe: the real Anthropic key stays in the
local API, the real GitHub token is never used, and only hard-coded `not-real`
values enter the sandbox. Claude selects one real sandbox command, Webhook.site
captures the outbound request, and the app verifies both fake values before the
run succeeds. The generated request bin is public by design.

The Durable session run sends the editor input to
`oc.sessions.create({ agent, input, idempotencyKey })`, consumes
`session.events({ level: "progress" })`, and stops on `turn.completed`. The
right panel shows each persisted event's `seq`, type, level, and summary and
links to the real dashboard session. The browser still polls the local screen
projection so all four tabs share one UI mechanism; the authoritative history
and reconnect cursor live in OpenComputer's session log.

## Controls

- switch between **Naive sandbox**, **Message delivery**, **Credential
  security**, and **Durable session**;
- switch each screen between the spacious **Concept** view and the exact
  **Full source** imported by the local API;
- edit the Slack request or security prompt;
- click **Run** or press `R` while focus is outside the editor;
- open the sandbox as soon as it exists;
- open the verified PR when the run completes.

## Repository map

```text
src/lib/demo.ts                    code shown on screen
src/lib/naive-sandbox-run.ts       exact source shown and executed
src/lib/stream-claude-messages.ts  exact stdout relay shown and executed
src/lib/security-sandbox-run.ts    exact safe security runner shown and executed
src/lib/durable-session-run.ts     exact durable session runner shown and executed
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
