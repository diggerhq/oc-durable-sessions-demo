# Durable Agent Sessions — demo studio

A local, code-first presentation app for this story:

> Start a durable session with one small call. Change the runtime. Grow from
> inline behavior to a versioned agent in a repository. Keep the same session
> API even when the agent is a custom Flue application.

This first cut is for recording an aspirational walkthrough and collecting
feedback. It calls OpenComputer's public API where the contract exists and uses
clearly marked mocks or live stand-ins where it does not.

## Run it

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

The default `DEMO_MODE=auto` behavior is:

- no API key or no agent id for a step → simulated receipt;
- API key + that step's agent id → real `oc.sessions.create({ agent, input })`;
- `DEMO_MODE=live` → fail clearly when live configuration is missing;
- `DEMO_MODE=mock` → never call OpenComputer.

The local Node process reads `.env.local`; the browser does not. Do not put
`VITE_` in front of the org key.

## Configure live steps

Create or choose the agents you want to show, then add their ids to
`.env.local`:

```bash
OPENCOMPUTER_API_KEY=osb_...

OC_DEMO_CLAUDE_AGENT_ID=agt_...
OC_DEMO_CODEX_AGENT_ID=agt_...
OC_DEMO_INLINE_AGENT_ID=agt_...
OC_DEMO_SAVED_AGENT_ID=agt_...
OC_DEMO_REPO_AGENT_ID=agt_...
OC_DEMO_FLUE_AGENT_ID=agt_...
```

The first three examples display the proposed inline-agent SDK shape. Until
that contract exists, their live mode calls the configured saved agent as a
stand-in. The saved-agent and Flue examples use the public contract exactly.
Prompt-and-skills repository agents are still a documented gap.

## Presenter controls

- click a numbered step or use `←` / `→`;
- click **Run session** or press `R`;
- edit the task before running;
- toggle **Presenter notes** for the talk-track cue;
- open a live run directly in the OpenComputer dashboard from its receipt.

## Repository map

```text
src/lib/scenarios.ts       examples, labels, and talk-track cues
src/components/            code stage and run receipt
server/index.ts            secret-safe live/mock adapter
notes/demo-script.md       full recording sequence
notes/api-gap-ledger.md    shipped vs. proposed contracts
notes/original-prompt.md   original brief, unchanged
```

## Verify

```bash
npm test
npm run build
```

