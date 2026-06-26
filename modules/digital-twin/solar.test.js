// Unit tests for solar position and shadow calculation
import { solarPosition, buildingShadow } from './solar.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function approx(a, b, tol, msg) {
  assert(Math.abs(a - b) <= tol, `${msg} (got ${a.toFixed(3)}, expected ≈${b}±${tol})`);
}

// Test 1: Solar noon at equator on equinox — sun should be nearly overhead (altitude ~90°)
// March 20 2026, 12:00 UTC, lat=0, lon=0
{
  const { altitudeDeg, azimuthDeg } = solarPosition(0, 0, new Date('2026-03-20'), 12);
  console.log('\nTest 1: Solar noon at equator on equinox');
  approx(altitudeDeg, 90, 5, 'altitude near 90° at equatorial equinox noon');
}

// Test 2: Northern hemisphere winter solstice noon — sun should be low in south
// Dec 21 2025, 12:00 UTC, lat=51.5 (London), lon=0
{
  const { altitudeDeg, azimuthDeg } = solarPosition(51.5, 0, new Date('2025-12-21'), 12);
  console.log('\nTest 2: Winter solstice noon, London');
  assert(altitudeDeg > 0 && altitudeDeg < 20, `altitude is low (${altitudeDeg.toFixed(1)}°, expected 0-20°)`);
  approx(azimuthDeg, 180, 20, 'sun is roughly south');
}

// Test 3: Sunrise — altitude should be ~0° near expected sunrise time
// June 21 2026 at lat=10 lon=-66 (Caracas area), sunrise ~10:30 UTC
{
  const { altitudeDeg } = solarPosition(10, -66, new Date('2026-06-21'), 11);
  console.log('\nTest 3: Morning in Caracas area');
  assert(altitudeDeg > 0, `sun is above horizon at 11:00 UTC (${altitudeDeg.toFixed(1)}°)`);
}

// Test 4: Night — altitude must be negative
{
  const { altitudeDeg } = solarPosition(10, -66, new Date('2026-06-21'), 3);
  console.log('\nTest 4: Night in Caracas area (03:00 UTC)');
  assert(altitudeDeg < 0, `sun is below horizon at 03:00 UTC (${altitudeDeg.toFixed(1)}°)`);
}

// Test 5: buildingShadow below horizon returns belowHorizon=true
{
  const result = buildingShadow(10, -66, new Date('2026-06-21'), 3, 10);
  console.log('\nTest 5: buildingShadow at night');
  assert(result.belowHorizon === true, 'belowHorizon is true at night');
  assert(result.shadowLengthFactor === 0, 'shadowLengthFactor is 0 at night');
}

// Test 6: buildingShadow at noon gives finite shadow length
{
  const result = buildingShadow(10, -66, new Date('2026-06-21'), 17, 20);
  console.log('\nTest 6: buildingShadow at midday');
  assert(result.belowHorizon === false, 'belowHorizon is false at midday');
  assert(result.shadowLengthFactor > 0 && isFinite(result.shadowLengthFactor),
    `shadow length is positive finite (${result.shadowLengthFactor.toFixed(2)})`);
  assert(result.shadowAngleRad >= 0 && result.shadowAngleRad < 2 * Math.PI,
    'shadowAngleRad is in [0, 2π)');
}

// Test 7: formula correctness — shadow longer when sun is lower
{
  const lowSun  = buildingShadow(10, -66, new Date('2026-06-21'), 11, 10); // morning, low sun
  const highSun = buildingShadow(10, -66, new Date('2026-06-21'), 17, 10); // midday, high sun
  console.log('\nTest 7: Shadow longer when sun is lower');
  assert(lowSun.shadowLengthFactor > highSun.shadowLengthFactor,
    `morning shadow (${lowSun.shadowLengthFactor.toFixed(1)}) > noon shadow (${highSun.shadowLengthFactor.toFixed(1)})`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
