// Where everything is on a given day. Pure maths, no Three.js, unit-tested.
//
// Frame: heliocentric ecliptic J2000, astronomical units — x toward the
// vernal equinox, z toward ecliptic north. Planets come from JPL's
// "Approximate Positions of the Planets" (Keplerian elements and rates,
// Table 1, fitted for 1800–2050; E. M. Standish, JPL/Caltech); the Moon from
// the Astronomical Almanac's low-precision series (≈ 0.3°); the Earth's
// rotation from Greenwich mean sidereal time. Accurate enough that what the
// page shows on the day of the visit is the real sky, not a diagram.

export type Vec3 = [number, number, number];

export const AU_KM = 149_597_870.7;
export const EARTH_RADIUS_KM = 6371.0;
export const EARTH_RADIUS_AU = EARTH_RADIUS_KM / AU_KM;
export const MOON_RADIUS_KM = 1737.4;
export const SUN_RADIUS_KM = 695_700;
/** Mean obliquity of the ecliptic at J2000 (degrees). */
export const OBLIQUITY_DEG = 23.43928;
export const J2000 = 2451545.0;
const DEG = Math.PI / 180;

export type PlanetId = "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune";

export interface Elements {
  a: number; e: number; i: number; L: number; w: number; O: number;
}

interface PlanetDef {
  id: PlanetId;
  /** Equatorial radius, km (IAU 2015 nominal where defined). */
  radiusKm: number;
  /** Sidereal orbital period in days (for the orbit lines' sampling only). */
  periodDays: number;
  /** Elements at J2000 and their rates per Julian century: a (au), e, I, L, ϖ, Ω (deg). */
  el: [number, number, number, number, number, number];
  rate: [number, number, number, number, number, number];
}

