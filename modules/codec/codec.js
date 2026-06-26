/**
 * Module A — Building Record Codec
 * Wire format spec: docs/data-contracts/codec-wire-format.schema.json
 *
 * 32-character fixed-width encoded string layout:
 *   [0..5]   id        — 6 chars, alphanumeric, right-padded with spaces if shorter
 *   [6]      latSign   — 'N' or 'S'
 *   [7..13]  latAbs    — 7 digits, abs(lat × 100000), zero-padded
 *   [14]     lonSign   — 'E' or 'W'
 *   [15..22] lonAbs    — 8 digits, abs(lon × 100000), zero-padded
 *   [23]     status    — 'G' | 'Y' | 'R' | 'U'
 *   [24..26] height    — 3 digits, metres, zero-padded
 *   [27]     anomaly   — '1' or '0'
 *   [28..31] checksum  — 4-hex-digit checksum of bytes 0..27
 *
 * Total: 32 characters.
 */

const STATUS_ENCODE = { green: 'G', yellow: 'Y', red: 'R', unknown: 'U' };
const STATUS_DECODE = { G: 'green', Y: 'yellow', R: 'red', U: 'unknown' };

function padLeft(str, len, ch = '0') {
  return str.toString().padStart(len, ch);
}

function padRight(str, len, ch = ' ') {
  return str.toString().padEnd(len, ch);
}

function checksum(s) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return padLeft((sum % 65536).toString(16).toUpperCase(), 4, '0');
}

/**
 * Encode a BuildingRecord into a 32-character wire string.
 * Throws if any field is out of range or missing.
 */
export function encode(record) {
  const { id, lat, lon, status, heightM, anomaly = false } = record;

  if (!id || id.length > 6) throw new Error(`id must be 1–6 chars, got "${id}"`);
  if (lat < -90 || lat > 90) throw new Error(`lat out of range: ${lat}`);
  if (lon < -180 || lon > 180) throw new Error(`lon out of range: ${lon}`);
  if (!(status in STATUS_ENCODE)) throw new Error(`unknown status: ${status}`);
  if (!Number.isInteger(heightM) || heightM < 0 || heightM > 999)
    throw new Error(`heightM must be integer 0–999, got ${heightM}`);

  const idField    = padRight(id, 6).slice(0, 6);
  const latSign    = lat >= 0 ? 'N' : 'S';
  const latAbs     = padLeft(Math.round(Math.abs(lat) * 100000), 7);
  const lonSign    = lon >= 0 ? 'E' : 'W';
  const lonAbs     = padLeft(Math.round(Math.abs(lon) * 100000), 8);
  const statusChar = STATUS_ENCODE[status];
  const heightStr  = padLeft(heightM, 3);
  const anomalyStr = anomaly ? '1' : '0';

  const payload = `${idField}${latSign}${latAbs}${lonSign}${lonAbs}${statusChar}${heightStr}${anomalyStr}`;
  if (payload.length !== 28) throw new Error(`internal: payload length ${payload.length}, expected 28`);

  return payload + checksum(payload);
}

/**
 * Decode a 32-character wire string back to a BuildingRecord.
 * Throws if the string is wrong length, has an invalid checksum, or
 * contains unrecognised field values.
 */
export function decode(wire) {
  if (typeof wire !== 'string' || wire.length !== 32) {
    throw new Error(`wire string must be exactly 32 chars, got ${wire?.length}`);
  }

  const payload  = wire.slice(0, 28);
  const expected = checksum(payload);
  const actual   = wire.slice(28, 32);
  if (actual.toUpperCase() !== expected) {
    throw new Error(`checksum mismatch: expected ${expected}, got ${actual}`);
  }

  const id       = payload.slice(0, 6).trimEnd();
  const latSign  = payload[6];
  const latAbs   = parseInt(payload.slice(7, 14), 10);
  const lonSign  = payload[14];
  const lonAbs   = parseInt(payload.slice(15, 23), 10);
  const statusCh = payload[23];
  const heightM  = parseInt(payload.slice(24, 27), 10);
  const anomaly  = payload[27] === '1';

  if (!['N', 'S'].includes(latSign)) throw new Error(`invalid latSign: ${latSign}`);
  if (!['E', 'W'].includes(lonSign)) throw new Error(`invalid lonSign: ${lonSign}`);
  if (!(statusCh in STATUS_DECODE))  throw new Error(`invalid status char: ${statusCh}`);

  const lat = (latAbs / 100000) * (latSign === 'S' ? -1 : 1);
  const lon = (lonAbs / 100000) * (lonSign === 'W' ? -1 : 1);

  return {
    id,
    lat,
    lon,
    status: STATUS_DECODE[statusCh],
    heightM,
    anomaly,
  };
}

/**
 * Format the decoded record as a human-readable display string for the UI.
 * This is what the on-screen decode output must show — not just the status.
 */
export function formatDecoded(record) {
  return [
    `ID:      ${record.id}`,
    `Lat:     ${record.lat.toFixed(5)}°`,
    `Lon:     ${record.lon.toFixed(5)}°`,
    `Status:  ${record.status}`,
    `Height:  ${record.heightM} m`,
    `Anomaly: ${record.anomaly ? 'yes' : 'no'}`,
  ].join('\n');
}
