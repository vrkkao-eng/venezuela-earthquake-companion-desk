/**
 * Simplified SGP4 orbital propagator for LEO satellites.
 * Handles secular J2 perturbations (nodal precession, apsidal rotation,
 * mean motion correction). Drag (BSTAR) is parsed but not applied — sufficient
 * accuracy for 3–7 day predictions of a low-drag sun-synchronous orbit like Sentinel-1A.
 *
 * Reference: Vallado, "Fundamentals of Astrodynamics and Applications", 4th ed.
 * Accuracy: ±5 min for pass times within 48 h of TLE epoch. Degrades beyond 7 days.
 */

const TWO_PI  = 2 * Math.PI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const MU = 398600.4418;    // km³/s²  Earth gravitational parameter
const RE = 6378.137;       // km      Earth equatorial radius
const J2 = 1.08262668e-3;  // J2 zonal harmonic coefficient
const WE = 7.2921150e-5;   // rad/s   Earth sidereal rotation rate

// ─── TLE parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a TLE BSTAR field (encoded as "SXXXXXSXX", e.g. "-34694-4").
 * The decimal point is assumed after the first mantissa digit.
 */
function parseBSTAR(s) {
  s = s.trim();
  const m = s.match(/^([+-]?)(\d{5})([+-]\d{1,2})$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * parseInt(m[2], 10) * 1e-5 * Math.pow(10, parseInt(m[3], 10));
}

/**
 * Parse two TLE lines into an elements object.
 * Column positions follow the standard TLE format (0-indexed).
 *
 * @param {string} name  - Satellite name (from 0-line)
 * @param {string} line1 - TLE line 1
 * @param {string} line2 - TLE line 2
 * @returns {object} Orbital elements
 */
export function parseTLE(name, line1, line2) {
  const ey2 = parseInt(line1.substring(18, 20), 10);
  const epochYear = ey2 >= 57 ? 1900 + ey2 : 2000 + ey2;
  const epochDay  = parseFloat(line1.substring(20, 32));
  // epochDay is day-of-year with fractional part (1.0 = midnight Jan 1)
  const epochMs = Date.UTC(epochYear, 0, 1) + (epochDay - 1) * 86400000;

  return {
    name,
    epochMs,
    bstar: parseBSTAR(line1.substring(53, 61)),
    incl:  parseFloat(line2.substring(8,  16)) * DEG2RAD,  // inclination (rad)
    raan:  parseFloat(line2.substring(17, 25)) * DEG2RAD,  // RAAN (rad)
    ecc:   parseFloat('0.' + line2.substring(26, 33)),      // eccentricity
    argp:  parseFloat(line2.substring(34, 42)) * DEG2RAD,  // arg of perigee (rad)
    M0:    parseFloat(line2.substring(43, 51)) * DEG2RAD,  // mean anomaly at epoch (rad)
    n0:    parseFloat(line2.substring(52, 63)) * TWO_PI / 86400, // mean motion (rad/s)
  };
}

// ─── Kepler solver ───────────────────────────────────────────────────────────

/** Solve M = E − e·sin(E) by Newton–Raphson iteration. */
function solveKepler(M, ecc) {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + ecc * Math.sin(E)) / (1 - ecc * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

// ─── Time utilities ───────────────────────────────────────────────────────────

/** Julian Date from Unix ms. */
function julianDate(ms) {
  return ms / 86400000 + 2440587.5;
}

/**
 * Greenwich Mean Sidereal Time (radians) at given Unix ms.
 * Uses the IAU formula: GMST₀ = 280.46061837° at J2000.0 (JD 2451545.0),
 * advancing at 360.98564724° per solar day.
 */
function gmst(ms) {
  const D = julianDate(ms) - 2451545.0; // days from J2000.0
  return ((280.46061837 + 360.98564724 * D) % 360) * DEG2RAD;
}

// ─── Propagator ──────────────────────────────────────────────────────────────

/**
 * Propagate elements to time tMs (Unix ms).
 * Applies first-order J2 secular corrections to n, Ω, ω.
 * @returns {{ x, y, z }} ECI position in km
 */
export function propagate(elems, tMs) {
  const dt = (tMs - elems.epochMs) / 1000; // seconds from epoch

  // Semi-major axis from mean motion (Kepler's third law)
  const a = Math.cbrt(MU / (elems.n0 * elems.n0));
  // Semi-latus rectum
  const p = a * (1 - elems.ecc * elems.ecc);

  // J2 perturbation factor
  const k = 1.5 * J2 * (RE / p) ** 2;

  // Corrected mean motion
  const n = elems.n0 * (1 + k * Math.sqrt(1 - elems.ecc ** 2) * (1 - 1.5 * Math.sin(elems.incl) ** 2));

  // Secular drift rates
  const dRaan = -k * n * Math.cos(elems.incl);
  const dArgp =  k * n * 0.5 * (5 * Math.cos(elems.incl) ** 2 - 1);

  // Propagated angles
  const M    = (elems.M0   + n    * dt) % TWO_PI;
  const raan = (elems.raan + dRaan * dt) % TWO_PI;
  const argp = (elems.argp + dArgp * dt) % TWO_PI;

  // Solve Kepler → eccentric anomaly → true anomaly
  const E  = solveKepler(M, elems.ecc);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + elems.ecc) * Math.sin(E / 2),
    Math.sqrt(1 - elems.ecc) * Math.cos(E / 2)
  );

  // Radius
  const r = a * (1 - elems.ecc * Math.cos(E));

  // Position in orbital plane (perifocal frame)
  const xP = r * Math.cos(nu);
  const yP = r * Math.sin(nu);

  // Rotate perifocal → ECI:  Rz(−Ω) × Rx(−i) × Rz(−ω)
  const cO = Math.cos(raan), sO = Math.sin(raan);
  const ci = Math.cos(elems.incl), si = Math.sin(elems.incl);
  const cw = Math.cos(argp), sw = Math.sin(argp);

  return {
    x: (cO * cw - sO * sw * ci) * xP + (-cO * sw - sO * cw * ci) * yP,
    y: (sO * cw + cO * sw * ci) * xP + (-sO * sw + cO * cw * ci) * yP,
    z: (sw * si)                 * xP + ( cw * si)                 * yP,
  };
}

