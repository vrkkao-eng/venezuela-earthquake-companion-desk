#!/bin/bash
# .claude/hooks/write-verification-marker.sh
# Called only by the field-critical-verifier subagent after it has
# independently confirmed a module passes. Records a hash of the module's
# current file contents so the Stop hook can tell whether the code has
# changed again since the last verified PASS.
# Usage: write-verification-marker.sh <module-name>

set -e
MODULE="$1"
mkdir -p .claude/verification
HASH=$(find "modules/$MODULE" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
echo "$HASH" > ".claude/verification/$MODULE.pass"
echo "Recorded verification marker for $MODULE: $HASH"
