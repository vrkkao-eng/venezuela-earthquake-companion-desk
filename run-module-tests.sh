#!/bin/bash
# .claude/hooks/run-module-tests.sh
# PostToolUse hook: after any edit inside a field-critical module folder,
# immediately re-run that module's test suite and surface failures.
# Usage: run-module-tests.sh <module-name>

MODULE="$1"
cat >/dev/null  # drain stdin JSON, not needed for this simple version

if [ -f "modules/$MODULE/package.json" ]; then
  (cd "modules/$MODULE" && npm test --silent) || {
    echo "Tests failed in modules/$MODULE — fix before reporting this module done." >&2
    exit 2
  }
elif [ -f "modules/$MODULE/pytest.ini" ] || [ -d "modules/$MODULE/tests" ]; then
  (cd "modules/$MODULE" && python3 -m pytest -q) || {
    echo "Tests failed in modules/$MODULE — fix before reporting this module done." >&2
    exit 2
  }
else
  echo "No test runner found for modules/$MODULE — field-critical modules must have tests. See field-critical-verifier requirements." >&2
  exit 2
fi
exit 0
