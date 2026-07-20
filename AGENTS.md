# Durable Sessions demo studio

This repository is a local, presentation-led prototype for explaining
OpenComputer Durable Agent Sessions. It is intentionally both a runnable demo
and a product-discovery artifact: shipped public calls may run live, while
unshipped calls are mocked and recorded as gaps.

## Read order

1. `PRODUCT.md` — users, purpose, and the deliberately bare product register.
2. `notes/original-prompt.md` — the brief, preserved verbatim.
3. `notes/demo-script.md` — the intended video sequence and talk track.
4. `notes/api-gap-ledger.md` — shipped, adapted, and missing contracts.
5. `src/lib/scenarios.ts` — the examples the viewer actually sees.
6. `server/index.ts` — the only place that holds an org key or calls the SDK.

## Invariants

- Code is the visual subject. The on-screen product contains only example
  switching, code, execution controls, and results. Narrative belongs in notes.
- Never imply that a proposed API is shipped. The UI and gap ledger distinguish
  `public API`, `proposed API + live stand-in`, and `simulated`.
- The browser never receives `OPENCOMPUTER_API_KEY` or a session client token.
- Live runs use an idempotency key. Responses shown on screen are deliberately
  scrubbed to a safe receipt.
- Mocks are deterministic product prototypes, not a second implementation of
  the OpenComputer API.
- Use OpenComputer vocabulary: agent, session, runtime, revision, skill. A
  harness is Claude Code, Codex, Pi, or another program a runtime operates—not
  a synonym for the runtime itself.

## Contract authority

Current public behavior comes from the default-branch TypeScript SDK and
`opencomputer/docs/agent-sessions/*`. Product intent and neutral vocabulary come
from `oc-bg-agents`, especially designs 002 and 014. If the prototype and
shipped SDK disagree, record the mismatch in `notes/api-gap-ledger.md`.

## Safety

- Never commit secrets. Use `.env.local`.
- Do not make production API or dashboard changes from this repository.
- Do not turn an aspirational example into a backend contract silently. Design
  and implement that change in the owning repository first.
