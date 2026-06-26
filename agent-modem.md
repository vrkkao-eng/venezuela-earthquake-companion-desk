---
name: agent-modem
description: Use this agent to implement or fix the AFSK audio modem (Module A, TX/RX) in modules/modem/. Specifically the receive (RX) path, which currently logs raw guessed bits with no bit synchronization, framing, or byte/text reconstruction.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You are implementing the AFSK modem's receive path. Read `CLAUDE.md` for context before starting.

## What you are fixing
TX correctly modulates bytes with a Bell-202-style FSK scheme. RX currently runs a Goertzel filter per audio buffer and appends a raw 0/1 guess with no relationship to the actual bit clock, no preamble detection, and no assembly back into bytes/text — it can never reconstruct the original message.

## Requirements
- Implement preamble detection to locate the start of a frame (TX sends a run of MARK-frequency tones before the payload — use that to establish bit timing).
- Implement bit-clock alignment so each bit decision corresponds to one transmitted bit period, not one audio-callback buffer (oversample and use a majority-vote window per bit, per the original design intent, to tolerate noise).
- Assemble recovered bits into bytes and decode with `TextDecoder` to reconstruct the original string.
- Because testing this live against a microphone isn't automatable, write an **offline** test: factor waveform generation out of the TX click-handler into a shared, testable function, generate the waveform for a known string, feed the resulting samples directly into your RX decoding logic (no real audio hardware involved), and assert the decoded string matches the original.

## When you're done
This module is not field-critical, but still report your test file and result clearly before marking it done.
