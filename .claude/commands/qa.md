---
description: Run pre-commit QA on the currently staged changes.
argument-hint: "[optional: additional context for the QA agent]"
---

Invoke the `qa` agent (subagent_type: qa) to review the currently staged changes before a commit.

Context for the agent: $ARGUMENTS

Before invoking, confirm there are staged changes (`git diff --cached --stat`). If nothing is staged, stop and tell the user — don't run QA on an empty commit.

After the agent returns:
- If PASS: confirm that `.claude/.qa-passed` was created. You may proceed with the commit within 15 minutes.
- If FAIL: surface the findings to the user. Don't proceed.