// JPL Table 1 (1800 AD – 2050 AD). "earth" is the Earth–Moon barycentre.
export const PLANETS: readonly PlanetDef[] = [
  { id: "mercury", radiusKm: 2439.7, periodDays: 87.969,
    el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  { id: "venus", radiusKm: 6051.8, periodDays: 224.701,
    el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
  { id: "earth", radiusKm: 6371.0, periodDays: 365.256,
    el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
  { id: "mars", radiusKm: 3389.5, periodDays: 686.98,
    el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  { id: "jupiter", radiusKm: 69911, periodDays: 4332.59,
    el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  { id: "saturn", radiusKm: 58232, periodDays: 10759.22,
    el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  { id: "uranus", radiusKm: 25362, periodDays: 30688.5,
    el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  { id: "neptune", radiusKm: 24622, periodDays: 60182,
    el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
];

export const PLANET_BY_ID: Record<PlanetId, PlanetDef> = Object.fromEntries(PLANETS.map((p) => [p.id, p])) as Record<PlanetId, PlanetDef>;

/** Julian day of a Date (UTC). */
export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/** Julian day → Date. */
export function dateOf(jd: number): Date {
  return new Date((jd - 2440587.5) * 86_400_000);
}

/** The Earth's orbital period in days — one "oběh". */
export const YEAR_DAYS = 365.25636;

/** Keplerian elements of a planet at Julian day `jd`. */
export function elementsAt(p: PlanetDef, jd: number): Elements {
  const T = (jd - J2000) / 36525;
  const [a, e, i, L, w, O] = p.el.map((v, k) => v + p.rate[k] * T);
  return { a, e, i, L, w, O };
}

/** Solves Kepler's equation M = E − e·sin E (radians), as in the JPL note. */
export function eccentricAnomaly(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 20; k++) {
    const dM = M - (E - e * Math.sin(E));
    const dE = dM / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

function wrapPi(x: number): number {
  return x - 2 * Math.PI * Math.floor((x + Math.PI) / (2 * Math.PI));
}

/** Heliocentric ecliptic J2000 position (au) for elements at a mean anomaly. */
function positionFromElements(el: Elements, M: number): Vec3 {
  const { a, e } = el;
  const E = eccentricAnomaly(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (el.w - el.O) * DEG, O = el.O * DEG, i = el.i * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i);
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

/** Heliocentric ecliptic J2000 position of a planet (au) at Julian day `jd`. */
export function planetPosition(id: PlanetId, jd: number): Vec3 {
  const el = elementsAt(PLANET_BY_ID[id], jd);
  return positionFromElements(el, wrapPi((el.L - el.w) * DEG));
}

/**
 * One full orbit of a planet as `n` points (au), using the elements of `jd`
 * — the line the planet is on, for drawing. Closed: the last point equals
 * the first.
 */
export function orbitPoints(id: PlanetId, jd: number, n = 256): Float32Array {
  const el = elementsAt(PLANET_BY_ID[id], jd);
  const out = new Float32Array((n + 1) * 3);
  for (let k = 0; k <= n; k++) {
    const M = (k / n) * 2 * Math.PI;
    out.set(positionFromElements(el, M), k * 3);
  }
  return out;
}

/**
 * Mean anomaly fraction of the Earth's orbit at `jd`: 0..1, 0 at perihelion.
 * Used to draw the part of the current orbit already travelled.
 */
export function orbitPhase(id: PlanetId, jd: number): number {
  const el = elementsAt(PLANET_BY_ID[id], jd);
  const M = wrapPi((el.L - el.w) * DEG);
  return (M < 0 ? M + 2 * Math.PI : M) / (2 * Math.PI);
}

/** Greenwich mean sidereal time at `jd`, in degrees (0–360). IAU 1982. */
export function gmstDeg(jd: number): number {
  const T = (jd - J2000) / 36525;
  const g = 280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}

/** Equatorial J2000 → ecliptic J2000 (both right-handed, shared x axis). */
export function equatorialToEcliptic([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(OBLIQUITY_DEG * DEG), s = Math.sin(OBLIQUITY_DEG * DEG);
  return [x, c * y + s * z, -s * y + c * z];
}

/** Ecliptic J2000 → equatorial J2000. */
export function eclipticToEquatorial([x, y, z]: Vec3): Vec3 {
  const c = Math.cos(OBLIQUITY_DEG * DEG), s = Math.sin(OBLIQUITY_DEG * DEG);
  return [x, c * y - s * z, s * y + c * z];
}

/** The Earth's north pole in the ecliptic frame. */
export const EARTH_POLE: Vec3 = equatorialToEcliptic([0, 0, 1]);

/**
 * The direction of the Greenwich meridian (in the equatorial plane) in the
 * ecliptic frame at `jd` — together with EARTH_POLE this orients the globe
 * so the night side shows the cities that are really in night right now.
 */
export function greenwichDirection(jd: number): Vec3 {
  const th = gmstDeg(jd) * DEG;
  return equatorialToEcliptic([Math.cos(th), Math.sin(th), 0]);
}

/**
 * Geocentric position of the Moon (au, ecliptic frame; ecliptic of date,
 * which differs from J2000 by well under a degree in our lifetime).
 * Astronomical Almanac low-precision formulae; good to ~0.3° and ~0.2 % in
 * distance for 1950–2050.
 */
export function moonPosition(jd: number): Vec3 {
  const T = (jd - J2000) / 36525;
  const sd = (d: number) => Math.sin(d * DEG), cd = (d: number) => Math.cos(d * DEG);
  const lambda =
    218.32 + 481267.881 * T +
    6.29 * sd(135.0 + 477198.87 * T) - 1.27 * sd(259.3 - 413335.36 * T) +
    0.66 * sd(235.7 + 890534.22 * T) + 0.21 * sd(269.9 + 954397.74 * T) -
    0.19 * sd(357.5 + 35999.05 * T) - 0.11 * sd(186.5 + 966404.03 * T);
  const beta =
    5.13 * sd(93.3 + 483202.02 * T) + 0.28 * sd(228.2 + 960400.89 * T) -
    0.28 * sd(318.3 + 6003.15 * T) - 0.17 * sd(217.6 - 407332.21 * T);
  const parallax =
    0.9508 + 0.0518 * cd(135.0 + 477198.87 * T) + 0.0095 * cd(259.3 - 413335.36 * T) +
    0.0078 * cd(235.7 + 890534.22 * T) + 0.0028 * cd(269.9 + 954397.74 * T);
  const r = 6378.14 / Math.sin(parallax * DEG) / AU_KM;
  const cl = Math.cos(lambda * DEG), sl = Math.sin(lambda * DEG), cb = Math.cos(beta * DEG), sb = Math.sin(beta * DEG);
  return [r * cb * cl, r * cb * sl, r * sb];
}

/** Ecliptic longitude (deg, 0–360) of a vector in the ecliptic frame. */
export function eclipticLongitudeDeg([x, y]: Vec3): number {
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

export const vlen = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
export const vsub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vadd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vscale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vnorm = (a: Vec3): Vec3 => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const vcross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vdot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Galactic frame (IAU 1958) in the ecliptic J2000 frame: toward the galactic
// centre, toward l = 90°, and galactic north. Rows of the equatorial→galactic
// matrix, each rotated into the ecliptic.
export const GALACTIC_CENTRE: Vec3 = equatorialToEcliptic([-0.0548755604, -0.8734370902, -0.4838350155]);
export const GALACTIC_Y: Vec3 = equatorialToEcliptic([0.4941094279, -0.44482963, 0.7469822445]);
export const GALACTIC_NORTH: Vec3 = equatorialToEcliptic([-0.867666149, -0.1980763734, 0.4559837762]);

/** Light year and parsec in au. */
export const LY_AU = 63_241.077;
export const PC_AU = 206_264.806;
/** Distance from the Sun to the galactic centre (Gravity Collaboration 2019: 8.18 kpc ≈ 26 700 ly). */
export const GALACTIC_CENTRE_LY = 26_700;
