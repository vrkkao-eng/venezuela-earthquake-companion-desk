/**
 * Module A — AFSK Audio Modem (Bell-202 style)
 *
 * TX: bytes → FSK waveform at MARK_FREQ (bit=1) / SPACE_FREQ (bit=0)
 * RX: raw PCM samples → preamble detection → bit-clock alignment → bytes → UTF-8 string
 *
 * Architecture constraint: no live microphone access in this module's logic.
 * TX produces a Float32Array; RX accepts a Float32Array.
 * The UI handles mic/speaker; this file is pure signal processing.
 *
 * Timing design: SAMPLES_PER_BIT is fixed as an integer so TX and RX
 * share identical bit boundaries with zero drift. Effective baud rate =
 * SAMPLE_RATE / SAMPLES_PER_BIT = 8000 / 7 ≈ 1143 baud.
 */

export const SAMPLE_RATE    = 8000;
export const MARK_FREQ      = 1200;   // Hz  (bit = 1)
export const SPACE_FREQ     = 2200;   // Hz  (bit = 0)
export const PREAMBLE_BITS  = 24;     // MARK-tone bits sent before payload
export const SAMPLES_PER_BIT = Math.round(SAMPLE_RATE / 1200); // = 7  (integer, no drift)

// Minimum Goertzel magnitude to count as a real signal vs. silence/noise floor
const SILENCE_THRESHOLD = 0.5;

// ─── TX ──────────────────────────────────────────────────────────────────────

/**
 * Encode a UTF-8 string into a Float32Array PCM waveform.
 * Factored out of any click-handler so it is callable from tests without audio hardware.
 */
export function generateWaveform(text) {
  const bytes = new TextEncoder().encode(text);

  // Bit stream: preamble (MARK×PREAMBLE_BITS) + payload (8 bits per byte, LSB first) + trailing MARK
  const bits = [];
  for (let i = 0; i < PREAMBLE_BITS; i++) bits.push(1);
  for (const byte of bytes) {
    for (let b = 0; b < 8; b++) bits.push((byte >> b) & 1);
  }
  for (let i = 0; i < 8; i++) bits.push(1); // flush trailing bits through RX clock

  const buf = new Float32Array(bits.length * SAMPLES_PER_BIT);
  let sampleIdx = 0;

  for (const bit of bits) {
    const freq = bit === 1 ? MARK_FREQ : SPACE_FREQ;
    for (let s = 0; s < SAMPLES_PER_BIT; s++, sampleIdx++) {
      buf[sampleIdx] = Math.sin(2 * Math.PI * freq * (sampleIdx / SAMPLE_RATE));
    }
  }
  return buf;
}

// ─── RX ──────────────────────────────────────────────────────────────────────

/**
 * Goertzel DFT magnitude at a target frequency over a fixed window of samples.
 */
function goertzel(samples, offset, windowSize, targetFreq) {
  const k = Math.round(windowSize * targetFreq / SAMPLE_RATE);
  const coeff = 2 * Math.cos(2 * Math.PI * k / windowSize);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < windowSize; i++) {
    const s0 = (offset + i < samples.length ? samples[offset + i] : 0) + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2);
}

/**
 * Classify a SAMPLES_PER_BIT-wide window as MARK(1), SPACE(0), or -1 (silence/ambiguous).
 * Returns -1 when both tone magnitudes are below SILENCE_THRESHOLD so that
 * silence never looks like a MARK-preamble.
 */
function classifyWindow(samples, offset) {
  const markMag  = goertzel(samples, offset, SAMPLES_PER_BIT, MARK_FREQ);
  const spaceMag = goertzel(samples, offset, SAMPLES_PER_BIT, SPACE_FREQ);
  if (markMag < SILENCE_THRESHOLD && spaceMag < SILENCE_THRESHOLD) return -1;
  return markMag >= spaceMag ? 1 : 0;
}

/**
 * Find the sample index where a PREAMBLE_BITS-long run of MARK windows begins.
 * Steps through the buffer in SAMPLES_PER_BIT increments so bit boundaries align
 * with TX output — no fractional drift.
 * Returns -1 if not found.
 */
function findPreamble(samples) {
  let runCount = 0;
  let runStart = 0;

  for (let i = 0; i + SAMPLES_PER_BIT <= samples.length; i += SAMPLES_PER_BIT) {
    const bit = classifyWindow(samples, i);
    if (bit === 1) {
      if (runCount === 0) runStart = i;
      runCount++;
      if (runCount >= PREAMBLE_BITS) return runStart;
    } else {
      runCount = 0;
    }
  }
  return -1;
}

/**
 * Decode a PCM waveform back to a UTF-8 string.
 * Returns { text, ok, error }.
 */
export function decodeWaveform(samples) {
  const preambleStart = findPreamble(samples);
  if (preambleStart === -1) {
    return { text: '', ok: false, error: 'preamble not found' };
  }

  // Payload starts immediately after the preamble bits
  let cursor = preambleStart + PREAMBLE_BITS * SAMPLES_PER_BIT;

  const bytes = [];
  let bitBuf   = 0;
  let bitCount = 0;

  while (cursor + SAMPLES_PER_BIT <= samples.length) {
    const bit = classifyWindow(samples, cursor);
    const safeBit = bit === -1 ? 0 : bit; // treat ambiguous as SPACE

    bitBuf |= safeBit << bitCount;
    bitCount++;

    if (bitCount === 8) {
      bytes.push(bitBuf);
      bitBuf   = 0;
      bitCount = 0;
    }

    cursor += SAMPLES_PER_BIT;
  }

  if (bytes.length === 0) {
    return { text: '', ok: false, error: 'no bytes recovered after preamble' };
  }

  try {
    const text = new TextDecoder().decode(new Uint8Array(bytes));
    return { text, ok: true, error: null };
  } catch (e) {
    return { text: '', ok: false, error: `TextDecoder: ${e.message}` };
  }
}
