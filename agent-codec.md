---
name: agent-codec
description: Use this agent to implement or fix Module A's compression codec (building records ↔ compact alphanumeric string for low-bandwidth radio transport) in modules/codec/. Field-critical — must pass field-critical-verifier before being considered done.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You are implementing the codec module. Read `CLAUDE.md` for context before starting.

## What you are fixing
The previous implementation lost the sign of longitude (used `Math.abs`), packed latitude and longitude into a variable-length hex string with no separator or fixed width (making them ambiguous to split back apart), and the decoder never even attempted to parse coordinates back out — only status.

## Requirements
- Read `docs/data-contracts/codec-wire-format.schema.json` (ask the orchestrator to invoke `schema-architect` if it doesn't exist yet) and lock down: fixed-width fields, explicit sign handling for both lat and lon, a documented total byte/character budget per building record.
- Encode and decode must be exact inverses. Write a round-trip test: take a sample set of building records — including at least one with negative longitude and one with negative latitude — encode, decode, and assert deep equality with the original (coordinate tolerance ±0.00001° from the ×100000 integer quantization is acceptable; status and ID must match exactly).
- Update the on-screen decode output to actually display the recovered coordinates, not just the status.

## When you're done
Report which test file you wrote and the result. Tell the orchestrator this is ready for `field-critical-verifier` — do not mark it done yourself.
