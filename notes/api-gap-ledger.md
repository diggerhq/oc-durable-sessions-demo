# API and durability ledger

This file records the boundary between the real sandbox demo beats and the
Durable Agent Sessions comparison that follows them.

## Current beats

| Operation | Backing | Status |
| --- | --- | --- |
| Define the sandbox image | `Image.base().aptInstall().runCommands()` | Public TypeScript SDK |
| Create the sandbox | `Sandbox.create({ image, timeout, memoryMB })` | Public TypeScript SDK |
| Clone and prepare the repository | `sandbox.exec.run()` | Public TypeScript SDK |
| Write the Claude task | `sandbox.files.write()` | Public TypeScript SDK |
| Pass raw credentials to checkout and Claude | `sandbox.exec.run/start({ env })` | Public TypeScript SDK |
| Start Claude and receive stdout bytes | `sandbox.exec.start({ onStdout })` | Public TypeScript SDK |
| Frame and parse Claude stream events | Local `ClaudeJsonLineRelay` | Application-owned, provider-specific code |
| Assemble and expose messages + tool activity | Local in-memory run + browser polling | Application-owned, ephemeral code |
| Inspect the sandbox | `/sandboxes/<sandbox-id>` dashboard route | Shipped dashboard |
| Verify the PR | GitHub CLI against the disposable target | Live external API |
| Create and inspect a public request bin | Webhook.site token and requests APIs | Live external API |
| Choose the security action | Anthropic Messages API with one sandbox tool | Real model; real key stays local |
| Pass security-demo credentials | `sandbox.exec.run({ env })` | Hard-coded fictional values only |
| Verify credential egress | Match both fake values in the captured request | Live external receipt |
| Create a durable session | `oc.sessions.create({ agent, input, idempotencyKey })` | Public TypeScript SDK |
| Stream its durable log | `session.events({ level: "progress" })` | Public TypeScript SDK; replay/reconnect by `seq` |
| Detect terminal work | typed `turn.completed` event | Public event contract |
| Fetch the final result | `session.result()` | Public TypeScript SDK |
| Inspect the session | `/sessions/<session-id>` dashboard route | Shipped dashboard |

There are no mocks, stand-ins, proposed calls, or required `sessions-api`
changes in these four beats.

## Durable-session comparison boundary

The fourth screen deliberately reuses the existing local run projection and
browser polling so the visual shell stays constant. It does not make that map
authoritative:

- OpenComputer commits the input and events before the local UI sees them;
- the SDK's event iterator reconnects from the last observed `seq` after a
  dropped stream;
- a create without a routing key is retry-safe through the supplied idempotency
  key;
- terminal state comes from `turn.completed`, never prose;
- model, GitHub, runtime, and sandbox credentials stay out of this application;
- the dashboard can open and steer the same session independently of this
  process.

The current local app does not persist its `run id → session id` display map.
Restarting it therefore loses the convenient local card, but it does not lose
the OpenComputer session or any event. A later crash/replay beat can persist the
session id or use the browser-safe client token and `connectSession`; both
contracts already ship, so this is demo work rather than an API gap.

## Observed platform papercuts

These do not block the demo because its image repairs them explicitly.

### Claude Code in the base image is currently incomplete

The current production base image has `/usr/bin/claude`, but invoking it reports
that the platform-native optional binary was not installed. Running

```bash
sudo node /usr/lib/node_modules/@anthropic-ai/claude-code/install.cjs
```

inside the image makes Claude Code 2.1.214 runnable. The demo keeps this step in
the visible image definition. The base image should be fixed separately so a
fresh sandbox's advertised Claude command works without repair.

### `Image` export and documentation disagree

The TypeScript image reference shows:

```ts
import { Image } from "@opencomputer/sdk";
```

Version 0.12.4 exports `Image` only from `@opencomputer/sdk/node`. The demo uses
the shipped subpath. Either the root export or the documentation should be
corrected in `opencomputer`.

### Sandbox-wide raw envs change the egress path

A live sandbox created with raw `envs` but no secret store could start and run
local commands, while HTTPS through the injected platform proxy failed with
status 407. A sandbox created without environment values keeps ordinary direct
egress, and `exec.run({ env })` can pass the raw tokens to only the checkout and
Claude processes. The demo uses that simpler public contract. This is still a
deliberately naive credential model, not the recommended product security path.

### Streaming exec needs a Node WebSocket shim

The SDK package supports Node 18+, but its streaming exec client constructs the
global `WebSocket`. The local Node runtime used by this demo does not provide
that global, so `sandbox.exec.start()` fails before connecting unless the app
installs `ws` as `globalThis.WebSocket`. The exact relay contains that shim.
The SDK should either provide its own Node transport or document and package the
required peer dependency.

## Deliberately naive durability boundary

The working sandbox beats leave all of these responsibilities in the local demo
application:

- Sandbox creation has no caller-supplied idempotency key. The server dedupes a
  repeated request id only in memory and only while this process survives.
- `exec.start()` delivers stdout through a live WebSocket callback. If the local
  process or socket dies, the app loses the run record, sandbox id, branch,
  messages, and completion path. This demo asks the platform to end the exec 30
  seconds after that connection disappears.
- Stdout chunks have neither JSON-Line nor UTF-8 boundaries. The application
  owns byte decoding, framing, parsing, text-block assembly, and error handling.
- The message parser is coupled to Claude Code's `stream-json` event schema.
- Progress and assembled messages live only in a capped in-memory map. They are
  not a durable event log.
- The browser polls the local map every 900 ms. There is no durable cursor,
  replay, acknowledgement, or reconnect contract.
- There is no durable session identity to reconnect, stream, steer, cancel,
  fork, archive, or resume.
- The application owns checkout, branch naming, Git identity, task formatting,
  PR verification, sandbox sizing, timeout, and cleanup.
- The Anthropic and GitHub credentials are passed directly to sandbox commands,
  and the GitHub token has access broader than one ephemeral branch. There is no
  per-run, repository-scoped capability or egress allowlist.
- Claude Code runs with `--dangerously-skip-permissions` in a networked sandbox.
- A process with those environment variables can send both values to an
  arbitrary public endpoint; sandbox isolation does not narrow their provider-
  or repository-level authority.
- A successful sandbox is intentionally left alive for inspection and then
  relies on its idle timeout; the application has no durable lifecycle policy.

These are the source material for the comparison. Do not conceal them with
local retry machinery in the naive screens.

## Current local adapter safeguards

Safeguards that make a live demo responsible without pretending to make it
durable:

- credentials stay server-side and known secret values are redacted from
  returned errors;
- the credential-security run never puts a real provider or Git credential in
  its sandbox; it verifies only two hard-coded `not-real` values;
- the security sink is created per run, contains no private data, and is deleted
  automatically if the run fails before capture;
- the target repository and base branch are validated configuration;
- each run gets a unique branch;
- the browser receives a scrubbed run projection, never raw SDK objects;
- a run succeeds only after an open PR URL is independently resolved for its
  exact branch;
- the in-memory ledger is capped at 25 entries.

## Next contract work

No `sessions-api` change is required for these four beats. Add or change
platform APIs only when a later observable comparison cannot be expressed
honestly with the shipped contract.
