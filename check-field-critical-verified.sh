#!/bin/bash
# .claude/hooks/check-field-critical-verified.sh
# Stop hook: before Claude is allowed to finish responding, check whether
# field-critical modules have changed since their last recorded
# field-critical-verifier PASS. If the hash doesn't match (or no marker
# exists), block and tell Claude to run field-critical-verifier first.
# If nothing changed since the last PASS, this is a no-op — it won't
# interrupt unrelated work in the same repo.

cat >/dev/null  # drain stdin JSON

FAILED=0
for MODULE in routing codec; do
  if [ -d "modules/$MODULE" ]; then
    CURRENT_HASH=$(find "modules/$MODULE" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
    MARKER=".claude/verification/$MODULE.pass"
    if [ ! -f "$MARKER" ] || [ "$(cat "$MARKER")" != "$CURRENT_HASH" ]; then
      echo "modules/$MODULE has changed since its last field-critical-verifier PASS (or was never verified). Invoke the field-critical-verifier subagent on this module before finishing." >&2
      FAILED=1
    fi
  fi
done

if [ "$FAILED" -eq 1 ]; then
  exit 2
fi
exit 0
