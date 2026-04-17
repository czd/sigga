#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks `git commit` unless a fresh QA marker exists.
#
# Flow:
#   1. Claude stages changes.
#   2. Claude invokes the `qa` agent via the Agent tool.
#   3. On PASS, the qa agent runs `touch /tmp/sigga-qa-passed`.
#   4. The marker is valid for 15 minutes and is consumed on first use.
#   5. `git commit` proceeds.
#
# The marker lives in /tmp (not under .claude/) so creating it doesn't trigger
# Claude Code's approval prompt for writes to the .claude/ directory.
#
# Bypass: commit message contains `[skip-qa]`, or env `SIGGA_SKIP_QA=1`, or the
# command uses `--no-verify` (in which case the user has consciously opted out).

set -euo pipefail

MARKER="/tmp/sigga-qa-passed"

input="$(cat)"

extract_command() {
  local blob="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$blob" | jq -r '.tool_input.command // empty' 2>/dev/null && return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$blob" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("command", ""))
except Exception:
    pass
' 2>/dev/null && return 0
  fi
  # Last-resort best-effort regex — brittle but better than nothing.
  printf '%s' "$blob" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

cmd="$(extract_command "$input")"

# Trim leading whitespace.
cmd="${cmd#"${cmd%%[![:space:]]*}"}"

# Only care about `git commit` at the start — not `git commit-tree` etc.
if [[ ! "$cmd" =~ ^git[[:space:]]+commit([[:space:]]|$) ]]; then
  exit 0
fi

# Bypass paths.
if [[ "${SIGGA_SKIP_QA:-0}" == "1" ]] \
  || [[ "$cmd" == *"[skip-qa]"* ]] \
  || [[ "$cmd" == *"--no-verify"* ]]; then
  exit 0
fi

if [[ -f "$MARKER" ]]; then
  now=$(date +%s)
  mtime=$(stat -c %Y "$MARKER" 2>/dev/null || stat -f %m "$MARKER" 2>/dev/null || echo 0)
  age=$(( now - mtime ))
  if (( age < 900 )); then
    # Consume the marker so a subsequent commit requires a fresh QA pass.
    rm -f "$MARKER"
    exit 0
  fi
  rm -f "$MARKER"
fi

cat >&2 <<EOF
QA GATE BLOCKED THIS COMMIT.

The Sigga project requires the \`qa\` agent to review every commit. No fresh QA
marker was found at $MARKER (or it was older than 15 minutes).

Do this:
  1. Invoke the QA agent via the Agent tool (subagent_type: "qa"). It will
     review the staged diff, run lint/typecheck, and check conventions.
  2. If QA returns PASS, it will create the marker automatically. Retry the
     commit within 15 minutes.
  3. If QA returns FAIL, fix the findings, re-stage, and re-run QA.

Bypass options (use sparingly, for trivial doc-only changes you've already
eyeballed):
  - Include \`[skip-qa]\` in the commit message.
  - Run with SIGGA_SKIP_QA=1 in the environment.
  - Use \`git commit --no-verify\` (this bypass is respected).
EOF
exit 2
