# Demo script

## Story

Start with an agent that accepts a software request from Slack and opens a pull
request. Build it in the most direct plausible way first: create a sandbox,
install the required tools, clone the repository, and start Claude Code. Let the
working implementation establish the baseline before discussing durability.

Only this first beat is implemented.

## Preflight

Open these before recording:

1. this app at `localhost:4173`;
2. OpenComputer's Sandboxes page;
3. `diggerhq/oc-agent-demo-target` on its pull-requests page.

Confirm the app says **Live**. Close or distinguish rehearsal PRs. Use a fresh
task or keep the default milliseconds request; each run gets a unique branch.

## Step 1 — the naive implementation

On screen: **Naive sandbox**.

Start with the Slack-style request:

> Support milliseconds (`ms`) in `parseDuration`, so `250ms` returns `250`. Add
> coverage for combined values like `1s250ms`.

Then walk the code, briefly:

1. define an image with Claude Code and GitHub CLI;
2. create a sandbox;
3. pass the raw repository credential to the checkout command and clone the
   repository;
4. turn the Slack message into execution instructions;
5. pass the raw provider and repository credentials to Claude Code and run it.

Click **Run**.

As soon as the sandbox link appears, open it in another tab. Show that the
sandbox is live and that the checkout and Claude process exist. Return to the
demo and wait for **Pull request opened**, then open the verified PR and show
the code, test, commit, and branch.

The conclusion for this beat is only:

> It works.

Do not explain the durable-session solution yet. The next steps will earn it by
showing what this implementation makes the application responsible for.

## Planned follow-on steps

These are directions, not implemented slides:

1. What if the application process dies after creating the sandbox?
2. What if the same Slack event is delivered twice?
3. How does a caller reconnect, stream progress, steer, cancel, or retry?
4. Who owns the sandbox lifecycle and cleanup?
5. Why are provider and repository credentials exposed to one unrestricted
   runtime?
6. What history survives after the sandbox or application disappears?
7. Replace the orchestration with a durable agent session and rerun the same
   request.

Each step should begin from an observable failure or extra responsibility in
the naive code, not from a catalogue of platform features.
