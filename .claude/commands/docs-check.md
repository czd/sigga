---
description: Check docs/ against the implementation and update anything that has drifted.
argument-hint: "[optional: scope — e.g. 'phase 5', 'schema only']"
---

Invoke the `docs-sync` agent (subagent_type: docs-sync) to reconcile `docs/spec.md` and `docs/implementation-plan.md` with the current code.

Scope hint: $ARGUMENTS

After the agent returns, summarize what changed and whether anything was deferred to the user or logged to the improvements queue.
