# Durable Sessions demo studio

This repository is a local, code-first demonstration of why an agent that
merely runs in a sandbox is not yet a durable agent session. The first beat is a
real naive implementation; later beats will expose its failure modes and replace
them with OpenComputer Durable Agent Sessions.

## Read order

1. `PRODUCT.md` — audience, purpose, and design constraints.
2. `notes/original-prompt.md` — the original broader demo brief, unchanged.
3. `notes/durability-pivot-prompt.md` — the prompt that narrowed the story.
4. `notes/demo-script.md` — the recording sequence.
5. `notes/api-gap-ledger.md` — public contracts, observed gaps, and later work.
6. `src/lib/demo.ts` — the code the viewer sees.
7. `server/index.ts` — the live implementation.

## Invariants

- Code is the visual subject. The screen contains only step selection, code,
  execution controls, progress, and real result links.
- There are no mocks, stand-ins, or simulated receipts.
- The first beat intentionally uses low-level sandbox primitives and preserves
  their weaknesses. Do not quietly add managed-session behavior to make the
  naive path look durable.
- The browser never receives an OpenComputer, Anthropic, or GitHub credential.
- The only writable GitHub target is the explicitly configured disposable
  demo repository.
- A successful run is not complete until the server verifies an actual open
  pull-request URL for that run's branch.
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
- Do not make production API or dashboard code changes from this repository.
- Live tests may create a sandbox, a branch, and a PR only in the configured
  disposable target. Report those artifacts so they can be cleaned up.
