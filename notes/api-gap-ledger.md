# API gap ledger

This is the implementation boundary for the demo. “Shipped” means available in
the default-branch TypeScript SDK and public API, not merely designed or present
on an in-flight branch.

## Scenario matrix

| Demo beat | What the viewer sees | Current backing | Status |
| --- | --- | --- | --- |
| Claude, one call | `sessions.create({ agent: { runtime: "claude" }, input })` | configured saved Claude agent | Proposed API, live stand-in or mock |
| Codex, one line changed | inline runtime changes to `codex` | configured saved Codex agent | Proposed API, live stand-in or mock |
| Inline prompt + skills | inline agent descriptor carries prompt and skill files | configured equivalent saved agent | Proposed API, live stand-in or mock |
| Saved agent | `sessions.create({ agent: AGENT_ID, input })` | public Sessions API | Shipped |
| Prompt/skills agent from repo | the same saved-agent call, definition follows Git | no built-in source profile | Mock until implemented |
| Flue app | the same saved-agent call | deployed Flue agent | Shipped |

## Shipped contracts we should use, not rebuild

- `new OpenComputer({ apiKey })`
- `oc.sessions.create({ agent, input, idempotencyKey? })`
- a returned `Session` handle with `id`, `status`, `clientToken`, events, result,
  turns, steering, cancellation, and archive
- `oc.agents.create({ name, runtime, model, prompt, credential })`
- `oc.agents.update(...)`, which produces a new revision for behavior changes
- inline revision/deployment with prompt, model, and skill files
- skill zip upload/removal, each producing a revision
- immutable revision history and active-pointer rollback/promotion
- per-session model override within the saved agent's runtime family
- repository review/import and push-to-deploy for the `flue-app-v1` profile
- Flue deployment from GitHub or `oc agent deploy`
- dashboard session route: `https://app.opencomputer.dev/sessions/<session-id>`

## Gap A — inline agent specification at session create

The public contract currently requires `agent: string`. The first three beats
need a concise, honest one-call form without first managing a reusable agent.

Provisional demo shape:

```ts
type CreateSessionParams = {
  agent:
    | AgentId
    | {
        runtime?: "claude" | "codex";
        model?: string;
        prompt?: string;
        skills?: Array<{ path: string; content: string; mode?: number }>;
        credential?: "managed" | CredentialId;
      };
  input: string | Envelope;
  // existing fields...
};
```

Recommended semantics to review before implementation:

1. An inline descriptor is frozen directly into the session snapshot; it does
   not create a reusable named Agent row.
2. Omitted runtime/model/credential use documented org/platform defaults.
3. Inline skills use the existing validated skill-file contract and limits.
4. The response and event model are identical to saved-agent sessions.
5. Idempotency fingerprints include the canonical inline descriptor.
6. `agent: string` remains unchanged; mixing an id with inline behavior is
   rejected rather than given precedence rules.

Questions that need a design decision:

- Is an anonymous, session-pinned definition compatible with the product rule
  that every session runs “on an agent,” or should SDK sugar create a hidden
  reusable agent?
- Do we want a default system prompt, or require `prompt` even in the minimal
  example?
- Should a runtime default its model, as the product design intends, even
  though current agent creation requires `model`?
- Does an inline definition appear anywhere in the dashboard as an ephemeral
  agent, or only as a session snapshot?

Owning implementation: `sessions-api` request/service/snapshot/idempotency,
then `opencomputer` TypeScript SDK, public docs, and dashboard session summary.

## Gap B — source-controlled built-in agents

Repository-first creation currently recognizes only a complete Flue
application (`flue-app-v1`). A root containing `prompt.md` and `skills/` is
intentionally unrecognized. The desired demo needs the previously designed
fast-follow source profile for built-in agents.

Minimum useful contract:

- deterministic `oc-soft-agent-v1` recognition;
- `agent.toml` with runtime/model plus `prompt.md` and optional `skills/`;
- review receipt pinned to exact repo/root/ref/sha;
- import creates the saved agent, deployment source, first deployment, and
  immutable revision;
- production-branch pushes that touch the selected root create deployments;
- source commit and actor are visible on deployments/revisions;
- an invalid or type-changed source fails without disturbing the active
  revision;
- unlink stops future deploys but preserves agent and history.

Owning implementation: design 028 follow-up, `sessions-api` source router and
deployment builder, then `opencomputer` SDK/dashboard/docs.

## Gap C — a first-class dashboard link in SDK output

The API returns the durable session id and a browser-safe client token. The demo
constructs `https://app.opencomputer.dev/sessions/<id>` locally and never exposes
the token.

This is not a launch blocker. A convenience such as `session.dashboardUrl`
could improve examples, but it couples the SDK to a hosted dashboard and needs
an explicit product decision. The safe default is to keep constructing the
link in application code.

## Gap D — revision authorship legibility

The backend has deployment source/actor and an activation audit log. Before the
repo beat is implemented, verify that the dashboard visibly answers:

- which commit produced this revision;
- who initiated the change;
- whether it came from dashboard, SDK/CLI, or repository push;
- which revision is active and how to compare/roll back.

If the data exists but the UI does not make it legible, that is a dashboard gap,
not a new persistence model.

## Prototype adapter behavior

`server/index.ts` chooses per step:

- **public** — the shown code and live call both use a saved agent id;
- **stand-in** — the shown inline contract is proposed, while the live call
  invokes a preconfigured equivalent saved agent;
- **simulated** — no API call is made.

Every run receipt reports the mode. The browser receives neither the org key nor
the returned client token.

