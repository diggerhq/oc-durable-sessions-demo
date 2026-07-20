# API and durability ledger

This file records the boundary between the real first demo beat and the durable
session behavior that later beats will introduce.

## Current beat

| Operation | Backing | Status |
| --- | --- | --- |
| Define the sandbox image | `Image.base().aptInstall().runCommands()` | Public TypeScript SDK |
| Create the sandbox | `Sandbox.create({ image, timeout, memoryMB })` | Public TypeScript SDK |
| Clone and prepare the repository | `sandbox.exec.run()` | Public TypeScript SDK |
| Write the Claude task | `sandbox.files.write()` | Public TypeScript SDK |
| Pass raw credentials to checkout and Claude | `sandbox.exec.run({ env })` | Public TypeScript SDK |
| Run Claude Code | `sandbox.exec.run()` | Public TypeScript SDK |
| Inspect the sandbox | `/sandboxes/<sandbox-id>` dashboard route | Shipped dashboard |
| Verify the PR | GitHub CLI against the disposable target | Live external API |

There are no mocks, stand-ins, proposed calls, or required `sessions-api`
changes in this beat.

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

## Deliberately naive durability boundary

The working first beat leaves all of these responsibilities in the local demo
application:

- Sandbox creation has no caller-supplied idempotency key. The server dedupes a
  repeated request id only in memory and only while this process survives.
- `exec.run()` is synchronous. If the local process dies during Claude's run,
  Claude may continue in the sandbox but the application loses its run record,
  sandbox id, branch, progress, and completion path.
- Progress is a local list of orchestration milestones, not a durable event log.
- There is no durable session identity to reconnect, stream, steer, cancel,
  fork, archive, or resume.
- The application owns checkout, branch naming, Git identity, task formatting,
  PR verification, sandbox sizing, timeout, and cleanup.
- The Anthropic and GitHub credentials are passed directly to sandbox commands,
  and the GitHub token has access broader than one ephemeral branch. There is no
  per-run, repository-scoped capability or egress allowlist.
- Claude Code runs with `--dangerously-skip-permissions` in a networked sandbox.
- A successful sandbox is intentionally left alive for inspection and then
  relies on its idle timeout; the application has no durable lifecycle policy.

These are the source material for the next slides. Do not conceal them with
local retry machinery before the durable-session comparison is designed.

## Current local adapter safeguards

Safeguards that make a live demo responsible without pretending to make it
durable:

- credentials stay server-side and known secret values are redacted from
  returned errors;
- the target repository and base branch are validated configuration;
- each run gets a unique branch;
- the browser receives a scrubbed run projection, never raw SDK objects;
- a run succeeds only after an open PR URL is independently resolved for its
  exact branch;
- the in-memory ledger is capped at 25 entries.

## Next contract work

None is required before testing Step 1. Design the later comparison around the
existing Durable Agent Sessions API first. Add or change platform APIs only
when a concrete later beat cannot be expressed honestly with the shipped
contract.
