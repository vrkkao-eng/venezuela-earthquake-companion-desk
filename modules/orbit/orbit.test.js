// Unit tests for orbit module
import { getNextPassDisplay, ORBIT_STATE } from './orbit.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

// Caracas area coordinates (EMSR884 focus)
const LAT = 10.48;
const LON = -66.88;

console.log('\nTest 1: No TLE data returns honest no_data state');
{
  const result = getNextPassDisplay(LAT, LON);
  assert(result.state === ORBIT_STATE.NO_DATA,
    'state is NO_DATA when no TLE is bundled');
  assert(result.nextPassUTC === null,
    'nextPassUTC is null when no TLE is bundled (not a fake countdown)');
}

console.log('\nTest 2: No fabricated countdown value');
{
  const result = getNextPassDisplay(LAT, LON);
  // A fake implementation might return e.g. { remainingTicks: 14420 }
  assert(!('remainingTicks' in result),
    'result does not contain a hardcoded remainingTicks field');
  assert(!('countdown' in result),
    'result does not contain a hardcoded countdown field');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
