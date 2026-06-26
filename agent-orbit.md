---
name: agent-orbit
description: Use this agent for Module D's satellite revisit countdown in modules/orbit/. Currently a hardcoded countdown timer mislabeled as an SGP4 calculation.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

Read `CLAUDE.md` first, especially the "missing data must fail honestly" decision.

## What you are fixing
`remainingTicks` is a hardcoded number that just ticks down once a second. The UI labels this as SGP4 orbital propagation, which it is not.

## Choose one, and be explicit in your final report about which you chose
(a) Implement real SGP4 propagation against a bundled TLE snapshot file (add it under `modules/orbit/data/`, with a comment recording the date it was fetched and from where), and compute the actual next revisit window for the relevant satellite over the given lat/lon.

(b) If no TLE source is available to you in this environment, do not fake the calculation. Replace the countdown with a clearly labeled placeholder state ("⚠️ Orbital data not loaded — showing no estimate") and leave a TODO describing exactly what real data and library would be needed to complete (a).

Do not deliver a hardcoded number dressed up as either of these.