// ─── Coordinate transforms ────────────────────────────────────────────────────

/** ECI → ECEF: rotate by −GMST around Z axis. */
function eciToEcef(eci, tMs) {
  const θ = gmst(tMs);
  const c = Math.cos(θ), s = Math.sin(θ);
  return {
    x:  eci.x * c + eci.y * s,
    y: -eci.x * s + eci.y * c,
    z:  eci.z,
  };
}

// ─── Elevation angle ──────────────────────────────────────────────────────────

/**
 * Elevation angle (degrees) of satellite as seen from a ground observer.
 * @param {{ x, y, z }} eci  - ECI position (km)
 * @param {number}       tMs - Unix timestamp (ms)
 * @param {number} obsLatDeg - Observer geodetic latitude (°)
 * @param {number} obsLonDeg - Observer geodetic longitude (°)
 */
export function elevationAngle(eci, tMs, obsLatDeg, obsLonDeg) {
  const ecef = eciToEcef(eci, tMs);

  const φ = obsLatDeg * DEG2RAD;
  const λ = obsLonDeg * DEG2RAD;
  const cφ = Math.cos(φ), sφ = Math.sin(φ);
  const cλ = Math.cos(λ), sλ = Math.sin(λ);

  // Observer ECEF (spherical approximation, alt = 0)
  const ox = RE * cφ * cλ;
  const oy = RE * cφ * sλ;
  const oz = RE * sφ;

  // Vector: observer → satellite
  const dx = ecef.x - ox;
  const dy = ecef.y - oy;
  const dz = ecef.z - oz;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Observer's zenith unit vector
  const dot = cφ * cλ * dx + cφ * sλ * dy + sφ * dz;
  return Math.asin(dot / dist) * RAD2DEG;
}

// ─── Pass finder ─────────────────────────────────────────────────────────────

/**
 * Find the next `maxPasses` passes of the satellite visible from the observer.
 * Steps every 30 s over a 3-day search window.
 *
 * @returns {Array<{ riseMs, peakMs, setMs, peakElevDeg }>}
 */
export function findNextPasses(elems, obsLatDeg, obsLonDeg, startMs, maxPasses = 3, minElevDeg = 5) {
  const STEP_MS   = 30_000;              // 30-second steps
  const WINDOW_MS = 3 * 86400_000;       // 3-day search window

  const passes = [];
  let inPass = false;
  let riseMs = 0, peakMs = 0, peakEl = -90;

  for (let t = startMs; t < startMs + WINDOW_MS && passes.length < maxPasses; t += STEP_MS) {
    const eci = propagate(elems, t);
    const el  = elevationAngle(eci, t, obsLatDeg, obsLonDeg);

    if (!inPass && el >= minElevDeg) {
      inPass = true; riseMs = t; peakMs = t; peakEl = el;
    } else if (inPass) {
      if (el > peakEl) { peakEl = el; peakMs = t; }
      if (el < minElevDeg) {
        passes.push({ riseMs, peakMs, setMs: t, peakElevDeg: peakEl });
        inPass = false;
      }
    }
  }

  return passes;
}
