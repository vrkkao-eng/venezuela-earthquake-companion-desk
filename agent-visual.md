---
name: agent-visual
description: Use this agent for Module B visual fixes — replacing the placeholder shadow-angle formula with a real solar position calculation, and fixing the undefined --neon-cyan CSS variable, in modules/digital-twin/.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

Read `CLAUDE.md` for context.

## What you are fixing
1. `shadowAngle`/`shadowLengthFactor` are currently derived from the time slider with a made-up linear formula, not real astronomy. Replace with a standard solar position calculation (input: latitude, longitude, date, hour; output: solar azimuth and altitude), then derive shadow length from altitude (shadow length ≈ height / tan(altitude)) and shadow direction from azimuth. A lightweight published approximation (e.g. NOAA's simplified solar position equations) is fine — full ephemeris precision isn't required, but the logic must actually take lat/lon/date as input, not just the slider's hour value.
2. `.panel-title` references `var(--neon-cyan)`, which is undefined in `:root` (only `--neon-blue` is defined there). Fix the reference so panel border colors render as intended.
