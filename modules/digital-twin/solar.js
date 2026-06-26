/**
 * Solar position calculation using NOAA simplified equations.
 * Input: lat (degrees), lon (degrees), date (Date object), hourUTC (0-23).
 * Output: { azimuthDeg, altitudeDeg } — azimuth clockwise from north, altitude above horizon.
 *
 * Derived from NOAA Solar Calculator (public domain), simplified for embedded use.
 * Accuracy: ±0.5° for dates within a few decades of J2000. Sufficient for shadow rendering.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function julianDay(date, hourUTC) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = hourUTC + (date.getUTCMinutes ? date.getUTCMinutes() / 60 : 0);

  let jd = 367 * y
    - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4)
    + Math.floor(275 * m / 9)
    + d + 1721013.5 + h / 24;
  return jd;
}

function solarPosition(latDeg, lonDeg, date, hourUTC) {
  const jd = julianDay(date, hourUTC);
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0

  // Geometric mean longitude of the sun (degrees)
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // Mean anomaly of the sun (degrees)
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);

  // Equation of center
  const Mrad = M * DEG;
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mrad)
           + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
           + 0.000289 * Math.sin(3 * Mrad);

  // Sun's true longitude
  const sunLon = L0 + C;

  // Apparent longitude (correcting for nutation and aberration)
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  // Mean obliquity of the ecliptic
  const epsilon0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * DEG);

  // Sun's right ascension and declination
  const lambdaRad = lambda * DEG;
  const epsilonRad = epsilon * DEG;
  const sinDec = Math.sin(epsilonRad) * Math.sin(lambdaRad);
  const decRad = Math.asin(sinDec);

  let RA = Math.atan2(Math.cos(epsilonRad) * Math.sin(lambdaRad), Math.cos(lambdaRad)) * RAD;
  if (RA < 0) RA += 360;

  // Equation of time (minutes)
  const ey = Math.tan(epsilonRad / 2) ** 2;
  const L0rad = L0 * DEG;
  const Mrad2 = M * DEG;
  const EqT = 4 * RAD * (
    ey * Math.sin(2 * L0rad)
    - 2 * 0.016708634 * Math.sin(Mrad2)
    + 4 * 0.016708634 * ey * Math.sin(Mrad2) * Math.cos(2 * L0rad)
    - 0.5 * ey * ey * Math.sin(4 * L0rad)
    - 1.25 * 0.016708634 * 0.016708634 * Math.sin(2 * Mrad2)
  );

  // True solar time (minutes)
  const trueSolarTimeMin = (hourUTC * 60) + EqT + 4 * lonDeg;
  let hourAngle = trueSolarTimeMin / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latRad = latDeg * DEG;
  const haRad = hourAngle * DEG;

  const cosZenith = Math.sin(latRad) * Math.sin(decRad)
                  + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const altitudeDeg = 90 - zenithRad * RAD;

  let azimuthDeg;
  const sinAz = -(Math.cos(decRad) * Math.sin(haRad)) / Math.cos(zenithRad);
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * cosZenith)
               / (Math.cos(latRad) * Math.sin(zenithRad));
  azimuthDeg = Math.atan2(sinAz, cosAz) * RAD;
  if (azimuthDeg < 0) azimuthDeg += 360;

  return { azimuthDeg, altitudeDeg };
}

/**
 * Compute shadow parameters for a building.
 * Returns { shadowAngleRad, shadowLengthFactor, belowHorizon }.
 * shadowLengthFactor = heightM / tan(altitude) — multiply by building height to get ground length.
 * belowHorizon = true if sun is below horizon (no shadow to render).
 */
export function buildingShadow(latDeg, lonDeg, date, hourUTC, heightM = 1) {
  const { azimuthDeg, altitudeDeg } = solarPosition(latDeg, lonDeg, date, hourUTC);

  if (altitudeDeg <= 0) {
    return { shadowAngleRad: 0, shadowLengthFactor: 0, belowHorizon: true, azimuthDeg, altitudeDeg };
  }

  const altRad = altitudeDeg * DEG;
  const shadowLengthFactor = heightM / Math.tan(altRad);
  // Shadow points opposite to sun: sun azimuth + 180°
  const shadowAngleDeg = (azimuthDeg + 180) % 360;
  const shadowAngleRad = shadowAngleDeg * DEG;

  return { shadowAngleRad, shadowLengthFactor, belowHorizon: false, azimuthDeg, altitudeDeg };
}

export { solarPosition };
