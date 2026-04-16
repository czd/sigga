---
description: Run the harness auditor over .claude/harness-improvements.md and resolve open items.
argument-hint: "[optional: apply | propose-only]"
---

Invoke the `harness-auditor` agent (subagent_type: harness-auditor) to process the open items in `.claude/harness-improvements.md`.

Mode: $ARGUMENTS (default: propose-only — the agent proposes diffs but does not apply non-trivial changes without user approval)

After the agent returns, surface the proposed changes. If the user OKs, apply them. Either way, ensure the queue file reflects the outcome (items moved to Resolved).
