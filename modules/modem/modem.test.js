// Offline TX→RX round-trip test for AFSK modem
// Uses generateWaveform() to produce samples, feeds directly into decodeWaveform().
// No real audio hardware or microphone involved.
import { generateWaveform, decodeWaveform } from './modem.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function testRoundTrip(text) {
  const samples = generateWaveform(text);
  assert(samples.length > 0, `generateWaveform("${text}") produces non-empty buffer`);

  const { text: decoded, ok, error } = decodeWaveform(samples);
  assert(ok, `decodeWaveform ok for "${text}" (error: ${error})`);
  assert(decoded.startsWith(text),
    `decoded starts with original "${text}" (got "${decoded.slice(0, 40)}")`);
}

console.log('\nTest 1: Standard callsign payload');
testRoundTrip('VZ2026:TEST');

console.log('\nTest 2: ASCII text with digits');
testRoundTrip('EMSR884');

console.log('\nTest 3: Short single character');
testRoundTrip('A');

console.log('\nTest 4: generateWaveform returns Float32Array');
{
  const buf = generateWaveform('X');
  assert(buf instanceof Float32Array, 'output is Float32Array');
  assert(buf.every(v => v >= -1 && v <= 1), 'all samples in [-1, 1]');
}

console.log('\nTest 5: decodeWaveform on silence returns ok=false (no preamble)');
{
  const silence = new Float32Array(8000); // 1 second of zeros
  const { ok } = decodeWaveform(silence);
  assert(!ok, 'silence correctly fails preamble detection');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
