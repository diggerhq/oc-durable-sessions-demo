# Demo script

## The one sentence

OpenComputer gives every agent the same durable session surface: begin with a
runtime, grow into versioned behavior, move the definition into Git, or replace
the whole implementation with a framework such as Flue without rebuilding the
session control plane.

Target length: 4–6 minutes. The code stage is the home tab; the dashboard,
GitHub, and terminal are supporting evidence.

## Preflight

Open these before recording:

1. this app at `localhost:4173`;
2. OpenComputer Sessions in the dashboard;
3. a manually configured built-in agent's Overview and Revisions tabs;
4. the repository-backed agent's GitHub repository;
5. the Flue agent repository;
6. a terminal in the Flue repository with `oc` logged into the same org.

Use fresh agent ids in `.env.local`. Run every live example once before the take
and archive the rehearsal sessions so the new rows are obvious.

## Sequence

### 1. Start with one durable session

On screen: **01 · Claude**.

Talk track:

> This is the smallest useful unit: give OpenComputer a runtime and a task. The
> call returns immediately with a durable session id. The agent keeps working
> after this page closes.

Click **Run session**. Point to the safe response receipt and open the dashboard
link. In OpenComputer, show the new session, the initial user message, progress,
and the final result arriving in the event log.

Contract note: the inline `agent: { runtime }` form is proposed. The draft can
use a saved Claude agent as a live stand-in.

### 2. Change the runtime, not the application

Return and select **02 · Codex**.

> That looks a lot like a managed Claude agent. But the durable session is an
> OpenComputer primitive, not a Claude primitive. Change one line and the same
> application can run Codex.

Highlight the one changed line, run it, and briefly show the second session in
the dashboard.

### 3. Show where inline configuration stops scaling

Select **03 · Inline behavior**.

> A one-off task is easy. A real agent has a system prompt, operating rules, and
> skills. I could send all of that with every new session…

Let the large code block make the point. Do not spend time reading it.

> …but this is the wrong ownership boundary. Behavior should have an identity
> and a history.

No dashboard detour is required here; one quick run is enough if pacing allows.

### 4. Define the agent once

Select **04 · Saved agent**.

> I define the agent once. Every new session pins the active revision—prompt,
> model, runtime, and skills—so the application becomes small again.

Run it. Open the agent in the dashboard. Show the system prompt, uploadable
skills, and Revisions. Edit the prompt and save.

> A change produces a new immutable revision. New sessions use it; existing
> sessions keep what they started with. I can promote or roll back an earlier
> revision.

### 5. Put the definition where teams already review changes

Select **05 · Agent from repo**.

> The dashboard is convenient, but it is not where a team wants to review a
> growing prompt and skill tree. An agent can be sourced from a repository.
> The session call does not change.

Show a repository containing `agent.toml`, `prompt.md`, and `skills/`. Make and
push a small prompt or skill edit. Return to the dashboard and show the new
deployment/revision attributed to that commit. Return to the app, run the
repository-backed agent, and open its session.

Contract note: push-to-deploy exists for Flue. A prompt-and-skills-only source
profile for built-in runtimes is not shipped yet; this beat is deliberately
aspirational.

### 6. Replace the implementation, keep the session surface

Select **06 · Flue app**.

> A prompt and skills on Claude Code or Codex covers a lot. If I need custom
> control flow or an agent framework, I can own the implementation too. This
> agent is a Flue application using Pi underneath.

Show the Flue repository and either its repository deployment or:

```bash
oc agent deploy
```

Return to the app.

> Once deployed, the application calls it exactly like every other agent.

Run the final example, open the session, and show its framework-native output
translated into the same durable OpenComputer event log.

## Closing line

> The thing my application integrates with is not Claude, Codex, Pi, or Flue.
> It is a durable session. The agent behind it can grow without forcing me to
> rebuild everything around it.

## Recording notes

- Keep mock/proposed labels visible in the feedback draft. Remove ambiguity,
  not evidence.
- Never show `.env.local`, an org key, provider key, or client token.
- Prefer one clean dashboard refresh over waiting on camera.
- If a run is slow, keep narrating the durability point; do not imply that
  session creation waits for the agent result.

