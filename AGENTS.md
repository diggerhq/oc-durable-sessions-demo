# Durable Sessions demo studio

This repository is a local, code-first demonstration of why an agent that
merely runs in a sandbox is not yet a durable agent session. The first beat is a
real naive implementation; the second exposes the work required to deliver its
messages; the third demonstrates the exposure of raw model and Git credentials.
The fourth replaces that local orchestration with OpenComputer Durable Agent
Sessions: one session create and one replaying event stream.

For fresh-checkout setup, follow `README.md` from **Quick start** through
**Ready check**. Never print `.env.local`, an archive password, or credential
values. Encrypted environment bundles are transferred out of band and are
explicitly ignored by Git; they must never be committed.

## Read order

1. `PRODUCT.md` — audience, purpose, and design constraints.
2. `notes/original-prompt.md` — the original broader demo brief, unchanged.
3. `notes/durability-pivot-prompt.md` — the prompt that narrowed the story.
4. `notes/demo-script.md` — the recording sequence.
5. `notes/api-gap-ledger.md` — public contracts, observed gaps, and later work.
6. `src/lib/demo.ts` — the conceptual code the viewer sees first.
7. `src/lib/naive-sandbox-run.ts` — exact runner source shown by the Full
   source toggle and imported by the server.
8. `src/lib/stream-claude-messages.ts` — exact stdout relay shown by the second
   Full source toggle and used by the runner.
9. `src/lib/security-sandbox-run.ts` — the safe live credential-exposure runner
   shown by the third Full source toggle.
10. `src/lib/durable-session-run.ts` — the exact Durable Agent Sessions runner
    shown by the fourth Full source toggle and imported by the server.
11. `server/index.ts` — the local API and in-memory screen projection.

## Invariants

- Code is the visual subject. The screen contains only step selection, code,
  execution controls, progress, and real result links.
- There are no mocks, stand-ins, or simulated receipts.
- The first three beats intentionally use low-level sandbox primitives and
  preserve their weaknesses. Do not quietly add managed-session behavior to
  make the naive path look durable.
- The browser never receives an OpenComputer org key, Anthropic key, or GitHub
  credential.
- The only writable GitHub target is the explicitly configured disposable
  demo repository.
- A successful run is not complete until the server verifies an actual open
  pull-request URL for an agent run, or a real public receipt containing both
  fake credentials for a security run, or a durable `turn.completed` event for
  a session run.
- Each Full source view raw-imports the same module the server executes. Do not
  duplicate or hand-maintain runnable source for the UI.
- The sandbox stays available long enough to open it during the demo. Do not
  kill it on success.

## Contract authority

The public sandbox behavior comes from `opencomputer` default-branch
`sdks/typescript/` and `docs/reference/typescript-sdk/*`. Durable-session
product intent comes from `oc-bg-agents`. Record mismatches and missing behavior
in `notes/api-gap-ledger.md`; do not invent an API in this repository.

## Safety

- Never commit secrets. Use `.env.local`.
- Never return secret values, raw SDK objects, or sandbox environment variables
  to the browser.
- A security run may send only the hard-coded `not-real` credentials to its
  public request bin. The real Anthropic key must remain in the local API and
  the real GitHub token must not participate in that run.
- Do not make production API or dashboard code changes from this repository.
- Live tests may create a sandbox, a branch and PR in the configured disposable
  target, a durable session, or a public request bin containing only the fake
  credentials. Report those artifacts so they can be cleaned up.
