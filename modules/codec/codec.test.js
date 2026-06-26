// Round-trip and unit tests for codec module
// Acceptance criteria per CLAUDE_CODE_BRIEF.md P1-1:
//   - Sign of latitude AND longitude preserved
//   - Fixed-width fields, no ambiguous split
//   - decode must recover coordinates (not just status)
//   - Round-trip tolerance: ±0.00001° (one quant unit)
import { encode, decode, formatDecoded } from './codec.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function approxEq(a, b, tol = 0.00001) {
  return Math.abs(a - b) <= tol;
}

function roundTrip(record, label) {
  const wire = encode(record);
  assert(wire.length === 32, `${label}: encoded length is 32 (got ${wire.length})`);
  const decoded = decode(wire);

  assert(decoded.id === record.id,
    `${label}: id round-trips ("${decoded.id}" === "${record.id}")`);
  assert(approxEq(decoded.lat, record.lat),
    `${label}: lat round-trips (${decoded.lat} ≈ ${record.lat})`);
  assert(approxEq(decoded.lon, record.lon),
    `${label}: lon round-trips (${decoded.lon} ≈ ${record.lon})`);
  assert(decoded.status === record.status,
    `${label}: status round-trips ("${decoded.status}")`);
  assert(decoded.heightM === record.heightM,
    `${label}: heightM round-trips (${decoded.heightM})`);
  assert(decoded.anomaly === (record.anomaly || false),
    `${label}: anomaly round-trips`);

  return wire;
}

// ── Test 1: Positive lat, positive lon
console.log('\nTest 1: +lat, +lon (northeast)');
roundTrip({ id: 'BLD001', lat: 10.753, lon: 66.742, status: 'green', heightM: 12 }, 'NE building');

// ── Test 2: Negative lat (south hemisphere) — sign must be preserved
console.log('\nTest 2: −lat (south hemisphere)');
roundTrip({ id: 'BLD002', lat: -10.5, lon: 66.0, status: 'yellow', heightM: 8 }, 'south lat');

// ── Test 3: Negative lon (west of prime meridian — the Venezuela case)
console.log('\nTest 3: −lon (Venezuela, west longitude)');
roundTrip({ id: 'BLD003', lat: 10.48, lon: -66.88, status: 'red', heightM: 20 }, 'west lon');

// ── Test 4: Both negative (southwest)
console.log('\nTest 4: −lat, −lon (southwest)');
roundTrip({ id: 'BLD004', lat: -33.87, lon: -70.65, status: 'unknown', heightM: 0 }, 'SW both neg');

// ── Test 5: Anomaly flag
console.log('\nTest 5: anomaly flag');
roundTrip({ id: 'BLD005', lat: 10.0, lon: -67.0, status: 'yellow', heightM: 5, anomaly: true }, 'anomaly=true');
roundTrip({ id: 'BLD006', lat: 10.0, lon: -67.0, status: 'green',  heightM: 3, anomaly: false }, 'anomaly=false');

// ── Test 6: Short id (right-padded with spaces in wire, trimmed on decode)
console.log('\nTest 6: Short id');
roundTrip({ id: 'A1', lat: 10.0, lon: -66.0, status: 'green', heightM: 1 }, 'short id');

// ── Test 7: Boundary coordinates
console.log('\nTest 7: Boundary coordinates');
roundTrip({ id: 'BOUND1', lat: 90.0,  lon: 0.0,    status: 'green', heightM: 0 }, 'lat=90');
roundTrip({ id: 'BOUND2', lat: -90.0, lon: 0.0,    status: 'green', heightM: 0 }, 'lat=-90');
roundTrip({ id: 'BOUND3', lat: 0.0,   lon: 180.0,  status: 'green', heightM: 0 }, 'lon=180');
roundTrip({ id: 'BOUND4', lat: 0.0,   lon: -180.0, status: 'green', heightM: 0 }, 'lon=-180');

// ── Test 8: Checksum mismatch is detected
console.log('\nTest 8: Checksum mismatch rejection');
{
  const wire = encode({ id: 'BLD007', lat: 10.0, lon: -66.0, status: 'green', heightM: 5 });
  const corrupted = wire.slice(0, 10) + 'X' + wire.slice(11);
  let threw = false;
  try { decode(corrupted); } catch (e) { threw = true; }
  assert(threw, 'corrupted wire string throws on decode');
}

// ── Test 9: Wrong length is rejected
console.log('\nTest 9: Wrong length rejection');
{
  let threw = false;
  try { decode('SHORT'); } catch (e) { threw = true; }
  assert(threw, 'short string throws');
}

// ── Test 10: formatDecoded shows coordinates (not just status)
console.log('\nTest 10: formatDecoded shows lat/lon');
{
  const record = decode(encode({ id: 'BLD042', lat: 10.753, lon: -66.742, status: 'yellow', heightM: 12 }));
  const display = formatDecoded(record);
  assert(display.includes('Lat:'),    'display includes Lat field');
  assert(display.includes('Lon:'),    'display includes Lon field');
  assert(display.includes('Status:'), 'display includes Status field');
  assert(display.includes('10.75'),   'display shows latitude value');
  assert(display.includes('-66.74'),  'display shows longitude with sign');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
