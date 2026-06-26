#!/bin/bash
# .claude/hooks/check-prohibited-domains.sh
# PreToolUse hook on Bash: blocks any command that talks to the social-media
# scraping endpoints this project has decided never to call directly.
# See CLAUDE.md decision #2.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

BLOCKED_PATTERN='api\.telegram\.org|telegram\.org/bot|api\.twitter\.com|api\.x\.com|twitter\.com/.*api'

if echo "$COMMAND" | grep -qiE "$BLOCKED_PATTERN"; then
  jq -n --arg reason "Blocked by project decision: this project never calls Telegram/X APIs directly from the app — crowd-sourced anomaly data is a manual input field, not a scraper. See CLAUDE.md decision #2." \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  exit 0
fi

exit 0
