// The landing's scene: one Three.js scene behind the whole page, the camera
// flown by scroll from low Earth orbit to a view of the Galaxy and back.
// Imported dynamically by CosmosStage after the first paint.
//
// Units: astronomical units in the heliocentric ecliptic J2000 frame, with
// the real positions of the day (ephemeris.ts). Floating origin: every
// object is placed relative to the camera each frame (the camera itself
// stays at the origin), in JS doubles, so the Earth 1 au from the Sun is as
// steady up close as Saturn is from 10 au; a logarithmic depth buffer keeps
// both sharp in one pass.

import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CompressedTexture, CubeCamera, CustomBlending, DataTexture, DoubleSide,
  LinearFilter, LinearMipmapLinearFilter, Line, LineLoop, LineSegments, Matrix4, Mesh, NormalBlending, OneFactor,
  OneMinusSrcAlphaFactor, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Points, Quaternion, RGBAFormat,
  RepeatWrapping, RingGeometry, Scene, ShaderMaterial, SphereGeometry, SrcColorFactor, SRGBColorSpace, Texture, Vector2,
  Vector3, WebGLCubeRenderTarget, WebGLRenderer, ZeroFactor,
} from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type { Catalog } from "./catalog";
import {
  AU_KM, EARTH_POLE, EARTH_RADIUS_AU, GALACTIC_CENTRE, GALACTIC_CENTRE_LY, GALACTIC_NORTH, GALACTIC_Y, LY_AU, PC_AU,
  J2000, PLANETS, SUN_RADIUS_KM, YEAR_DAYS, equatorialToEcliptic, greenwichDirection, julianDay, moonPosition,
  orbitPhase, orbitPoints, planetPosition, type PlanetId, type Vec3, vadd, vcross, vdot, vlen, vnorm, vscale, vsub, MOON_RADIUS_KM,
} from "./ephemeris";
import { ARRANGED_LON, JOURNEY, KEYS, MOON_DIR, bilog, clamp01, easeInOut, flightEase, orbitsAt, roundedHop, segmentAt, smoothstep, trailFadeAt, type Anchor, type Direction, type Key, type Look } from "./journey";
import { starColor, type RGB } from "./starColor";
import { QUAD_VERT } from "./shaders/common";
import { SKYGEN_FRAG, SKYGEN_VERT, SKY_FRAG, SKY_VERT } from "./shaders/sky";
import { STAR_FRAG, STAR_VERT } from "./shaders/stars";
import { ATMO_FRAG, ATMO_VERT, CLOUDS_FRAG, CLOUDS_VERT, EARTH_FRAG, EARTH_VERT } from "./shaders/earth";
import { CORONA_FRAG, CORONA_VERT, MARKER_FRAG, MARKER_VERT, PLANET_FRAG, PLANET_VERT, RING_FRAG, RING_VERT, SUN_FRAG, SUN_VERT } from "./shaders/bodies";
import { ORBIT_FRAG, ORBIT_VERT, TRAIL_FRAG, TRAIL_VERT, YEARS_FRAG, YEARS_VERT } from "./shaders/lines";
import { DUST_FRAG, GALAXY_FRAG, GALAXY_VERT } from "./shaders/galaxy";
import { FILAMENT_FRAG, FILAMENT_VERT, FLOW_FRAG, FLOW_VERT, RIBBON_FRAG, RIBBON_VERT, RING_FRAG as LRING_FRAG, RING_VERT as LRING_VERT, SPARK_FRAG, SPARK_VERT } from "./shaders/light";
import { TEXTURES, type TextureName } from "./textures";

export type CosmosAtmosphere = "nebula" | "sunset" | "ocean" | "midnight" | "stars";

// What each atmosphere changes: the far dust's two tints and amount, and
// how faint a star still shows. Never the Earth, the planets, or text.
const ATMOS: Record<CosmosAtmosphere, { a: RGB; b: RGB; amt: number; scale: number; milky: number; mag: number }> = {
  nebula: { a: [0.16, 0.24, 0.52], b: [0.24, 0.3, 0.58], amt: 0.7, scale: 2.2, milky: 1, mag: 7.2 },
  sunset: { a: [0.56, 0.32, 0.14], b: [0.4, 0.22, 0.12], amt: 0.7, scale: 2.2, milky: 1, mag: 7.2 },
  ocean: { a: [0.08, 0.42, 0.44], b: [0.12, 0.28, 0.5], amt: 0.7, scale: 2.2, milky: 1, mag: 7.2 },
  midnight: { a: [0.14, 0.17, 0.38], b: [0.1, 0.12, 0.28], amt: 0.3, scale: 1.4, milky: 0.8, mag: 7.0 },
  stars: { a: [0, 0, 0], b: [0, 0, 0], amt: 0, scale: 2.2, milky: 1.15, mag: 8.4 },
};

const MAX_DPR = 1.5;
const SCALES = [1, 0.83, 0.66];
const ATMOS_FADE_S = 1.2;
const REDUCED_FADE_S = 0.6;
const POINTER_MAX = (1.5 * Math.PI) / 180;
const SCROLL_LAG_S = 0.28;
const SUN_R = SUN_RADIUS_KM / AU_KM;
const MOON_R = MOON_RADIUS_KM / AU_KM;
const RING_STEP = 0.0062;           // the trail spirals out this much (of 1 au) per orbit
const TRAIL_MAX_ORBITS = 50;
const TRAIL_SEGMENTS = 180;
const EARTH_SPIN_S = 240;          // one turn of the Earth on screen, seconds (the real day would read as still)
const EARTH_SPIN0 = 180;             // where the turn starts (degrees east of the J2000 Greenwich direction): the lit cities face the hero
const CLOUD_DRIFT = 0.00045;       // clouds slide against the surface, uv per second
const SPARKS = 90;                 // sparks around the message's light
const SPARK_LIFE = 0.8;            // seconds
const RIBBON = 56;                 // the trail: this many frames of history, one strip
const RIBBON_WIDTH = 9;            // px at the core
const RIBBON_LEN = 0.3;            // of the screen's height, everywhere
// The sealing's beats, seconds: while the words gather in the card the light is gone; it reappears on the Earth's
// night side, lifts off into a low orbit, and keeps going round.
const SEAL_GATHER = 0.7, SEAL_ARRIVE = 0.95, SEAL_LIFT = 1.8, SEAL_ORBIT = 2.9;
const SEAL_ORBIT_R = 1.32;         // Earth radii
const AMBER: RGB = [1.0, 0.85, 0.63];

// IAU north poles (RA, Dec, J2000) → the axis each globe spins on.
const POLES: Record<PlanetId | "moon", [number, number]> = {
  mercury: [281.01, 61.45], venus: [272.76, 67.16], earth: [0, 90], mars: [317.68, 52.89], jupiter: [268.06, 64.50],
  saturn: [40.59, 83.54], uranus: [257.31, -15.18], neptune: [299.36, 43.46], moon: [269.99, 66.54],
};
const MARKER_COLOR: Record<PlanetId | "moon", RGB> = {
  mercury: [0.62, 0.6, 0.57], venus: [0.96, 0.9, 0.76], earth: [0.5, 0.64, 0.96], mars: [0.86, 0.56, 0.36],
  jupiter: [0.86, 0.76, 0.6], saturn: [0.9, 0.82, 0.62], uranus: [0.62, 0.84, 0.9], neptune: [0.38, 0.52, 0.95], moon: [0.72, 0.72, 0.7],
};
// A thin atmospheric rim in the planet's own colour (strength, colour); none on the airless ones.
const HAZE: Record<PlanetId | "moon", [number, RGB]> = {
  mercury: [0, [0, 0, 0]], venus: [0.7, [0.9, 0.85, 0.7]], earth: [0, [0, 0, 0]], mars: [0.4, [0.95, 0.6, 0.42]],
  jupiter: [0.5, [0.8, 0.74, 0.62]], saturn: [0.5, [0.85, 0.78, 0.6]], uranus: [0.55, [0.62, 0.86, 0.92]], neptune: [0.65, [0.5, 0.64, 1.0]], moon: [0, [0, 0, 0]],
};
const SATURN_EQ_KM = 60_268;
const SATURN_FLAT = 0.098;
const SATURN_RING_IN_KM = 74_658;
const SATURN_RING_OUT_KM = 136_775;
const URANUS_RING_IN_KM = 41_800;    // ring 6 … epsilon: thin, dark, nearly edge-on from the ecliptic
const URANUS_RING_OUT_KM = 51_200;
/** Uranus's rings: a handful of narrow dark lanes (epsilon the widest, outermost), as a 1-D texture. */
function uranusRings(): DataTexture {
  const n = 512;
  const d = new Uint8Array(n * 4);
  const lanes: [number, number, number][] = [[0.02, 0.01, 0.25], [0.09, 0.008, 0.2], [0.17, 0.008, 0.22], [0.3, 0.01, 0.28], [0.44, 0.012, 0.3], [0.62, 0.015, 0.32], [0.96, 0.03, 0.75]];
  for (let i = 0; i < n; i++) {
    const r = i / n;
    let a = 0;
    for (const [c, w, s] of lanes) a = Math.max(a, s * Math.exp(-Math.pow((r - c) / w, 2)));
    d.set([70, 70, 78, Math.round(a * 255)], i * 4);   // dark: the rings' albedo is a few percent
  }
  const t = new DataTexture(d, n, 1, RGBAFormat);
  t.needsUpdate = true;
  return t;
}
const JUPITER_FLAT = 0.065;

const poleVector = ([ra, dec]: [number, number]): Vec3 => {
  const a = (ra * Math.PI) / 180, d = (dec * Math.PI) / 180;
  return equatorialToEcliptic([Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]);
};

export interface CosmosStats {
  fps: number; frameMs: number; scale: number; dpr: number; width: number; height: number; gpu: string;
  stars: number; progress: number; section: string; textures: string; distance: string;
}

export interface BenchResult {
  seconds: number; frames: number; avgFps: number; low1Fps: number;
  sections: { label: string; avgFps: number; frames: number }[];
}

export interface CosmosEngineOptions {
  canvas: HTMLCanvasElement;
  catalog: Catalog;
  atmosphere: CosmosAtmosphere;
  reducedMotion: boolean;
  lowPower: boolean;
  /** Julian day the scene shows as "today" (defaults to now, and keeps ticking). */
  baseJd?: number;
  /** Captures: where the Earth's turn starts, degrees (default EARTH_SPIN0). */
  spin0?: number;
  onReady: () => void;
  onContextLost: () => void;
}

interface Body {
  id: PlanetId | "moon";
  mesh: Mesh;
  mat: ShaderMaterial;
  radius: number;      // au, equatorial
  flat: number;
  axis: Vec3;
  pos: Vec3;           // world, au
  ring?: Mesh;
  ringMat?: ShaderMaterial;
  orbit?: LineLoop;
  orbitMat?: ShaderMaterial;
  a?: number;          // semi-major axis, au
  marker: number;      // index in the marker points
}

interface Pose {
  cam: Vec3; look: Vec3; up: Vec3; offset: [number, number];
  orbits: number; dim: number; stars: number; trail: number; travel: number; section: number;
}

const v3 = (v: Vec3) => new Vector3(v[0], v[1], v[2]);
const slerp = (a: Vec3, b: Vec3, t: number): Vec3 => {
  const d = Math.max(-1, Math.min(1, vdot(a, b)));
  const th = Math.acos(d);
  if (th < 1e-6) return a;
  if (Math.PI - th < 1e-4) {
    const axis = vnorm(vcross(Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], a));
    const q = new Quaternion().setFromAxisAngle(v3(axis), th * t);
    const r = v3(a).applyQuaternion(q);
    return [r.x, r.y, r.z];
  }
  const s = Math.sin(th);
  return vnorm(vadd(vscale(a, Math.sin((1 - t) * th) / s), vscale(b, Math.sin(t * th) / s)));
};
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const orthoUp = (up: Vec3, look: Vec3): Vec3 => {
  const u = vsub(up, vscale(look, vdot(up, look)));
  return vlen(u) < 1e-9 ? [0, 0, 1] : vnorm(u);
};
const nearestKey = (s: number): Key => KEYS.reduce((best, k) => (Math.abs(k.at - s) < Math.abs(best.at - s) ? k : best), KEYS[0]);
/** Direction of (lat, lon) in the basis S (lon 0), T (lon 90), U (lat 90). */
const inBasis = (S: Vec3, T: Vec3, U: Vec3, lat: number, lon: number): Vec3 => {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  return vnorm(vadd(vadd(vscale(S, Math.cos(la) * Math.cos(lo)), vscale(T, Math.cos(la) * Math.sin(lo))), vscale(U, Math.sin(la))));
};

