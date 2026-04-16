---
description: Append an entry to the harness improvements queue.
argument-hint: "<source: qa | docs-sync | user-correction | manual> | <one-line summary> | <details>"
---

Append an entry to `.claude/harness-improvements.md` under `## Open Items`.

Parse the argument as pipe-separated fields: `source | summary | details`.

If arguments are missing, ask the user for: source, one-line summary, and any relevant context/suggested action.

Use today's date. Entry format:

```markdown
### {YYYY-MM-DD} · {source} · {summary}

**Context:** {details, first half}
**Observation:** {details, second half — or the whole thing if not split}
**Suggested action:** {if the user provided one, otherwise leave blank for the auditor to decide}
```

After appending, confirm the entry and suggest running `/audit-harness` if the queue looks ready for processing.
