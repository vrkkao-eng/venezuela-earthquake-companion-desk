/**
 * Module D — Satellite Revisit
 *
 * Loads the bundled Sentinel-1A TLE snapshot from modules/orbit/data/tle-snapshot.txt
 * and computes real pass times via SGP4 (sgp4.js).
 *
 * Architecture constraint: the TLE snapshot MUST be a local file, pre-synced before
 * deployment. This module must NOT fetch from any external URL at runtime.
 * To refresh the snapshot, fetch https://tle.ivanstanojevic.me/api/tle/39634 and
 * update modules/orbit/data/tle-snapshot.txt.
 */

import { parseTLE, findNextPasses } from './sgp4.js';

export const ORBIT_STATE = Object.freeze({
  NO_DATA: 'no_data',
  LOADED:  'loaded',
  ERROR:   'error',
});

let _elems = null;     // cached parsed TLE elements
let _loadError = null; // any load error message

/**
 * Load and parse the bundled TLE snapshot.
 * Called once; result is cached. Safe to call multiple times.
 * @param {string} [tleUrl] - override path for tests (default: relative to module)
 */
export async function loadTLE(tleUrl = './modules/orbit/data/tle-snapshot.txt') {
  if (_elems) return;
  try {
    const res  = await fetch(tleUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    // Parse non-comment, non-empty lines
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    if (lines.length < 3) throw new Error('TLE snapshot has fewer than 3 data lines');

    const [name, line1, line2] = lines;
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      throw new Error('TLE lines do not start with expected "1 " / "2 " markers');
    }

    _elems = parseTLE(name, line1, line2);
  } catch (e) {
    _loadError = e.message;
    _elems = null;
  }
}

/**
 * Returns the display object for the UI.
 * Must call loadTLE() first (index.html does this on startup).
 *
 * @param {number} latDeg - Observer latitude (°)
 * @param {number} lonDeg - Observer longitude (°)
 * @param {number} [startMs] - Search start time (default: now)
 * @returns {{ state, passes, error, epochDate }}
 */
export function getNextPassDisplay(latDeg, lonDeg, startMs = Date.now()) {
  if (!_elems) {
    return {
      state: _loadError ? ORBIT_STATE.ERROR : ORBIT_STATE.NO_DATA,
      passes: [],
      error: _loadError || 'TLE not loaded yet — call loadTLE() first',
      epochDate: null,
    };
  }

  const passes = findNextPasses(_elems, latDeg, lonDeg, startMs, 3, 5);
  return {
    state:     ORBIT_STATE.LOADED,
    passes,
    error:     null,
    epochDate: new Date(_elems.epochMs).toISOString().slice(0, 10),
    satName:   _elems.name,
  };
}

export function getOrbitStatus() {
  if (_elems) return { state: ORBIT_STATE.LOADED };
  return { state: _loadError ? ORBIT_STATE.ERROR : ORBIT_STATE.NO_DATA };
}