function sphere(wSeg: number, hSeg: number) {
  return new SphereGeometry(1, wSeg, hSeg);
}

export class CosmosEngine {
  static create(opts: CosmosEngineOptions): CosmosEngine | null {
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: opts.canvas, antialias: false, alpha: false, powerPreference: "high-performance", logarithmicDepthBuffer: true });
    } catch {
      return null;
    }
    return new CosmosEngine(renderer, opts);
  }

  private readonly renderer: WebGLRenderer;
  private readonly opts: CosmosEngineOptions;
  private readonly camera = new PerspectiveCamera(50, 1, 1e-6, 1e13);
  private readonly quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // far sky
  private readonly genMat: ShaderMaterial;
  private readonly genScene = new Scene();
  private readonly cubeCam: CubeCamera;
  private readonly cubeSize: number;
  private cubes: { rt: WebGLCubeRenderTarget; atm: CosmosAtmosphere; tiles: number }[] = [];
  private atmFrom: CosmosAtmosphere;
  private atmTo: CosmosAtmosphere;
  private atmWanted: CosmosAtmosphere;
  private mix = 1;
  private readonly skyMat: ShaderMaterial;
  private readonly skyScene = new Scene();
  private readonly starMat: ShaderMaterial;
  private readonly farScene = new Scene();
  private readonly galaxyMat: ShaderMaterial;
  private readonly dustMat: ShaderMaterial;
  private readonly galaxy: Points;
  private readonly dust: Points;

  // the solar system
  private readonly world = new Scene();
  private readonly bodies: Body[] = [];
  private earth!: Body;
  private readonly earthMat: ShaderMaterial;
  private readonly cloudsMat: ShaderMaterial;
  private readonly atmoMat: ShaderMaterial;
  private readonly clouds: Mesh;
  private readonly atmo: Mesh;
  private readonly sun: Mesh;
  private readonly sunMat: ShaderMaterial;
  private readonly corona: Mesh;
  private readonly coronaMat: ShaderMaterial;
  private readonly markers: Points;
  private readonly markerMat: ShaderMaterial;
  private readonly markerAlpha: Float32Array;
  private readonly trail: Line;
  private readonly trailMat: ShaderMaterial;
  private readonly veilMat: ShaderMaterial;
  private readonly veilScene = new Scene();

  private readonly ktx2: KTX2Loader;
  private readonly textures = new Map<TextureName, Texture>();
  private loaded = new Set<string>();
  private loading = new Set<string>();

  // time
  private readonly baseJd: number;
  private readonly t0 = performance.now();
  private readonly liveClock: boolean;
  private planetJd = NaN;
  private earthJd = NaN;
  private earthOrbits = -1;
  private earthNow: Vec3 = [1, 0, 0];
  private phase0 = 0;

  private target = 0;
  private smooth = 0;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private reduced: { shown: number; phase: "idle" | "out" | "in"; t: number };
  private lastPose: Pose | null = null;
  private hold = 0;
  private holdTarget = 0;
  private lastDt = 1 / 60;
  // The trail of the message's light, in screen space.
  private readonly ribbon: Mesh;
  private readonly ribbonMat: ShaderMaterial;
  private readonly history = new Float64Array(RIBBON * 3);
  private historyLen = 0;
  private readonly ring: LineLoop;
  private readonly ringMat: ShaderMaterial;
  private ringT = 9;
  private readonly tailDir: [number, number] = [-1, 0];
  private textOn = 0;
  private blinkT = 9;
  private pendingNdc: [number, number] | null = null;
  private lastAnchor: [number, number] | null = null;
  private coreVis = 1;
  private hideT = 0;
  private tailLen = 0;
  private tailPx: [number, number] = [0, 0];
  private flash = 0;
  private wasSettled = false;
  private readonly lightScene = new Scene();
  // The hero: a ring per year of waiting, and the sealing of a message.
  private readonly years: LineSegments;
  private readonly yearsMat: ShaderMaterial;
  private yearsWant = 0;
  private yearsNow = 0;
  private goneWant = 0;
  private gone = 0;
  private seal: { t: number; from: [number, number]; n: Vec3; e: Vec3; theta: number; done: boolean } | null = null;
  private sealLook: [number, number] = [0, 0];
  private anchorNdc: [number, number] | null = null;
  // The message's light and its trail.
  private readonly filament: Points;
  private readonly filamentMat: ShaderMaterial;
  private readonly fil = { ndc: [0, 0] as [number, number], depth: 0, world: [0, 0, 0] as Vec3, pulse: 0 };
  private readonly sparks: Points;
  private readonly sparkMat: ShaderMaterial;
  private readonly sparkWorld = new Float64Array(SPARKS * 3);
  private readonly sparkBirth = new Float32Array(SPARKS).fill(-1e9);
  private sparkHead = 0;
  private sparkLast = 0;
  private sparkAt: Vec3 | null = null;
  // Dust streaming past the camera.
  private readonly flow: Points;
  private readonly flowMat: ShaderMaterial;
  private readonly flowLocal: Float32Array;
  private flowL = 0;
  private prevCam: Vec3 | null = null;
  private speed = 0;

  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private disposed = false;
  private readyFired = false;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private scaleStep = 0;
  private scaleCooldown = 0;
  private window = { frames: 0, time: 0, goodWindows: 0 };
  private fps = 0;
  private frameMs = 16.7;
  private gpu = "";
  private bench: { t: number; dts: number[]; bySection: Map<number, number[]> } | null = null;

  private constructor(renderer: WebGLRenderer, opts: CosmosEngineOptions) {
    this.renderer = renderer;
    this.opts = opts;
    renderer.autoClear = false;
    renderer.outputColorSpace = SRGBColorSpace;
    this.atmFrom = this.atmTo = this.atmWanted = opts.atmosphere;
    this.reduced = { shown: 0, phase: "idle", t: 0 };
    this.scaleStep = opts.lowPower ? 1 : 0;
    this.cubeSize = opts.lowPower ? 768 : 1024;
    this.liveClock = opts.baseJd === undefined;
    this.baseJd = opts.baseJd ?? julianDay(new Date());

    this.ktx2 = new KTX2Loader().setTranscoderPath("/cosmos/basis/").detectSupport(renderer);

    // ── far sky: dust and the band, baked per atmosphere ──
    const atm = ATMOS[opts.atmosphere];
    this.genMat = new ShaderMaterial({
      vertexShader: SKYGEN_VERT, fragmentShader: SKYGEN_FRAG, side: BackSide, depthTest: false, depthWrite: false,
      uniforms: {
        uNebA: { value: atm.a }, uNebB: { value: atm.b }, uNebAmt: { value: atm.amt }, uNebScale: { value: atm.scale }, uMilky: { value: atm.milky },
        uG0: { value: v3(GALACTIC_CENTRE) }, uG1: { value: v3(GALACTIC_Y) }, uG2: { value: v3(GALACTIC_NORTH) },
      },
    });
    this.genScene.add(new Mesh(new SphereGeometry(1, 64, 32), this.genMat));
    const firstCube = this.newCube(opts.atmosphere);
    this.cubes = [firstCube];
    this.cubeCam = new CubeCamera(0.1, 10, firstCube.rt);
    this.cubeCam.coordinateSystem = renderer.coordinateSystem;
    this.cubeCam.updateCoordinateSystem();
    this.cubeCam.updateMatrixWorld(true);

    this.skyMat = new ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uViewDir: { value: new Matrix4() }, uCubeA: { value: firstCube.rt.texture }, uCubeB: { value: firstCube.rt.texture },
        uMix: { value: 0 }, uCubeFlip: { value: 1 }, uMilky: { value: atm.milky }, uBand: { value: 1 }, uDim: { value: 1 }, uPx: { value: 1 },
      },
    });
    this.skyScene.add(new Mesh(new PlaneGeometry(2, 2), this.skyMat));

    // ── stars: the catalogue in au ──
    const { catalog } = opts;
    const nDeep = opts.lowPower ? 50_000 : 120_000;
    const total = catalog.count + nDeep;
    const pos = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const seeds = new Float32Array(total);
    const absMag = new Float32Array(total);
    for (let i = 0; i < catalog.count; i++) {
      const p = equatorialToEcliptic([catalog.positions[i * 3], catalog.positions[i * 3 + 1], catalog.positions[i * 3 + 2]]);
      pos[i * 3] = p[0] * PC_AU; pos[i * 3 + 1] = p[1] * PC_AU; pos[i * 3 + 2] = p[2] * PC_AU;
      colors.set(starColor(catalog.colorIndex[i]), i * 3);
      seeds[i] = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      absMag[i] = catalog.absMag[i];
    }
    // The deep field: the catalogue stops at 7th magnitude, so the flight out through the stars would be
    // through a near-empty sky. These stand in for the hundred million fainter stars within a few thousand
    // light-years — as many per decade of distance (1 ly … 8000 ly), each set to show as a faint star from its
    // own distance and to brighten and stream past when the camera comes near; flattened to the Galaxy's disc.
    // (The catalogue is real; this field is not — it is credited as such in the footer.)
    {
      let seed = 7;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const G0 = GALACTIC_CENTRE, G1 = GALACTIC_Y, G2 = GALACTIC_NORTH;
      for (let k = 0; k < nDeep; k++) {
        const i = catalog.count + k;
        const r = Math.pow(10, rnd() * Math.log10(25_000)) * LY_AU;        // au, 1 … 25 000 ly
        const z0 = rnd() * 2 - 1, az = rnd() * 2 * Math.PI, rxy = Math.sqrt(1 - z0 * z0);
        const squash = Math.min(1, (1000 * LY_AU) / r);                   // the disc is ~1000 ly thick
        const d = vnorm([rxy * Math.cos(az), rxy * Math.sin(az), z0 * squash]);
        const p = vadd(vadd(vscale(G0, d[0] * r), vscale(G1, d[1] * r)), vscale(G2, d[2] * r));
        pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
        const bv = Math.pow(rnd(), 0.7) * 1.5 - 0.1;
        colors.set(starColor(bv), i * 3);
        seeds[i] = rnd();
        const m0 = 5.4 + rnd() * 3.6;                                      // apparent magnitude from its own distance (half show from there)
        absMag[i] = m0 - 5 * Math.log10(r / PC_AU / 10);
      }
    }
    const sgeo = new BufferGeometry();
    sgeo.setAttribute("position", new BufferAttribute(pos, 3));
    sgeo.setAttribute("aAbs", new BufferAttribute(absMag, 1));
    sgeo.setAttribute("aColor", new BufferAttribute(colors, 3));
    sgeo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    this.starMat = new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uCam: { value: new Vector3() }, uPx: { value: 1 }, uTime: { value: 0 }, uMagLimit: { value: atm.mag }, uDim: { value: 1 },
        uTwinkle: { value: 0.08 }, uPcPerUnit: { value: 1 / PC_AU },
      },
    });
    const stars = new Points(sgeo, this.starMat);
    stars.frustumCulled = false;
    this.farScene.add(stars);

    // ── the Galaxy, procedural ──
    const g = this.buildGalaxy(opts.lowPower ? 60_000 : 120_000, opts.lowPower ? 6000 : 11_000);
    this.galaxyMat = new ShaderMaterial({
      vertexShader: GALAXY_VERT, fragmentShader: GALAXY_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uPx: { value: 1 }, uAlpha: { value: 0 }, uRef: { value: 40_000 * LY_AU }, uMaxScale: { value: 24 }, uNear: { value: 1500 * LY_AU } },
    });
    this.dustMat = new ShaderMaterial({
      vertexShader: GALAXY_VERT, fragmentShader: DUST_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: CustomBlending, blendSrc: ZeroFactor, blendDst: SrcColorFactor,
      uniforms: { uPx: { value: 1 }, uAlpha: { value: 0 }, uRef: { value: 40_000 * LY_AU }, uMaxScale: { value: 10 }, uNear: { value: 1500 * LY_AU } },
    });
    this.galaxy = new Points(g.stars, this.galaxyMat);
    this.dust = new Points(g.dust, this.dustMat);
    this.galaxy.frustumCulled = this.dust.frustumCulled = false;
    this.galaxy.visible = this.dust.visible = false;
    this.dust.renderOrder = 1;                         // the lanes darken the arms, so they go over them
    this.farScene.add(this.galaxy, this.dust);

    // ── the Sun ──
    this.sunMat = new ShaderMaterial({
      vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uTime: { value: 0 }, uExposure: { value: 1 } },
    });
    this.sun = new Mesh(sphere(64, 48), this.sunMat);
    this.sun.scale.setScalar(SUN_R);
    this.world.add(this.sun);
    this.coronaMat = new ShaderMaterial({
      vertexShader: CORONA_VERT, fragmentShader: CORONA_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: [1.0, 0.84, 0.58] }, uIntensity: { value: 1 }, uTime: { value: 0 }, uDisc: { value: 0.1 } },
    });
    this.corona = new Mesh(new PlaneGeometry(1, 1), this.coronaMat);
    this.corona.renderOrder = 5;
    this.world.add(this.corona);

    // ── the Earth ──
    const placeholder = (r: number, g: number, b: number) => {
      const t = new DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, RGBAFormat);
      t.needsUpdate = true;
      return t;
    };
    const earthGeo = sphere(160, 120);
    this.earthMat = new ShaderMaterial({
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG,
      uniforms: {
        uDay: { value: placeholder(30, 50, 90) }, uNight: { value: placeholder(0, 0, 0) }, uClouds: { value: placeholder(0, 0, 0) },
        uNormal: { value: placeholder(128, 128, 255) }, uSpec: { value: placeholder(0, 0, 0) },
        uSun: { value: new Vector3(1, 0, 0) }, uCentre: { value: new Vector3() }, uCloudShift: { value: 0 }, uExposure: { value: 1 }, uNightLift: { value: 0 },
        uMoon: { value: new Vector3(1e9, 0, 0) }, uMoonR: { value: MOON_RADIUS_KM / AU_KM },
      },
    });
    const earthMesh = new Mesh(earthGeo, this.earthMat);
    this.cloudsMat = new ShaderMaterial({
      vertexShader: CLOUDS_VERT, fragmentShader: CLOUDS_FRAG, transparent: true, depthWrite: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: { uClouds: { value: placeholder(0, 0, 0) }, uSun: { value: new Vector3(1, 0, 0) }, uCloudShift: { value: 0 }, uExposure: { value: 1 } },
    });
    this.clouds = new Mesh(earthGeo, this.cloudsMat);
    this.clouds.renderOrder = 1;
    this.atmoMat = new ShaderMaterial({
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: {
        uCentre: { value: new Vector3() }, uSun: { value: new Vector3(1, 0, 0) }, uRadius: { value: EARTH_RADIUS_AU }, uKmPerUnit: { value: AU_KM },
        uExposure: { value: 1 }, uSteps: { value: opts.lowPower ? 8 : 12 },
      },
    });
    this.atmo = new Mesh(sphere(96, 64), this.atmoMat);
    this.atmo.renderOrder = 2;
    this.world.add(earthMesh, this.clouds, this.atmo);

    // ── planets and the Moon ──
    const planetGeo = sphere(160, 120);
    const markerPos = new Float32Array(10 * 3);
    const markerCol = new Float32Array(10 * 3);
    this.markerAlpha = new Float32Array(10);
    let m = 0;
    const addBody = (id: PlanetId | "moon", radiusKm: number, flat = 0, a?: number): Body => {
      const isEarth = id === "earth";
      const mat = isEarth ? this.earthMat : new ShaderMaterial({
        vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
        uniforms: {
          uMap: { value: placeholder(90, 85, 80) }, uSun: { value: new Vector3(1, 0, 0) }, uExposure: { value: 1 }, uAmbient: { value: id === "moon" ? 0.05 : 0.012 },   // the Moon's night side: earthshine
          uHasRing: { value: 0 }, uCentre: { value: new Vector3() }, uRingNormal: { value: new Vector3(0, 0, 1) }, uRingInner: { value: 0 }, uRingOuter: { value: 0 },
          uRing: { value: placeholder(0, 0, 0) }, uHaze: { value: HAZE[id][0] }, uHazeColor: { value: HAZE[id][1] },
          uCaster: { value: new Vector3(1e9, 0, 0) }, uCasterR: { value: 0 },
          uBands: { value: id === "neptune" ? 0.9 : id === "uranus" ? 0.3 : 0 }, uSpot: { value: id === "neptune" ? 1 : 0 },
        },
      });
      const mesh = isEarth ? earthMesh : new Mesh(planetGeo, mat);
      if (!isEarth) this.world.add(mesh);
      const colour = MARKER_COLOR[id];
      markerCol.set(colour, m * 3);
      const body: Body = { id, mesh, mat, radius: radiusKm / AU_KM, flat, axis: poleVector(POLES[id]), pos: [0, 0, 0], a, marker: m++ };
      if (id === "earth") body.axis = EARTH_POLE;
      this.bodies.push(body);
      if (isEarth) this.earth = body;
      return body;
    };
    for (const p of PLANETS) {
      const body = addBody(p.id, p.id === "saturn" ? SATURN_EQ_KM : p.radiusKm, p.id === "saturn" ? SATURN_FLAT : p.id === "jupiter" ? JUPITER_FLAT : 0, p.el[0]);
      // Orbit line.
      const pts = orbitPoints(p.id, this.baseJd, 360);
      const og = new BufferGeometry();
      og.setAttribute("position", new BufferAttribute(pts.slice(0, 360 * 3), 3));
      const omat = new ShaderMaterial({
        vertexShader: ORBIT_VERT, fragmentShader: ORBIT_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
        uniforms: { uAlpha: { value: 0 }, uColor: { value: p.id === "earth" ? [0.86, 0.9, 1.0] : [0.72, 0.78, 0.92] } },
      });
      body.orbit = new LineLoop(og, omat);
      body.orbit.frustumCulled = false;
      body.orbitMat = omat;
      this.world.add(body.orbit);
      if (p.id === "saturn" || p.id === "uranus") {
        const rin = (p.id === "saturn" ? SATURN_RING_IN_KM : URANUS_RING_IN_KM) / AU_KM, rout = (p.id === "saturn" ? SATURN_RING_OUT_KM : URANUS_RING_OUT_KM) / AU_KM;
        const rg = new RingGeometry(rin, rout, 180, 1);
        // uv.x = radius 0..1 (RingGeometry's uv is planar by default).
        const uv = rg.attributes.uv as BufferAttribute;
        const rp = rg.attributes.position as BufferAttribute;
        for (let k = 0; k < uv.count; k++) {
          const r = Math.hypot(rp.getX(k), rp.getY(k));
          uv.setXY(k, (r - rin) / (rout - rin), 0.5);
        }
        const rmat = new ShaderMaterial({
          vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: DoubleSide,
          blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
          uniforms: {
            uRing: { value: p.id === "uranus" ? uranusRings() : placeholder(0, 0, 0) }, uSun: { value: new Vector3(1, 0, 0) }, uCentre: { value: new Vector3() },
            uPlanetRadius: { value: body.radius }, uNormal: { value: new Vector3(0, 0, 1) }, uExposure: { value: 1 },
          },
        });
        body.ring = new Mesh(rg, rmat);
        body.ring.renderOrder = 1;
        body.ringMat = rmat;
        this.world.add(body.ring);
        body.mat.uniforms.uHasRing.value = 1;
        body.mat.uniforms.uRingInner.value = rin;
        body.mat.uniforms.uRingOuter.value = rout;
        body.mat.uniforms.uRing.value = rmat.uniforms.uRing.value;
      }
    }
    addBody("moon", MOON_RADIUS_KM);
    markerCol.set([1.0, 0.86, 0.62], 9 * 3);   // the Sun, from the Galaxy
    const mg = new BufferGeometry();
    mg.setAttribute("position", new BufferAttribute(markerPos, 3));
    mg.setAttribute("aColor", new BufferAttribute(markerCol, 3));
    mg.setAttribute("aAlpha", new BufferAttribute(this.markerAlpha, 1));
    this.markerMat = new ShaderMaterial({
      vertexShader: MARKER_VERT, fragmentShader: MARKER_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uPx: { value: 1 } },
    });
    this.markers = new Points(mg, this.markerMat);
    this.markers.frustumCulled = false;
    this.markers.renderOrder = 6;
    this.world.add(this.markers);

    // ── the Earth's trail: a spiral along its orbit, one turn per orbit ──
    this.phase0 = orbitPhase("earth", this.baseJd);
    const orbit = orbitPoints("earth", this.baseJd, TRAIL_SEGMENTS);
    const n = TRAIL_MAX_ORBITS * TRAIL_SEGMENTS + 1;
    const tp = new Float32Array(n * 3);
    const ts = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const s = k / TRAIL_SEGMENTS;                           // orbits since today
      const ph = (this.phase0 + s) % 1;
      const seg = ph * TRAIL_SEGMENTS, i0 = Math.floor(seg), f = seg - i0;
      const i1 = (i0 + 1) % TRAIL_SEGMENTS;
      const grow = 1 + s * RING_STEP;
      for (let c = 0; c < 3; c++) tp[k * 3 + c] = (orbit[i0 * 3 + c] * (1 - f) + orbit[i1 * 3 + c] * f) * grow;
      ts[k] = s;
    }
    const tg = new BufferGeometry();
    tg.setAttribute("position", new BufferAttribute(tp, 3));
    tg.setAttribute("aS", new BufferAttribute(ts, 1));
    this.trailMat = new ShaderMaterial({
      vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uOrbits: { value: 0 }, uFade: { value: 0 }, uAlpha: { value: 0.42 }, uColor: { value: AMBER } },
    });
    this.trail = new Line(tg, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 3;
    this.world.add(this.trail);

    // ── the hero's year rings: up to 50 thin orbits around the Earth, inclined like a low orbit ──
    {
      const N = 50, SEG = 128;
      const pos = new Float32Array(N * SEG * 2 * 3);
      const ring = new Float32Array(N * SEG * 2);
      let k = 0;
      for (let i = 0; i < N; i++) {
        const r = 1.18 + i * 0.032;                                  // Earth radii: each year a hair further out, like the trail's rings
        const inc = 34 * (Math.PI / 180);                            // one inclined plane, like a low orbit seen from the hero
        const node = 0.6;
        for (let j = 0; j < SEG; j++) {
          for (const jj of [j, (j + 1) % SEG]) {
            const a = (jj / SEG) * 2 * Math.PI;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            // Rotate by inclination about x, then by the node about the pole (local +y is the pole in the Earth's mesh frame).
            const yy = y * Math.cos(inc), zz = y * Math.sin(inc);
            pos[k * 3] = x * Math.cos(node) - zz * Math.sin(node);
            pos[k * 3 + 1] = yy;
            pos[k * 3 + 2] = x * Math.sin(node) + zz * Math.cos(node);
            ring[k] = i + 1;
            k++;
          }
        }
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      g.setAttribute("aRing", new BufferAttribute(ring, 1));
      this.yearsMat = new ShaderMaterial({
        vertexShader: YEARS_VERT, fragmentShader: YEARS_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
        uniforms: { uCount: { value: 0 }, uGone: { value: 0 }, uAlpha: { value: 0.5 }, uColor: { value: AMBER } },
      });
      this.years = new LineSegments(g, this.yearsMat);
      this.years.frustumCulled = false;
      this.years.renderOrder = 4;
      this.years.visible = false;
      this.world.add(this.years);
    }

    // ── the message's light: the filament, its sparks, and the dust streaming past ──
    this.filamentMat = new ShaderMaterial({
      vertexShader: FILAMENT_VERT, fragmentShader: FILAMENT_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uPx: { value: 1 }, uSize: { value: 14 }, uColor: { value: [1.0, 0.78, 0.5] }, uAlpha: { value: 1 } },
    });
    const fg = new BufferGeometry();
    fg.setAttribute("position", new BufferAttribute(new Float32Array(3), 3));
    this.filament = new Points(fg, this.filamentMat);
    this.filament.frustumCulled = false;
    this.filament.renderOrder = 8;
    this.world.add(this.filament);
    const sg = new BufferGeometry();
    sg.setAttribute("position", new BufferAttribute(new Float32Array(SPARKS * 3), 3));
    sg.setAttribute("aAge", new BufferAttribute(new Float32Array(SPARKS).fill(-1), 1));
    const sseed = new Float32Array(SPARKS);
    for (let i = 0; i < SPARKS; i++) sseed[i] = Math.abs((Math.sin(i * 7.31) * 1357.17) % 1);
    sg.setAttribute("aSeed", new BufferAttribute(sseed, 1));
    this.sparkMat = new ShaderMaterial({
      vertexShader: SPARK_VERT, fragmentShader: SPARK_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uPx: { value: 1 }, uLife: { value: SPARK_LIFE }, uColor: { value: [1.0, 0.68, 0.34] } },
    });
    this.sparks = new Points(sg, this.sparkMat);
    this.sparks.frustumCulled = false;
    this.sparks.renderOrder = 7;
    this.world.add(this.sparks);
    const nFlow = opts.lowPower ? 1200 : 2600;
    this.flowLocal = new Float32Array(nFlow * 3);
    const fseed = new Float32Array(nFlow);
    {
      let seed = 99;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < nFlow * 3; i++) this.flowLocal[i] = rnd() - 0.5;
      for (let i = 0; i < nFlow; i++) fseed[i] = rnd();
    }
    const flg = new BufferGeometry();
    flg.setAttribute("position", new BufferAttribute(this.flowLocal, 3));
    flg.setAttribute("aSeed", new BufferAttribute(fseed, 1));
    this.flowMat = new ShaderMaterial({
      vertexShader: FLOW_VERT, fragmentShader: FLOW_FRAG, transparent: true, depthTest: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uPx: { value: 1 }, uL: { value: 1 }, uAlpha: { value: 0.3 }, uColor: { value: [0.8, 0.86, 1.0] } },
    });
    this.flow = new Points(flg, this.flowMat);
    this.flow.frustumCulled = false;
    this.flow.renderOrder = 4;
    this.world.add(this.flow);
    // The ribbon and the ring: screen space, over everything.
    const rg = new BufferGeometry();
    rg.setAttribute("position", new BufferAttribute(new Float32Array(RIBBON * 2 * 3), 3));
    rg.setAttribute("aA", new BufferAttribute(new Float32Array(RIBBON * 2), 1));
    const idx = new Uint16Array((RIBBON - 1) * 6);
    for (let k = 0; k < RIBBON - 1; k++) {
      const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.set([a, b, c, b, d, c], k * 6);
    }
    rg.setIndex(new BufferAttribute(idx, 1));
    this.ribbonMat = new ShaderMaterial({
      vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      uniforms: { uColor: { value: [1.0, 0.72, 0.4] }, uAlpha: { value: 0 } },
    });
    this.ribbon = new Mesh(rg, this.ribbonMat);
    this.ribbon.frustumCulled = false;
    this.lightScene.add(this.ribbon);
    const cg = new BufferGeometry();
    const cpos = new Float32Array(96 * 3);
    for (let k = 0; k < 96; k++) { const a = (k / 96) * 2 * Math.PI; cpos[k * 3] = Math.cos(a); cpos[k * 3 + 1] = Math.sin(a); }
    cg.setAttribute("position", new BufferAttribute(cpos, 3));
    this.ringMat = new ShaderMaterial({
      vertexShader: LRING_VERT, fragmentShader: LRING_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uCentre: { value: new Vector2() }, uRadius: { value: new Vector2() }, uColor: { value: [1.0, 0.8, 0.52] }, uAlpha: { value: 0 } },
    });
    this.ring = new LineLoop(cg, this.ringMat);
    this.ring.frustumCulled = false;
    this.lightScene.add(this.ring);

    // Reduced motion: sections cut through a fade instead of flying.
    this.veilMat = new ShaderMaterial({
      vertexShader: QUAD_VERT, transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending,
      fragmentShader: "precision highp float; uniform float uA; void main(){ gl_FragColor = vec4(0.0196, 0.0275, 0.051, uA); }",
      uniforms: { uA: { value: 0 } },
    });
    this.veilScene.add(new Mesh(new PlaneGeometry(2, 2), this.veilMat));

    this.resize();
    this.loadGroup("earth");

    opts.canvas.addEventListener("webglcontextlost", this.onLost, false);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  // ── public API ──

  setProgress(s: number) {
    this.target = Math.max(0, Math.min(JOURNEY.length - 1, s));
  }

  jumpTo(s: number) {
    // A real jump (not a capture's next frame): the light starts afresh where the camera lands.
    if (Math.abs(s - this.smooth) > 0.5) this.resetLights();
    this.setProgress(s);
    this.smooth = this.opts.reducedMotion ? Math.round(this.target) : this.target;
    this.reduced.shown = Math.round(this.target);
  }

  /** How far the reader is through the current section's content (0..1): the camera glides a little with it. */
  setHold(h: number) {
    this.holdTarget = clamp01(h);
  }

  /** Where the message's light should settle on screen while the camera stands (NDC), or null to lead the flight. */
  setAnchor(ndc: [number, number] | null) {
    this.anchorNdc = ndc;
  }

  private resetLights() {
    this.prevCam = null;
    this.speed = 0;
    this.fil.depth = 0;
    this.flowL = 0;
    this.historyLen = 0;
    this.sparkBirth.fill(-1e9);
    this.sparkAt = null;
    this.ringT = 9;
    this.flash = 0;
  }

  private flightIdx = 0;
  private flightSpot(portrait: boolean, tx: number, ty: number): [number, number] {
    const spots: [number, number][] = portrait ? [[0.55, 0.62], [-0.55, 0.62], [0.55, -0.72], [-0.55, -0.72]] : [[0.58, -0.58], [-0.58, -0.58], [0.58, 0.55], [-0.58, 0.55]];
    const ref = (portrait ? 9 / 16 : 16 / 9) / this.camera.aspect;
    const W = this.width, H = this.height;
    const clear = (ndc: [number, number]) => {
      const px = ((ndc[0] * ref + 1) / 2) * W, py = ((1 - ndc[1]) / 2) * H;
      for (const id of ["earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune"] as const) {
        const q = this.project(id);
        if (!q || q.px < 30) continue;
        if (Math.hypot(q.x - px, q.y - py) < q.px * (id === "saturn" ? 2.3 : 1) + 70) return false;
      }
      return true;
    };
    if (!clear(spots[this.flightIdx])) {
      const next = spots.findIndex((sp) => clear(sp));
      if (next >= 0) this.flightIdx = next;
    }
    void tx; void ty;
    return spots[this.flightIdx];
  }

  /** The hero's year slider: one ring around the Earth per year of waiting; "when I'm gone" dissolves them and eases the camera back. */
  setHeroYears(years: number, gone: boolean) {
    this.yearsWant = Math.max(0, Math.min(50, years));
    this.goneWant = gone ? 1 : 0;
  }

  /**
   * Sealing: the message's light gathers at `from` (CSS px, where the words converged), flies to the Earth's
   * night side, lifts off into a low orbit and keeps going round while the camera follows it a little.
   */
  sealMessage(from: [number, number]) {
    const toCam = vnorm(vsub(this.lastPose?.cam ?? [1, 0, 0], this.earth.pos));
    const night = vnorm(this.earth.pos);                              // away from the Sun
    const n = vnorm(vadd(toCam, vscale(night, 0.6)));                 // on the visible night side
    // The orbit's plane holds the lift-off point and the screen's leftward direction, so the light crosses the
    // night side in view (then passes behind the Earth and comes round again) instead of leaving the frame.
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const left: Vec3 = [-right.x, -right.y, -right.z];
    const e = vnorm(vsub(left, vscale(n, vdot(left, n))));
    this.seal = { t: 0, from, n, e, theta: 0, done: false };
    this.sparkBirth.fill(-1e9);
  }

  /** The sealing cuts to its end: the light already in orbit. */
  skipSeal() {
    if (this.seal) { this.seal.t = Math.max(this.seal.t, SEAL_ORBIT); this.seal.done = true; }
  }

  unseal() {
    this.seal = null;
    this.sealLook = [0, 0];
  }

  /** The light's footprint on screen (CSS px): the core's sprite and its tail, for the layout checks. */
  lightBounds(): { x0: number; y0: number; x1: number; y1: number } {
    if (this.coreVis < 0.05) return { x0: -1, y0: -1, x1: -1, y1: -1 };   // blinked out: nowhere
    const r = (this.filamentMat.uniforms.uSize.value as number) / 2;
    const [cx, cy] = this.tailPx;
    let x0 = cx - r, y0 = cy - r, x1 = cx + r, y1 = cy + r;
    if (this.tailLen > 0) {
      const ex = cx + this.tailDir[0] * this.tailLen, ey = cy - this.tailDir[1] * this.tailLen;
      x0 = Math.min(x0, ex - 5); x1 = Math.max(x1, ex + 5); y0 = Math.min(y0, ey - 5); y1 = Math.max(y1, ey + 5);
    }
    return { x0, y0, x1, y1 };
  }

  /** Captures: stop the clock, then advance it by hand with step(). */
  pause() {
    this.stop();
  }

  /** Captures: one frame, dt seconds after the last (deterministic motion). */
  step(dt: number) {
    if (this.running) return;
    this.frame(this.last + dt * 1000);
  }

  setPointer(nx: number, ny: number) {
    this.pointer.x = Math.max(-1, Math.min(1, nx));
    this.pointer.y = Math.max(-1, Math.min(1, ny));
  }

  setAtmosphere(a: CosmosAtmosphere) {
    this.atmWanted = a;
  }

  /** Renders one frame now (captures, when the loop is stopped). */
  renderOnce() {
    if (!this.running) this.frame(performance.now());
  }

  resize() {
    const c = this.opts.canvas;
    this.width = Math.max(1, c.clientWidth);
    this.height = Math.max(1, c.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.applyScale();
    this.camera.aspect = this.width / this.height;
    this.camera.fov = this.width < this.height ? 62 : 50;
    this.camera.updateProjectionMatrix();
  }

  startBenchmark() {
    this.bench = { t: 0, dts: [], bySection: new Map() };
  }

  stopBenchmark(): BenchResult | null {
    const b = this.bench;
    this.bench = null;
    if (!b || b.dts.length === 0) return null;
    const fpsOf = (dts: number[]) => dts.length / Math.max(1e-6, dts.reduce((s, x) => s + x, 0));
    const sorted = [...b.dts].sort((x, y) => y - x);
    const worst = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 100)));
    return {
      seconds: b.t, frames: b.dts.length, avgFps: fpsOf(b.dts), low1Fps: 1 / (worst.reduce((s, x) => s + x, 0) / worst.length),
      sections: [...b.bySection.entries()].sort((x, y) => x[0] - y[0]).map(([i, dts]) => ({ label: nearestKey(i).label, avgFps: fpsOf(dts), frames: dts.length })),
    };
  }

  stats(): CosmosStats {
    if (!this.gpu) {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      this.gpu = String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || "?");
    }
    const d = this.lastPose ? vlen(this.lastPose.cam) : 0;
    const distance = d > 0.5 * LY_AU ? `${(d / LY_AU).toFixed(1)} ly` : d > 0.01 ? `${d.toFixed(3)} au` : `${(d * AU_KM).toFixed(0)} km`;
    return {
      fps: this.fps, frameMs: this.frameMs, scale: SCALES[this.scaleStep], dpr: this.dpr,
      width: Math.round(this.width * this.dpr * SCALES[this.scaleStep]), height: Math.round(this.height * this.dpr * SCALES[this.scaleStep]),
      gpu: this.gpu, stars: this.opts.catalog.count, progress: this.smooth,
      section: nearestKey(this.smooth).label,
      textures: `${this.loaded.size}/${Object.keys(TEXTURES).length}`, distance,
    };
  }

  /** Screen position (CSS px) of a body's centre, for DOM labels; null when behind the camera. */
  project(id: PlanetId | "moon" | "sun"): { x: number; y: number; px: number } | null {
    const pose = this.lastPose;
    if (!pose) return null;
    const world: Vec3 = id === "sun" ? [0, 0, 0] : this.bodies.find((b) => b.id === id)!.pos;
    const rel = v3(vsub(world, pose.cam));
    const dist = rel.length();
    const p = rel.project(this.camera);
    if (p.z > 1) return null;
    const radius = id === "sun" ? SUN_R : this.bodies.find((b) => b.id === id)!.radius;
    const px = (radius / dist) * this.height / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    return { x: (p.x + 1) / 2 * this.width, y: (1 - p.y) / 2 * this.height, px };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.opts.canvas.removeEventListener("webglcontextlost", this.onLost, false);
    document.removeEventListener("visibilitychange", this.onVisibility);
    for (const c of this.cubes) c.rt.dispose();
    for (const scene of [this.genScene, this.skyScene, this.farScene, this.world, this.lightScene, this.veilScene]) {
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (m.material as ShaderMaterial | undefined)?.dispose?.();
      });
    }
    for (const t of this.textures.values()) t.dispose();
    this.ktx2.dispose();
    this.renderer.dispose();
  }

  // ── lifecycle ──

  private onLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onContextLost();
  };

  private onVisibility = () => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private start() {
    if (this.running || this.disposed || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private applyScale() {
    this.renderer.setPixelRatio(this.dpr * SCALES[this.scaleStep]);
    this.renderer.setSize(this.width, this.height, false);
    const px = this.dpr * SCALES[this.scaleStep];
    for (const m of [this.starMat, this.skyMat, this.galaxyMat, this.dustMat, this.markerMat]) m.uniforms.uPx.value = px;
  }

  // ── textures, in the order the journey needs them ──

  private loadGroup(group: "earth" | "moon" | "planets") {
    if (this.loading.has(group)) return;
    this.loading.add(group);
    const names = (Object.keys(TEXTURES) as TextureName[]).filter((n) => TEXTURES[n].group === group);
    const jobs = names.map(async (name) => {
      try {
        const tex = (await this.ktx2.loadAsync(TEXTURES[name].url)) as CompressedTexture;
        if (this.disposed) { tex.dispose(); return; }
        tex.colorSpace = TEXTURES[name].srgb ? SRGBColorSpace : "";
        tex.wrapS = RepeatWrapping;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.magFilter = LinearFilter;
        tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        tex.needsUpdate = true;
        this.textures.set(name, tex);
        this.loaded.add(name);
        this.applyTexture(name, tex);
      } catch (err) {
        console.error(`[cosmos] texture ${name}:`, err);
        this.loaded.add(name);   // don't wait forever for a missing file
      }
    });
    void Promise.all(jobs);
  }

  private applyTexture(name: TextureName, tex: Texture) {
    const body = (id: PlanetId | "moon") => this.bodies.find((b) => b.id === id)!;
    switch (name) {
      case "earthDay": this.earthMat.uniforms.uDay.value = tex; break;
      case "earthNight": this.earthMat.uniforms.uNight.value = tex; break;
      case "earthClouds": this.earthMat.uniforms.uClouds.value = tex; this.cloudsMat.uniforms.uClouds.value = tex; break;
      case "earthNormal": this.earthMat.uniforms.uNormal.value = tex; break;
      case "earthSpecular": this.earthMat.uniforms.uSpec.value = tex; break;
      case "saturnRing": { const s = body("saturn"); s.ringMat!.uniforms.uRing.value = tex; s.mat.uniforms.uRing.value = tex; break; }
      default: body(name as PlanetId | "moon").mat.uniforms.uMap.value = tex;
    }
  }

  private earthReady() {
    return (["earthDay", "earthNight", "earthClouds", "earthNormal", "earthSpecular"] as const).every((n) => this.loaded.has(n));
  }

  // ── far sky cubes (as in v2: baked a tile at a time) ──

  private newCube(atm: CosmosAtmosphere) {
    const rt = new WebGLCubeRenderTarget(this.cubeSize, { generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    return { rt, atm, tiles: 0 };
  }

  private bake(cube: { rt: WebGLCubeRenderTarget; atm: CosmosAtmosphere; tiles: number }, budget: number): boolean {
    const a = ATMOS[cube.atm];
    const u = this.genMat.uniforms;
    u.uNebA.value = a.a; u.uNebB.value = a.b; u.uNebAmt.value = a.amt; u.uNebScale.value = a.scale; u.uMilky.value = a.milky;
    const half = this.cubeSize / 2;
    while (budget-- > 0 && cube.tiles < 24) {
      const face = Math.floor(cube.tiles / 4), q = cube.tiles % 4;
      cube.rt.viewport.set(0, 0, this.cubeSize, this.cubeSize);
      cube.rt.scissor.set((q % 2) * half, Math.floor(q / 2) * half, half, half);
      cube.rt.scissorTest = true;
      this.renderer.setRenderTarget(cube.rt, face);
      this.renderer.render(this.genScene, this.cubeCam.children[face] as PerspectiveCamera);
      cube.tiles++;
    }
    cube.rt.scissorTest = false;
    this.renderer.setRenderTarget(null);
    return cube.tiles >= 24;
  }

  private updateAtmosphere(dt: number) {
    const shown = this.cubes[0];
    if (shown.tiles < 24) {
      this.bake(shown, this.readyFired ? 1 : 6);
      return;
    }
    if (this.cubes.length === 1 && this.atmWanted !== shown.atm) {
      this.cubes.push(this.newCube(this.atmWanted));
      this.atmFrom = shown.atm;
      this.atmTo = this.atmWanted;
      this.mix = 0;
    }
    if (this.cubes.length === 2) {
      const next = this.cubes[1];
      if (next.tiles < 24) { this.bake(next, 1); return; }
      this.mix = Math.min(1, this.mix + dt / ATMOS_FADE_S);
      if (this.mix >= 1) {
        shown.rt.dispose();
        this.cubes = [next];
        this.atmFrom = this.atmTo = next.atm;
      }
    }
  }

  // ── the Galaxy's points ──

  private buildGalaxy(nStars: number, nDust: number) {
    const R_SUN = GALACTIC_CENTRE_LY * LY_AU;
    const R_DISC = 50_000 * LY_AU;
    const rnd = (() => { let s = 12345; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const gauss = () => { const u = Math.max(rnd(), 1e-9), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const C = v3(GALACTIC_CENTRE).multiplyScalar(R_SUN);   // the centre, from the Sun
    const X = v3(GALACTIC_CENTRE), Y = v3(GALACTIC_Y), Z = v3(GALACTIC_NORTH);
    // Four arms as log spirals (pitch ~12°), two of them stronger; a bar in the middle.
    const armDensity = (r: number, th: number) => {
      const lr = Math.log(Math.max(r, 0.02));
      let d = 0;
      for (let k = 0; k < 4; k++) {
        const phase = (k * Math.PI) / 2 + lr / Math.tan((19 * Math.PI) / 180);
        const dth = Math.atan2(Math.sin(th - phase), Math.cos(th - phase));
        d += (k % 2 === 0 ? 1 : 0.55) * Math.exp(-(dth * dth) / (2 * 0.22 * 0.22));
      }
      return d;
    };
    const place = (count: number, dustLike: boolean) => {
      const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count);
      let i = 0, tries = 0;
      while (i < count && tries++ < count * 40) {
        // Exponential disc (surface density ∝ e^(−r/h), scale length h = 0.23 R ≈ 11 500 ly), thin.
        const r = -(Math.log(Math.max(rnd(), 1e-9)) + Math.log(Math.max(rnd(), 1e-9))) * 0.23 * (dustLike ? 0.9 : 1);
        if (r > 1.05) continue;
        const th = rnd() * 2 * Math.PI;
        const arms = armDensity(r, th + (dustLike ? 0.16 : 0));   // dust on the inner edges
        const bulge = Math.exp(-r / 0.07) * 1.2;
        const bar = Math.exp(-r / 0.2) * Math.exp(-Math.pow(Math.sin(th - 0.4), 2) / 0.08) * 0.8;
        const dens = dustLike ? arms * smoothstep(0.1, 0.2, r) : 0.1 + arms + bulge + bar;
        if (rnd() * 3.2 > dens) continue;
        const z = gauss() * (dustLike ? 0.006 : 0.012 + 0.05 * Math.exp(-r / 0.08));
        const p = C.clone().add(X.clone().multiplyScalar(Math.cos(th) * r * R_DISC)).add(Y.clone().multiplyScalar(Math.sin(th) * r * R_DISC)).add(Z.clone().multiplyScalar(z * R_DISC));
        pos.set([p.x, p.y, p.z], i * 3);
        if (dustLike) {
          col.set([0, 0, 0], i * 3);
          size[i] = 2.2 + rnd() * 2.2;
        } else {
          // Warm in the bulge, cool blue-white in the arms, soft yellow-white between.
          const inArm = Math.min(1, arms * 0.6);
          const warm: RGB = [1.0, 0.84, 0.6], cool: RGB = [0.62, 0.74, 1.0], mid: RGB = [0.9, 0.88, 0.82];
          const w = Math.exp(-r / 0.1);
          const c: RGB = [0, 0, 0];
          for (let k = 0; k < 3; k++) c[k] = (mid[k] * (1 - inArm) + cool[k] * inArm) * (1 - w) + warm[k] * w;
          const bright = 0.5 + rnd() * 0.8 + (rnd() < 0.03 ? 1.5 : 0);
          col.set([c[0] * bright * 0.42, c[1] * bright * 0.42, c[2] * bright * 0.42], i * 3);
          size[i] = 0.8 + rnd() * 1.0 + (bright > 2.0 ? 1.0 : 0.0);
        }
        i++;
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos.subarray(0, i * 3), 3));
      g.setAttribute("aColor", new BufferAttribute(col.subarray(0, i * 3), 3));
      g.setAttribute("aSize", new BufferAttribute(size.subarray(0, i), 1));
      return g;
    };
    return { stars: place(nStars, false), dust: place(nDust, true) };
  }

  // ── the day ──

  private updateEphemeris(orbits: number) {
    const now = this.liveClock ? this.baseJd + (performance.now() - this.t0) / 86_400_000 : this.baseJd;
    const earthJd = now + orbits * YEAR_DAYS;
    // Planets, the Moon: today — recomputed every frame the clock moves, so nothing the camera is anchored to
    // ever jumps (a minute of the Earth's motion is a sixth of the camera's distance from the Moon).
    if (now !== this.planetJd) {
      this.planetJd = now;
      this.earthNow = planetPosition("earth", now);
      const earthLon = Math.atan2(this.earthNow[1], this.earthNow[0]);
      for (const b of this.bodies) {
        if (b.id === "earth" || b.id === "moon") continue;
        if (b.id in ARRANGED_LON) {
          // On the flight line: the point of the planet's real orbit (of the day) nearest the wanted longitude.
          const want = earthLon + (ARRANGED_LON[b.id as keyof typeof ARRANGED_LON] * Math.PI) / 180;
          const pts = orbitPoints(b.id, now, 720);
          let best = 0, bestD = Infinity;
          for (let k = 0; k < 720; k++) {
            const lon = Math.atan2(pts[k * 3 + 1], pts[k * 3]);
            const d = Math.abs(Math.atan2(Math.sin(lon - want), Math.cos(lon - want)));
            if (d < bestD) { bestD = d; best = k; }
          }
          b.pos = [pts[best * 3], pts[best * 3 + 1], pts[best * 3 + 2]];
        } else {
          b.pos = planetPosition(b.id, now);
        }
      }
    }
    if (earthJd !== this.earthJd || orbits !== this.earthOrbits) {
      this.earthJd = earthJd;
      this.earthOrbits = orbits;
      // The Earth rides the end of its trail, which spirals out a hair per orbit so the years read as rings.
      this.earth.pos = vscale(planetPosition("earth", earthJd), 1 + orbits * RING_STEP);
      // The Moon: its real distance of the day, but always over the night side as a gibbous Moon (the hero and
      // the lift-off are composed around it; the real Moon would be anywhere, and dark half the month).
      // Anchored to where the Earth is today (not the Earth running its orbits to the next stop), so nothing
      // the camera looks at whirls.
      const moon = this.bodies.find((b) => b.id === "moon")!;
      moon.pos = vadd(this.earthNow, vscale(this.dirIn(MOON_DIR, "earthNow"), vlen(moonPosition(now))));
    }
  }

  /** World position of an anchor. */
  private anchorPos(a: Anchor): Vec3 {
    switch (a) {
      case "earth": return this.earth.pos;
      case "earthNow": return this.earthNow;
      case "sun": return [0, 0, 0];
      case "galaxy": return vscale(GALACTIC_CENTRE, 0.62 * GALACTIC_CENTRE_LY * LY_AU);   // between the Sun and the centre: the disc and the Sun both fit
      default: return this.bodies.find((b) => b.id === a)!.pos;
    }
  }

  /** Unit direction (lat, lon) of a frame, seen from an anchor (bodySun needs to know whose noon). */
  private dirIn(d: Direction, anchor: Anchor): Vec3 {
    switch (d.frame) {
      case "bodySun": {
        const p = this.anchorPos(anchor);
        if (vlen(p) < 1e-9) return this.dirIn({ ...d, frame: "ecliptic" }, anchor);
        const S = vnorm(vscale(p, -1));                 // toward the Sun
        const U = orthoUp([0, 0, 1], S);
        return inBasis(S, vcross(S, U), U, d.lat, d.lon);
      }
      case "earthMoon": {
        const moon = this.bodies.find((b) => b.id === "moon")!;
        const S = vnorm(vsub(moon.pos, this.earth.pos));
        const U = orthoUp([0, 0, 1], S);
        return inBasis(S, vcross(S, U), U, d.lat, d.lon);
      }
      case "ecliptic": return inBasis([1, 0, 0], [0, 1, 0], [0, 0, 1], d.lat, d.lon);
      case "galactic": return inBasis(GALACTIC_CENTRE, GALACTIC_Y, GALACTIC_NORTH, d.lat, d.lon);
    }
  }

  private camOf(k: Key): Vec3 {
    return vadd(this.anchorPos(k.anchor), vscale(this.dirIn(k.dir, k.anchor), k.dist));
  }

  /** Unit look direction of a key from the camera's current place (so a planet stays framed while it grows). */
  private lookOf(k: Key, cam: Vec3): Vec3 {
    const l: Look = k.look;
    if ("at" in l) {
      const rel = vsub(this.anchorPos(l.at), cam);
      return vlen(rel) < 1e-12 ? vscale(this.dirIn(k.dir, k.anchor), -1) : vnorm(rel);
    }
    return this.dirIn(l, k.anchor);
  }

  private upOf(k: Key): Vec3 {
    switch (k.up) {
      case "pole": return EARTH_POLE;
      case "ecliptic": return [0, 0, 1];
      case "galactic": return GALACTIC_NORTH;
      case "centre": return GALACTIC_CENTRE;   // the Galaxy's centre up, the Sun low in the frame
    }
  }

  /**
   * The camera at progress s: between two keys it flies the straight line
   * from one to the other, leaving and arriving on a log scale (journey.ts
   * bilog), looking from where it is toward what each key looks at.
   */
  private poseAt(s: number): Pose {
    const { i, f } = segmentAt(s);
    const A = KEYS[i], B = KEYS[i + 1];
    const u = flightEase(f);
    const orbits = orbitsAt(s);
    this.updateEphemeris(orbits);
    const portrait = this.width < this.height;

    // The camera never quite stands still: it glides along its orbit of the subject (ISS pace in the hero), and
    // through the hero's content it slides with the scroll — then keeps that offset, so the leg starts where the
    // hold ended (no jump at the section's end).
    const heroH = s > 1e-4 ? 1 : this.hold;
    const drift = (k: Key): Key => {
      const lon = k.dir.lon + this.time * (k.at === 0 ? 0.08 : 0.02) + (k.at === 0 ? heroH * 6 : 0);
      // "When I'm gone": the hero's camera eases back a little as the rings dissolve.
      return { ...k, dir: { ...k.dir, lon }, dist: k.dist * (k.at === 0 ? (1 + 0.12 * heroH) * (1 + 0.15 * this.gone) : 1) };
    };
    const pA = this.camOf(drift(A)), pB = this.camOf(drift(B));
    const L = vlen(vsub(pB, pA));
    const w = L < 1e-12 ? u : bilog(u, A.dist / L, B.dist / L);
    // One curve through the keys (each hop rounded with the neighbours as tangents), walked with the zoom
    // profile w: the camera rounds each key instead of kinking, so a planet in frame only grows and glides.
    const P = KEYS[Math.max(0, i - 1)], N = KEYS[Math.min(KEYS.length - 1, i + 2)];
    const p0 = i > 0 ? this.camOf(drift(P)) : pA, p3 = i + 2 < KEYS.length ? this.camOf(drift(N)) : pB;
    let cam = roundedHop(p0, pA, pB, p3, w);
    if (!cam.every(Number.isFinite)) cam = lerp3(pA, pB, w);
    // The look turns from A's subject to B's with the same easing as the flight (a slerp, zero rate at both ends).
    // The look turns only between the two keys' own looks (each fixed at its key: where the camera will stand,
    // toward what it frames there) — never after a body the camera has passed. So a planet left behind slides
    // out at the edge, the next one comes in from the other edge and grows into its place, and the view turns
    // just the few degrees between two framings. The one turn back (the Galaxy → home) goes by way of the Sun.
    const lookA = this.lookOf(A, pA), lookB = this.lookOf(B, pB);
    const look = vdot(lookA, lookB) < -0.6
      ? (u < 0.5 ? slerp(lookA, vnorm(vscale(cam, -1)), u * 2) : slerp(vnorm(vscale(cam, -1)), lookB, u * 2 - 1))
      : slerp(lookA, lookB, u);
    const up = slerp(this.upOf(A), this.upOf(B), u);
    const oA = portrait ? A.offsetPhone : A.offset, oB = portrait ? B.offsetPhone : B.offset;
    const offset: [number, number] = [oA[0] + (oB[0] - oA[0]) * u, oA[1] + (oB[1] - oA[1]) * u];
    return {
      cam, look, up, offset, orbits, dim: A.dim + (B.dim - A.dim) * u, stars: A.stars + (B.stars - A.stars) * u,
      trail: trailFadeAt(s), travel: f, section: Math.floor(A.at),
    };
  }

  // ── frame ──

  private frame = (now: number) => {
    if (this.disposed) return;
    if (this.running) this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.lastDt = dt;
    this.time += this.opts.reducedMotion ? dt * 0.3 : dt;
    this.measure(dt);

    this.updateAtmosphere(dt);
    if (this.cubes[0].tiles < 24) return;

    if (this.opts.reducedMotion) this.stepReduced(dt);
    else this.smooth += (this.target - this.smooth) * (1 - Math.exp(-dt / SCROLL_LAG_S));
    this.hold += (this.holdTarget - this.hold) * (1 - Math.exp(-dt / SCROLL_LAG_S));
    const k = 1 - Math.exp(-dt / 0.9);
    this.pointer.sx += (this.pointer.x - this.pointer.sx) * k;
    this.pointer.sy += (this.pointer.y - this.pointer.sy) * k;

    // Textures for what's coming.
    if (this.smooth > 0.3) this.loadGroup("moon");
    if (this.smooth > 1.2) this.loadGroup("planets");

    this.render();
    if (!this.readyFired && this.earthReady()) {
      this.readyFired = true;
      this.opts.onReady();
    }
  };

  private stepReduced(dt: number) {
    const r = this.reduced;
    const want = Math.round(this.target);
    if (r.phase === "idle" && want !== r.shown) { r.phase = "out"; r.t = 0; }
    if (r.phase === "out") {
      r.t += dt / REDUCED_FADE_S;
      if (r.t >= 1) { r.shown = Math.round(this.target); this.smooth = r.shown; r.phase = "in"; r.t = 0; }
    } else if (r.phase === "in") {
      r.t += dt / REDUCED_FADE_S;
      if (r.t >= 1) r.phase = "idle";
    }
    this.veilMat.uniforms.uA.value = r.phase === "out" ? clamp01(r.t) : r.phase === "in" ? 1 - clamp01(r.t) : 0;
  }

  private measure(dt: number) {
    this.frameMs += (dt * 1000 - this.frameMs) * 0.1;
    const w = this.window;
    w.frames++;
    w.time += dt;
    if (this.bench) {
      this.bench.t += dt;
      this.bench.dts.push(dt);
      const sec = Math.min(JOURNEY.length - 1, Math.round(this.smooth));
      const arr = this.bench.bySection.get(sec) ?? [];
      arr.push(dt);
      this.bench.bySection.set(sec, arr);
    }
    if (w.time < 1) return;
    this.fps = w.frames / w.time;
    const avg = w.time / w.frames;
    w.frames = 0;
    w.time = 0;
    this.scaleCooldown = Math.max(0, this.scaleCooldown - 1);
    if (this.scaleCooldown > 0 || !this.readyFired) return;
    if (avg > 0.022 && this.scaleStep < SCALES.length - 1) {
      this.scaleStep++;
      this.scaleCooldown = 2;
      w.goodWindows = 0;
      this.applyScale();
    } else if (avg < 0.0175 && this.scaleStep > 0) {
      if (++w.goodWindows >= 5) {
        this.scaleStep--;
        this.scaleCooldown = 3;
        w.goodWindows = 0;
        this.applyScale();
      }
    } else {
      w.goodWindows = 0;
    }
  }

  private render() {
    const p = this.poseAt(this.smooth);
    this.lastPose = p;
    const cam = this.camera;
    const r = this.renderer;

    // ── the camera: at the origin, looking at the target with it placed at the shot's offset ──
    const look = p.look;
    const up = orthoUp(p.up, look);
    const m = new Matrix4().lookAt(new Vector3(), v3(look), v3(up));   // camera basis with −z toward the target
    const q = new Quaternion().setFromRotationMatrix(m);
    const ty = Math.tan((cam.fov * Math.PI) / 360), tx = ty * cam.aspect;
    // Offsets are given for a 16:9 (landscape) or 9:16 (portrait) frame; other aspects see the same
    // picture cropped at the sides, exactly like the stills (fitted to the height, centred).
    const ref = this.width < this.height ? 9 / 16 : 16 / 9;
    const d = new Vector3((p.offset[0] + this.sealLook[0]) * (ref / cam.aspect) * tx, (p.offset[1] + this.sealLook[1]) * ty, -1).normalize();
    q.multiply(new Quaternion().setFromUnitVectors(d, new Vector3(0, 0, -1)));
    // Pointer: a slow turn of at most 1.5°; at rest a breath.
    const settled = Math.abs(this.target - this.smooth) < 1e-3 && !this.opts.reducedMotion;
    const breath = settled ? Math.sin(this.time * ((2 * Math.PI) / 9)) * 0.0004 : 0;
    const yaw = this.opts.reducedMotion ? 0 : this.pointer.sx * POINTER_MAX;
    const pitch = this.opts.reducedMotion ? 0 : -this.pointer.sy * POINTER_MAX * 0.6 + breath;
    q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -yaw)).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch));
    cam.position.set(0, 0, 0);
    cam.quaternion.copy(q);
    cam.updateMatrixWorld();
    const pxAngle = (2 * ty) / this.height;   // radians per CSS pixel at the centre

    const camDistSun = vlen(p.cam);
    const camLog = Math.log10(Math.max(camDistSun, 1e-9));
    // Leaving the neighbourhood: the band (the Milky Way as seen from here) fades from ~300 ly, the Galaxy's
    // disc fades in; the stars themselves stay until the disc as a whole takes over.
    const neighbourhood = 1 - smoothstep(Math.log10(300 * LY_AU), Math.log10(6000 * LY_AU), camLog);
    const starsNear = 1 - smoothstep(Math.log10(4000 * LY_AU), Math.log10(40_000 * LY_AU), camLog);
    const galaxyOn = smoothstep(Math.log10(30 * LY_AU), Math.log10(20_000 * LY_AU), camLog);

    // ── sky ──
    const rot = new Matrix4().extractRotation(cam.matrixWorld);
    const scale = new Matrix4().set(tx, 0, 0, 0, 0, ty, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0);
    const su = this.skyMat.uniforms;
    su.uViewDir.value.multiplyMatrices(rot, scale);
    su.uCubeA.value = this.cubes[0].rt.texture;
    su.uCubeB.value = (this.cubes[1] ?? this.cubes[0]).rt.texture;
    const mixv = this.cubes.length === 2 && this.cubes[1].tiles >= 24 ? easeInOut(this.mix) : 0;
    su.uMix.value = mixv;
    const from = ATMOS[this.atmFrom], to = ATMOS[this.atmTo];
    su.uMilky.value = from.milky + (to.milky - from.milky) * mixv;
    su.uBand.value = neighbourhood;
    su.uDim.value = p.dim;

    // ── stars ──
    const st = this.starMat.uniforms;
    st.uCam.value.set(p.cam[0], p.cam[1], p.cam[2]);
    st.uTime.value = this.time;
    st.uDim.value = p.dim * p.stars * starsNear;
    st.uMagLimit.value = from.mag + (to.mag - from.mag) * mixv;

    // ── the Galaxy ──
    this.galaxy.visible = this.dust.visible = galaxyOn > 0.001;
    this.galaxyMat.uniforms.uAlpha.value = galaxyOn * p.dim;
    this.dustMat.uniforms.uAlpha.value = galaxyOn;
    this.galaxy.position.set(-p.cam[0], -p.cam[1], -p.cam[2]);
    this.dust.position.copy(this.galaxy.position);

    // ── bodies, relative to the camera ──
    const exposure = 1;
    const erel = vsub(this.earth.pos, p.cam);
    const edist = vlen(erel);
    // Orbit lines show once the camera stands well back from the Earth, and fade again when the orbit is a speck.
    const orbitsNear = smoothstep(0.012, 0.25, edist);
    // Beyond ~1500 au the planets stop being points of their own; the Sun's glare stands for the system.
    const systemNear = 1 - smoothstep(Math.log10(800), Math.log10(4000), camLog);
    for (const b of this.bodies) {
      const rel = vsub(b.pos, p.cam);
      const dist = vlen(rel);
      const px = (b.radius / dist) / pxAngle;                  // apparent radius in CSS px
      const mesh = b.mesh;
      mesh.position.set(rel[0], rel[1], rel[2]);
      mesh.scale.set(b.radius, b.radius * (1 - b.flat), b.radius);
      // Orientation: local +y is the pole; Greenwich (local +x) for the Earth, else the pole only.
      const axis = b.axis;
      let east = b.id === "earth" ? greenwichDirection(J2000) : orthoUp([1, 0, 0], axis);
      if (b.id === "earth") {
        // A visible turn on screen (one in four minutes): the real day would read as a still, so the turn
        // starts from a chosen face rather than the hour's.
        const spin = ((this.opts.spin0 ?? EARTH_SPIN0) * Math.PI) / 180 + (this.time * 2 * Math.PI) / EARTH_SPIN_S;
        const r = v3(east).applyQuaternion(new Quaternion().setFromAxisAngle(v3(axis), spin));
        east = [r.x, r.y, r.z];
      }
      const z = vcross(east, axis);
      mesh.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(v3(east), v3(axis), v3(z)));
      mesh.visible = px > 0.35 && dist > b.radius * 1.001;
      mesh.updateMatrixWorld();
      let sunDir = vnorm(vscale(b.pos, -1));
      if (b.id === "moon") {
        // Lift-off is a hero moment, not a textbook: near the Moon a fill light from the camera's side keeps its face lit.
        const fill = smoothstep(0.25, 0.6, this.smooth) * (1 - smoothstep(1.2, 1.7, this.smooth));
        if (fill > 0) sunDir = vnorm(vadd(sunDir, vscale(vnorm(vscale(rel, -1)), 1.4 * fill)));
      }
      const u = b.mat.uniforms;
      u.uSun.value.set(sunDir[0], sunDir[1], sunDir[2]);
      if (b.id === "moon") {
        // The Earth's shadow on the Moon (lunar eclipses), body-centred.
        const c = vsub(this.earth.pos, b.pos);
        u.uCaster.value.set(c[0], c[1], c[2]);
        u.uCasterR.value = this.earth.radius;
      }
      u.uExposure.value = exposure;
      if (b.id !== "earth") u.uCentre.value.set(rel[0], rel[1], rel[2]);
      if (b.ring && b.ringMat) {
        b.ring.position.copy(mesh.position);
        b.ring.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), v3(axis));
        b.ring.visible = px > 0.6;
        const ru = b.ringMat.uniforms;
        ru.uSun.value.copy(u.uSun.value);
        ru.uCentre.value.copy(u.uCentre.value);
        ru.uNormal.value.set(axis[0], axis[1], axis[2]);
        u.uRingNormal.value.copy(ru.uNormal.value);
      }
      // Marker: readable when the disc would be too small.
      this.markerAlpha[b.marker] = smoothstep(3.2, 1.2, px) * p.dim * (b.id === "moon" ? 0.4 : 1) * (dist > 1e-6 ? 1 : 0) * systemNear;
      (this.markers.geometry.attributes.position as BufferAttribute).setXYZ(b.marker, rel[0], rel[1], rel[2]);
      // Orbit line: shows once the camera stands well back from it, fades again when it is a speck.
      if (b.orbitMat && b.orbit && b.a) {
        const ratio = camDistSun / b.a;
        // Faint lines in the background at the stops only, never the subject of a shot.
        const alpha = orbitsNear * smoothstep(0.03, 0.6, ratio) * smoothstep(900, 60, ratio) * 0.14 * p.dim * p.trail;
        b.orbitMat.uniforms.uAlpha.value = alpha;
        b.orbit.visible = alpha > 0.002;
        b.orbit.position.set(-p.cam[0], -p.cam[1], -p.cam[2]);
      }
    }
    (this.markers.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    (this.markers.geometry.attributes.aAlpha as BufferAttribute).needsUpdate = true;

    // The Earth's layers.
    const e = this.earth;
    const epx = (e.radius / edist) / pxAngle;
    const eSun = vnorm(vscale(e.pos, -1));
    this.earthMat.uniforms.uCentre.value.set(erel[0], erel[1], erel[2]);
    this.earthMat.uniforms.uCloudShift.value = (this.time * CLOUD_DRIFT) % 1;
    {
      // The Moon's shadow on the Earth (solar eclipses), Earth-centred.
      const moon = this.bodies.find((b) => b.id === "moon")!;
      const m = vsub(moon.pos, e.pos);
      this.earthMat.uniforms.uMoon.value.set(m[0], m[1], m[2]);
    }
    this.earthMat.uniforms.uNightLift.value = 0.2;
    this.cloudsMat.uniforms.uSun.value.set(eSun[0], eSun[1], eSun[2]);
    this.cloudsMat.uniforms.uCloudShift.value = this.earthMat.uniforms.uCloudShift.value;
    this.clouds.position.copy(e.mesh.position);
    this.clouds.quaternion.copy(e.mesh.quaternion);
    this.clouds.scale.setScalar(e.radius * (1 + 9 / 6371));
    this.clouds.visible = epx > 3;
    this.atmo.position.copy(e.mesh.position);
    this.atmo.scale.setScalar(e.radius * (1 + 100 / 6371));
    this.atmo.visible = epx > 2;
    const au = this.atmoMat.uniforms;
    au.uCentre.value.set(erel[0], erel[1], erel[2]);
    au.uSun.value.set(eSun[0], eSun[1], eSun[2]);

    // The Sun and its corona: the disc, and a glare that stays a few pixels wide from any distance.
    const srel = vscale(p.cam, -1);
    const sdist = camDistSun;
    const spx = (SUN_R / sdist) / pxAngle;
    this.sun.position.set(srel[0], srel[1], srel[2]);
    // Beyond a light-year the Sun is one star among the others: the glare goes, an amber marker takes over.
    const sunStar = 1 - smoothstep(Math.log10(0.4 * LY_AU), Math.log10(25 * LY_AU), camLog);
    this.sun.visible = spx > 0.4 && sunStar > 0.001;
    this.sunMat.uniforms.uTime.value = this.time;
    const glarePx = Math.max(spx * 7, 56);
    const glare = glarePx * pxAngle * sdist;
    this.corona.position.copy(this.sun.position);
    this.corona.scale.set(glare * 2, glare * 2, 1);
    this.corona.visible = sunStar > 0.001;
    const cu = this.coronaMat.uniforms;
    cu.uDisc.value = Math.min(spx / glarePx, 0.9);
    cu.uTime.value = this.time;
    cu.uIntensity.value = (0.8 + 0.5 * smoothstep(0, 40, spx)) * p.dim * sunStar;
    const sunMarker = 9;
    this.markerAlpha[sunMarker] = smoothstep(Math.log10(1 * LY_AU), Math.log10(30 * LY_AU), camLog) * p.dim;
    (this.markers.geometry.attributes.position as BufferAttribute).setXYZ(sunMarker, srel[0], srel[1], srel[2]);
    (this.markers.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    (this.markers.geometry.attributes.aAlpha as BufferAttribute).needsUpdate = true;

    // The trail.
    this.trailMat.uniforms.uOrbits.value = p.orbits;
    this.trailMat.uniforms.uFade.value = p.trail * p.dim * smoothstep(0.012, 0.25, edist) * smoothstep(400, 150, camDistSun);
    this.trail.visible = this.trailMat.uniforms.uFade.value > 0.002;
    this.trail.position.set(-p.cam[0], -p.cam[1], -p.cam[2]);

    this.updateLights(p, q, tx, ty, pxAngle);

    // ── draw ──
    r.setRenderTarget(null);
    r.clear();
    r.render(this.skyScene, this.quadCam);
    r.render(this.farScene, cam);
    r.clearDepth();
    r.render(this.world, cam);
    r.render(this.lightScene, this.quadCam);
    if (this.veilMat.uniforms.uA.value > 0.001) r.render(this.veilScene, this.quadCam);
  }

  /**
   * The message's light: a point of amber that flies a little ahead of the
   * camera, leaves sparks behind (each fading on its own, so the trail is
   * particles, not a line), and at a stop settles where the sample text
   * begins and pulses. And the dust: motes in a cube around the camera,
   * moved against its motion and wrapped, so every flight has depth.
   */
  private updateLights(p: Pose, q: Quaternion, tx: number, ty: number, pxAngle: number) {
    const dt = Math.max(1e-3, this.lastDt);
    // ── the year rings (hero only) ──
    this.yearsNow += (this.yearsWant - this.yearsNow) * (1 - Math.exp(-dt / 0.25));
    this.gone += (this.goneWant - this.gone) * (1 - Math.exp(-dt / 0.6));
    const inHero = 1 - smoothstep(0.05, 0.35, this.smooth);
    this.yearsMat.uniforms.uCount.value = this.yearsNow;
    this.yearsMat.uniforms.uGone.value = this.gone;
    this.yearsMat.uniforms.uAlpha.value = 0.5 * inHero * p.dim;
    this.years.visible = inHero > 0.01 && this.yearsNow > 0.02;
    this.years.position.copy(this.earth.mesh.position);
    this.years.quaternion.copy(this.earth.mesh.quaternion);
    this.years.scale.setScalar(this.earth.radius);
    // The seal ends when the hero is left behind.
    if (this.seal && this.smooth > 0.35) this.seal = null;
    const moved = this.prevCam ? vsub(p.cam, this.prevCam) : [0, 0, 0] as Vec3;
    const v = vlen(moved) / dt;                          // au per second
    this.speed += (v - this.speed) * (1 - Math.exp(-dt / 0.25));
    // The local scale: how far the nearest body is.
    let nearD = vlen(p.cam);
    for (const b of this.bodies) nearD = Math.min(nearD, vlen(vsub(b.pos, p.cam)));
    const portrait = this.width < this.height;
    const ref = portrait ? 9 / 16 : 16 / 9;

    // ── the filament ──
    const f = this.fil;
    const settled = Math.abs(this.target - this.smooth) < 1e-3;
    // In flight the light rides low on the right (desktop) or high on the right (phone), clear of the text columns.
    // Text on screen: the light rests where the page says it is clear of every word, and its tail is folded away.
    // A spot that moves far (the words have scrolled into it) is reached by a blink — out, across, in — so the
    // light's path never crosses the words either.
    const raw = this.seal ? null : this.anchorNdc;
    const hidden = raw !== null && Number.isNaN(raw[0]);   // words everywhere: no place for the light
    const a = raw && !hidden ? raw : null;
    this.textOn += ((raw ? 1 : 0) - this.textOn) * (1 - Math.exp(-dt / 0.15));
    if (a && (!this.lastAnchor || Math.hypot(a[0] - this.lastAnchor[0], a[1] - this.lastAnchor[1]) > 0.04)) {
      if (this.blinkT >= 0.11) this.blinkT = 0;   // out again at once (if already on the way out, carry on)
      this.pendingNdc = a;
    }
    if (a) this.lastAnchor = a;
    this.blinkT += dt;
    if (this.pendingNdc && this.blinkT >= 0.07) { f.ndc[0] = this.pendingNdc[0]; f.ndc[1] = this.pendingNdc[1]; this.pendingNdc = null; }
    const blinkVis = this.blinkT < 0.07 ? 1 - this.blinkT / 0.07 : this.blinkT < 0.11 ? 0 : Math.min(1, (this.blinkT - 0.11) / 0.25);
    this.hideT += ((hidden ? 1 : 0) - this.hideT) * (1 - Math.exp(-dt / (hidden ? 0.035 : 0.12)));
    this.coreVis = blinkVis * (1 - this.hideT);
    // In flight the light rides low on the right (phone: high on the right) — unless a planet is there: then the
    // next corner, so it never sits on a disc.
    // (Hidden: it stays where it faded out, so it never drifts across the words on its way to the flight spot.)
    const want: [number, number] = a ?? (hidden ? [f.ndc[0], f.ndc[1]] : this.flightSpot(portrait, tx, ty));
    const k = 1 - Math.exp(-dt / 0.35);
    if (!this.pendingNdc) {
      f.ndc[0] += (want[0] - f.ndc[0]) * k;
      f.ndc[1] += (want[1] - f.ndc[1]) * k;
    }
    // Ahead by a few seconds of flight, but always within the local scale (never beyond the nearest body).
    // ── the sealing: the light's place is scripted ──
    let sealWorld: Vec3 | null = null;
    let sealScreen: [number, number] | null = null;
    if (this.seal) {
      const S = this.seal;
      S.t += this.opts.reducedMotion && !S.done ? SEAL_ORBIT : dt;
      const E = this.earth.pos, R = this.earth.radius;
      const surface = vadd(E, vscale(S.n, R * 1.01));
      const toNdc = (w: Vec3): [number, number] => {
        const v = new Vector3(w[0] - p.cam[0], w[1] - p.cam[1], w[2] - p.cam[2]).project(this.camera);
        return [v.x / (ref / this.camera.aspect), v.y];
      };
      let appear = 1;
      if (S.t < SEAL_GATHER) {
        appear = 0;                                                      // the words are gathering in the card
      } else if (S.t < SEAL_ARRIVE) {
        appear = (S.t - SEAL_GATHER) / (SEAL_ARRIVE - SEAL_GATHER);      // it shows on the ground
        sealWorld = surface;
      } else if (S.t < SEAL_LIFT) {
        const u = easeInOut((S.t - SEAL_ARRIVE) / (SEAL_LIFT - SEAL_ARRIVE));
        sealWorld = vadd(E, vscale(S.n, R * (1.01 + (SEAL_ORBIT_R - 1.01) * u)));
        if (this.ringT > 5 && S.t - dt < SEAL_ARRIVE) { this.ringT = 0; this.flash = 1; }   // lift-off: a flash and a ring
      } else {
        const u = S.t < SEAL_ORBIT ? easeInOut((S.t - SEAL_LIFT) / (SEAL_ORBIT - SEAL_LIFT)) : 1;
        S.theta = (Math.PI / 3) * u + (S.t > SEAL_ORBIT ? (S.t - SEAL_ORBIT) * 0.22 : 0);
        sealWorld = vadd(E, vscale(vadd(vscale(S.n, Math.cos(S.theta)), vscale(S.e, Math.sin(S.theta))), R * SEAL_ORBIT_R));
        S.done = true;
      }
      if (sealWorld) sealScreen = toNdc(sealWorld);
      if (sealScreen) {
        f.ndc[0] = sealScreen[0]; f.ndc[1] = sealScreen[1];
        this.pendingNdc = null; this.hideT = 0; this.blinkT = 9;
      }
      this.coreVis = appear;
      void S.from;
      // The camera follows the light a little once it has left the ground.
      const follow = S.t > SEAL_ARRIVE ? smoothstep(SEAL_ARRIVE, SEAL_LIFT, S.t) : 0;
      const target: [number, number] = sealScreen ? [sealScreen[0] * 0.08 * follow, sealScreen[1] * 0.08 * follow] : [0, 0];
      this.sealLook[0] += (target[0] - this.sealLook[0]) * (1 - Math.exp(-dt / 0.8));
      this.sealLook[1] += (target[1] - this.sealLook[1]) * (1 - Math.exp(-dt / 0.8));
    } else {
      this.sealLook[0] *= Math.exp(-dt / 0.8); this.sealLook[1] *= Math.exp(-dt / 0.8);
    }
    const wantDepth = Math.min(Math.max(this.speed * 2.5, 0.015 * nearD), 0.3 * nearD);
    f.depth = f.depth <= 0 ? wantDepth : Math.exp(Math.log(f.depth) + (Math.log(wantDepth) - Math.log(f.depth)) * (1 - Math.exp(-dt / 0.8)));
    const d = new Vector3(f.ndc[0] * (ref / this.camera.aspect) * tx, f.ndc[1] * ty, -1).normalize().applyQuaternion(q);
    f.world = sealWorld ?? vadd(p.cam, vscale([d.x, d.y, d.z], f.depth));
    const relF = vsub(f.world, p.cam);
    (this.filament.geometry.attributes.position as BufferAttribute).setXYZ(0, relF[0], relF[1], relF[2]);
    (this.filament.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    const still = 1 - smoothstep(0.002, 0.02, this.speed / Math.max(nearD, 1e-12));
    f.pulse = still;
    // The core breathes (1.5 s); its sprite is a bloom around a disc that never drops under ~8 px.
    const beat = 1 + (0.12 + 0.22 * still) * (0.5 + 0.5 * Math.sin(this.time * (2 * Math.PI / 1.5)));
    this.filamentMat.uniforms.uSize.value = 64 * beat;
    this.filamentMat.uniforms.uPx.value = this.sparkMat.uniforms.uPx.value = this.flowMat.uniforms.uPx.value = this.markerMat.uniforms.uPx.value;

    // ── the arrival: when the light settles at a stop it flares and sends out one ring ──
    const atStop = settled && Math.abs(this.smooth - Math.round(this.smooth)) < 1e-3;
    if (atStop && !this.wasSettled) { this.ringT = 0; this.flash = 1; }
    this.wasSettled = atStop;
    this.flash *= Math.exp(-dt / 0.5);
    this.ringT += dt;
    this.filamentMat.uniforms.uAlpha.value = (0.9 + 0.1 * still + 1.3 * this.flash) * p.dim * this.coreVis;
    const ref2 = ref / this.camera.aspect;
    this.ringMat.uniforms.uCentre.value.set(f.ndc[0] * ref2, f.ndc[1]);
    const ringR = (16 + 150 * smoothstep(0, 0.9, this.ringT)) / this.height * 2;
    this.ringMat.uniforms.uRadius.value.set(ringR * (this.height / this.width), ringR);
    this.ringMat.uniforms.uAlpha.value = this.ringT < 0.9 ? 0.75 * Math.pow(1 - this.ringT / 0.9, 1.4) * p.dim : 0;
    this.ring.visible = this.ringT < 0.9;

    // ── the sparks: a few around the core, short-lived (an accent, not the trail) ──
    if (this.time - this.sparkLast > 0.06) {
      this.sparkLast = this.time;
      const i = this.sparkHead;
      this.sparkHead = (i + 1) % SPARKS;
      const jitter = f.depth * 0.035;
      const r1 = Math.sin(i * 12.9898) * 0.5, r2 = Math.sin(i * 78.233) * 0.5, r3 = Math.sin(i * 37.719) * 0.5;
      this.sparkWorld[i * 3] = f.world[0] + r1 * jitter;
      this.sparkWorld[i * 3 + 1] = f.world[1] + r2 * jitter;
      this.sparkWorld[i * 3 + 2] = f.world[2] + r3 * jitter;
      this.sparkBirth[i] = this.time;
    }
    const spos = this.sparks.geometry.attributes.position as BufferAttribute;
    const sage = this.sparks.geometry.attributes.aAge as BufferAttribute;
    for (let i = 0; i < SPARKS; i++) {
      const age = this.time - this.sparkBirth[i];
      sage.setX(i, age > SPARK_LIFE ? -1 : age);
      if (age <= SPARK_LIFE) spos.setXYZ(i, this.sparkWorld[i * 3] - p.cam[0], this.sparkWorld[i * 3 + 1] - p.cam[1], this.sparkWorld[i * 3 + 2] - p.cam[2]);
    }
    spos.needsUpdate = sage.needsUpdate = true;

    // ── the ribbon: one strip of fixed length and width (the Mars fly-by is the reference everywhere), trailing
    // from the core along the direction the scene streams (the light's past places projected into this frame,
    // low-passed), straight — so it never hooks on a turn — and only while the camera really flies ──
    {
      const h = this.history;
      for (let k = Math.min(this.historyLen, RIBBON - 1); k > 0; k--) { h[k * 3] = h[(k - 1) * 3]; h[k * 3 + 1] = h[(k - 1) * 3 + 1]; h[k * 3 + 2] = h[(k - 1) * 3 + 2]; }
      h[0] = f.world[0]; h[1] = f.world[1]; h[2] = f.world[2];
      this.historyLen = Math.min(this.historyLen + 1, RIBBON);
      const W = this.width, H = this.height;
      const v = new Vector3();
      const fwd = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const proj = (k: number): [number, number] | null => {
        v.set(h[k * 3] - p.cam[0], h[k * 3 + 1] - p.cam[1], h[k * 3 + 2] - p.cam[2]);
        if (v.dot(fwd) <= 0) return null;
        v.project(this.camera);
        return [v.x * W / 2, v.y * H / 2];
      };
      const o = proj(0) ?? [0, 0];
      const back = this.historyLen > 8 ? proj(8) : null;
      const orbiting = this.seal && this.seal.t >= SEAL_LIFT ? 0.8 : 0;
      const flight = Math.max(orbiting, smoothstep(0.012, 0.05, this.speed / Math.max(nearD, 1e-12)) * (1 - this.textOn) * this.coreVis);
      if (back) {
        let dx = back[0] - o[0], dy = back[1] - o[1];
        const dl = Math.hypot(dx, dy);
        if (dl > 0.5) {
          dx /= dl; dy /= dl;
          const k = 1 - Math.exp(-dt / 0.35);
          this.tailDir[0] += (dx - this.tailDir[0]) * k;
          this.tailDir[1] += (dy - this.tailDir[1]) * k;
        }
      }
      const tl = Math.hypot(this.tailDir[0], this.tailDir[1]) || 1;
      const tx = this.tailDir[0] / tl, ty = this.tailDir[1] / tl;
      const len = RIBBON_LEN * H;
      const alpha = 0.95 * flight * p.dim;
      const rp = this.ribbon.geometry.attributes.position as BufferAttribute;
      const ra = this.ribbon.geometry.attributes.aA as BufferAttribute;
      for (let k = 0; k < RIBBON; k++) {
        const t = k / (RIBBON - 1);
        const x = o[0] + tx * len * t, y = o[1] + ty * len * t;
        const width = RIBBON_WIDTH * Math.pow(1 - t, 0.8) * 0.5;
        const nx = -ty * width, ny = tx * width;
        rp.setXYZ(k * 2, (x + nx) / (W / 2), (y + ny) / (H / 2), 0);
        rp.setXYZ(k * 2 + 1, (x - nx) / (W / 2), (y - ny) / (H / 2), 0);
        const a = Math.pow(1 - t, 1.6);
        ra.setX(k * 2, a); ra.setX(k * 2 + 1, a);
      }
      rp.needsUpdate = ra.needsUpdate = true;
      this.ribbonMat.uniforms.uAlpha.value = alpha;
      this.ribbon.visible = alpha > 0.002;
      this.tailLen = alpha > 0.002 ? len : 0;
      this.tailPx = [o[0] + W / 2, H / 2 - o[1]];
    }

    // ── the dust ──
    const wantL = Math.max(this.speed * 4, 0.3 * nearD);
    this.flowL = this.flowL <= 0 ? wantL : Math.exp(Math.log(this.flowL) + (Math.log(wantL) - Math.log(this.flowL)) * (1 - Math.exp(-dt / 1.2)));
    const L = this.flowL;
    const loc = this.flowLocal;
    const dx = moved[0] / L, dy = moved[1] / L, dz = moved[2] / L;
    const wrap = (x: number) => x - Math.floor(x + 0.5);
    for (let i = 0; i < loc.length; i += 3) {
      loc[i] = wrap(loc[i] - dx);
      loc[i + 1] = wrap(loc[i + 1] - dy);
      loc[i + 2] = wrap(loc[i + 2] - dz);
    }
    (this.flow.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    this.flowMat.uniforms.uL.value = L;
    this.flowMat.uniforms.uAlpha.value = 0.6 * p.dim;
    void pxAngle;
    void ref2;
    this.prevCam = p.cam;
  }
}

