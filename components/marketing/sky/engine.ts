// The landing's sky: one Three.js scene behind the whole page, the camera
// flown by scroll progress through the waypoints in journey.ts. Imported
// dynamically by SkyStage after the first paint (Three is not in the main
// bundle).

import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CubeCamera,
  CustomBlending,
  LinearFilter,
  Matrix4,
  Mesh,
  NormalBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from "three";
import type { Catalog } from "./catalog";
import { STOP_STARS } from "./catalog";
import { JOURNEY, clamp01, coronaNearness, easeInOut, logLeg, type WaypointId } from "./journey";
import { starColor, type RGB } from "./starColor";
import {
  CORONA_FRAG, CORONA_VERT, MEADOW_FRAG, MOTE_FRAG, MOTE_VERT, PLANET_FRAG, PLANET_VERT,
  QUAD_VERT, SKYGEN_FRAG, SKYGEN_VERT, SKY_FRAG, SKY_VERT, STAR_FRAG, STAR_VERT,
} from "./shaders";

export type SkyAtmosphere = "nebula" | "sunset" | "ocean" | "midnight" | "stars";

// What each atmosphere changes: the nebulae's two tints and amount, the
// Milky Way's strength and how faint a star still shows. Never text colour.
const ATMOS: Record<SkyAtmosphere, { a: RGB; b: RGB; amt: number; scale: number; milky: number; mag: number }> = {
  nebula: { a: [0.2, 0.3, 0.6], b: [0.32, 0.38, 0.66], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  sunset: { a: [0.7, 0.4, 0.17], b: [0.46, 0.25, 0.13], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  ocean: { a: [0.1, 0.52, 0.52], b: [0.14, 0.32, 0.56], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  midnight: { a: [0.17, 0.2, 0.44], b: [0.11, 0.13, 0.32], amt: 0.75, scale: 1.4, milky: 0.7, mag: 7.0 },
  stars: { a: [0, 0, 0], b: [0, 0, 0], amt: 0, scale: 2.2, milky: 1.15, mag: 8.6 },
};

const MAX_DPR = 1.5;
const SCALES = [1, 0.83, 0.66];
const ATMOS_FADE_S = 1.2;
const REDUCED_FADE_S = 0.6;
const POINTER_MAX = (1.5 * Math.PI) / 180;   // the mouse turns the view by 1.5° at most
const SCROLL_LAG_S = 0.28;                   // ≈ a 0.8 s scrub: the camera floats, never jerks
const STANDOFF = 0.0006;                     // parsecs from a stop star (≈ 120 au)

// Corona per stop: angular size (rad) and intensity at the stop, whitening of the colour.
const STOP_LOOK: Record<string, { star: number; angular: number; intensity: number; whiten: number; side: number }> = {
  barnard: { star: STOP_STARS.barnard, angular: 0.3, intensity: 1.25, whiten: 0.04, side: 1 },
  gliese251: { star: STOP_STARS.gliese251, angular: 0.28, intensity: 1.2, whiten: 0.05, side: -1 },
  vega: { star: STOP_STARS.vega, angular: 0.2, intensity: 1.25, whiten: 0.12, side: 1 },
  titawin: { star: STOP_STARS.titawin, angular: 0.16, intensity: 1.2, whiten: 0.12, side: -1 },
};

// Galactic axes in the equatorial frame (rows of the IAU rotation).
const GAL_X = new Vector3(-0.0548755604, -0.8734370902, -0.4838350155); // toward the centre
const GAL_Y = new Vector3(0.4941094279, -0.44482963, 0.7469822445);
const GAL_N = new Vector3(-0.867666149, -0.1980763734, 0.4559837762);   // galactic north
const galactic = (lDeg: number, bDeg: number) => {
  const l = (lDeg * Math.PI) / 180, b = (bDeg * Math.PI) / 180;
  return GAL_X.clone().multiplyScalar(Math.cos(l) * Math.cos(b))
    .add(GAL_Y.clone().multiplyScalar(Math.sin(l) * Math.cos(b)))
    .add(GAL_N.clone().multiplyScalar(Math.sin(b))).normalize();
};

interface Pose {
  eye: Vector3;
  look: Vector3;
  up: Vector3;
  /** Distance scale at this end of a leg for log-distance travel; null = short hop, linear. */
  r0: number | null;
  dim: number;
}

export interface SkyStats {
  fps: number;
  frameMs: number;
  scale: number;
  dpr: number;
  width: number;
  height: number;
  gpu: string;
  stars: number;
  progress: number;
  section: string;
}

export interface BenchResult {
  seconds: number;
  frames: number;
  avgFps: number;
  low1Fps: number;
  sections: { label: string; avgFps: number; frames: number }[];
}

export interface SkyEngineOptions {
  canvas: HTMLCanvasElement;
  catalog: Catalog;
  atmosphere: SkyAtmosphere;
  reducedMotion: boolean;
  lowPower: boolean;
  onReady: () => void;
  onContextLost: () => void;
}

// ── small vector helpers ──
function slerpDir(a: Vector3, b: Vector3, t: number): Vector3 {
  const d = Math.min(1, Math.max(-1, a.dot(b)));
  const th = Math.acos(d);
  if (th < 1e-5) return a.clone();
  if (Math.PI - th < 1e-3) {
    // Opposite: turn around any axis perpendicular to a.
    const axis = new Vector3(0, 0, 1).cross(a).lengthSq() > 1e-6 ? new Vector3(0, 0, 1).cross(a).normalize() : new Vector3(1, 0, 0);
    return a.clone().applyAxisAngle(axis, th * t);
  }
  const s = Math.sin(th);
  return a.clone().multiplyScalar(Math.sin((1 - t) * th) / s).add(b.clone().multiplyScalar(Math.sin(t * th) / s)).normalize();
}
const orthoUp = (up: Vector3, look: Vector3) => {
  const u = up.clone().sub(look.clone().multiplyScalar(up.dot(look)));
  return u.lengthSq() < 1e-10 ? new Vector3(0, 0, 1) : u.normalize();
};

export class SkyEngine {
  static create(opts: SkyEngineOptions): SkyEngine | null {
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: opts.canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      return null;
    }
    return new SkyEngine(renderer, opts);
  }

  private readonly renderer: WebGLRenderer;
  private readonly opts: SkyEngineOptions;
  private readonly camera = new PerspectiveCamera(60, 1, 1e-5, 1e5);
  private readonly localCam = new PerspectiveCamera(60, 1, 0.01, 1e7);
  private readonly quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly positions: Float32Array;

  // sky light cubes: [shown, incoming]
  private readonly genMat: ShaderMaterial;
  private readonly genScene = new Scene();
  private readonly cubeCam: CubeCamera;
  private readonly cubeSize: number;
  private cubes: { rt: WebGLCubeRenderTarget; atm: SkyAtmosphere; tiles: number }[] = [];
  private atmFrom: SkyAtmosphere;
  private atmTo: SkyAtmosphere;
  private atmWanted: SkyAtmosphere;
  private mix = 1;

  private readonly skyMat: ShaderMaterial;
  private readonly skyScene = new Scene();
  private readonly starMat: ShaderMaterial;
  private readonly starScene = new Scene();
  private readonly meadowMat: ShaderMaterial;
  private readonly meadowScene = new Scene();
  private readonly moteMat: ShaderMaterial;
  private readonly moteScene = new Scene();
  private readonly localScene = new Scene();
  private readonly coronaMat: ShaderMaterial;
  private readonly corona: Mesh;
  private readonly planetMat: ShaderMaterial;
  private readonly planet: Mesh;
  private readonly veilMat: ShaderMaterial;
  private readonly veilScene = new Scene();

  // Earth frame: the first star sits 28° above the horizon, ahead.
  private zenith = new Vector3(0, 0, 1);
  private forward = new Vector3(1, 0, 0);
  private poses: Pose[] = [];
  private planetWorld = new Vector3();
  private planetRadius = 0;
  private localScale = 1;

  private target = 0;
  private smooth = 0;
  private pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  private reduced: { shown: number; phase: "idle" | "out" | "in"; t: number };

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

  private constructor(renderer: WebGLRenderer, opts: SkyEngineOptions) {
    this.renderer = renderer;
    this.opts = opts;
    this.positions = opts.catalog.positions;
    renderer.autoClear = false;
    this.atmFrom = this.atmTo = this.atmWanted = opts.atmosphere;
    this.reduced = { shown: 0, phase: "idle", t: 0 };
    this.scaleStep = opts.lowPower ? 1 : 0;
    this.cubeSize = opts.lowPower ? 768 : 1024;

    // Sky light generator (rendered into cube faces a tile at a time).
    const atm = ATMOS[opts.atmosphere];
    this.genMat = new ShaderMaterial({
      vertexShader: SKYGEN_VERT, fragmentShader: SKYGEN_FRAG, side: BackSide, depthTest: false, depthWrite: false,
      uniforms: { uNebA: { value: atm.a }, uNebB: { value: atm.b }, uNebAmt: { value: atm.amt }, uNebScale: { value: atm.scale }, uMilky: { value: atm.milky } },
    });
    this.genScene.add(new Mesh(new SphereGeometry(1, 64, 32), this.genMat));
    const firstCube = this.newCube(opts.atmosphere);
    this.cubes = [firstCube];
    this.cubeCam = new CubeCamera(0.1, 10, firstCube.rt);
    this.cubeCam.coordinateSystem = renderer.coordinateSystem;
    this.cubeCam.updateCoordinateSystem();
    this.cubeCam.updateMatrixWorld(true);

    // Per-pixel sky over a fullscreen quad.
    this.skyMat = new ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        uViewDir: { value: new Matrix4() }, uCubeA: { value: firstCube.rt.texture }, uCubeB: { value: firstCube.rt.texture },
        uMix: { value: 0 }, uCubeFlip: { value: 1 }, uMilky: { value: atm.milky }, uExtinction: { value: 1 },
        uZenith: { value: new Vector3() }, uDim: { value: 1 }, uPx: { value: 1 },
      },
    });
    this.skyScene.add(new Mesh(new PlaneGeometry(2, 2), this.skyMat));

    // Stars.
    const { catalog } = opts;
    const colors = new Float32Array(catalog.count * 3);
    const seeds = new Float32Array(catalog.count);
    for (let i = 0; i < catalog.count; i++) {
      colors.set(starColor(catalog.colorIndex[i]), i * 3);
      seeds[i] = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(catalog.positions, 3));
    geo.setAttribute("aAbs", new BufferAttribute(catalog.absMag, 1));
    geo.setAttribute("aColor", new BufferAttribute(colors, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    this.starMat = new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uCam: { value: new Vector3() }, uPx: { value: 1 }, uTime: { value: 0 }, uMagLimit: { value: atm.mag },
        uExtinction: { value: 1 }, uZenith: { value: new Vector3() }, uDim: { value: 1 }, uTwinkle: { value: 0.1 },
      },
    });
    const stars = new Points(geo, this.starMat);
    stars.frustumCulled = false;
    this.starScene.add(stars);

    // The meadow, in screen space.
    this.meadowMat = new ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: MEADOW_FRAG, transparent: true, depthTest: false, depthWrite: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: { uRes: { value: [1, 1] }, uHorizon: { value: 0.2 }, uYaw: { value: 0 }, uFade: { value: 1 }, uGlowWarm: { value: [0.11, 0.075, 0.045] }, uTime: { value: 0 } },
    });
    this.meadowScene.add(new Mesh(new PlaneGeometry(2, 2), this.meadowMat));

    // Motes when leaving the Earth (view space).
    this.moteMat = new ShaderMaterial({
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTravel: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 0 } },
    });
    {
      const n = 1400, mp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = (k: number) => Math.abs((Math.sin(i * 91.7 + k * 17.3) * 43758.5453) % 1);
        mp.set([r(1) * 2 - 1, r(2) * 2 - 1, r(3)], i * 3);
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(mp, 3));
      const motes = new Points(g, this.moteMat);
      motes.frustumCulled = false;
      this.moteScene.add(motes);
    }

    // Close-up of a stop: corona, and at Titawin a planet against it.
    this.coronaMat = new ShaderMaterial({
      vertexShader: CORONA_VERT, fragmentShader: CORONA_FRAG, transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: [1, 1, 1] }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    });
    this.corona = new Mesh(new PlaneGeometry(1, 1), this.coronaMat);
    this.corona.renderOrder = 1;
    this.corona.frustumCulled = false;
    // "transparent" only to sort it into the same queue as the corona, so
    // renderOrder puts the silhouette over the glow (it is fully opaque).
    this.planetMat = new ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uStarPos: { value: new Vector3() }, uStarColor: { value: [1, 1, 1] } },
    });
    this.planet = new Mesh(new SphereGeometry(1, 96, 64), this.planetMat);
    this.planet.renderOrder = 2;
    this.localScene.add(this.corona, this.planet);

    // Reduced motion: sections cut through a fade instead of flying.
    this.veilMat = new ShaderMaterial({
      vertexShader: QUAD_VERT, transparent: true, depthTest: false, depthWrite: false, blending: NormalBlending,
      fragmentShader: "precision highp float; uniform float uA; void main(){ gl_FragColor = vec4(0.0196, 0.0275, 0.051, uA); }",
      uniforms: { uA: { value: 0 } },
    });
    this.veilScene.add(new Mesh(new PlaneGeometry(2, 2), this.veilMat));

    this.setupEarthFrame();
    this.resize();

    opts.canvas.addEventListener("webglcontextlost", this.onLost, false);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.start();
  }

  // ── public API ──

  /** Raw journey progress from scroll (see journey.progressAt). */
  setProgress(s: number) {
    this.target = Math.max(0, Math.min(JOURNEY.length - 1, s));
  }

  /** Jump without travelling (first paint at a deep scroll position). */
  jumpTo(s: number) {
    this.setProgress(s);
    this.smooth = this.opts.reducedMotion ? Math.round(this.target) : this.target;
    this.reduced.shown = Math.round(this.target);
  }

  setPointer(nx: number, ny: number) {
    this.pointer.x = Math.max(-1, Math.min(1, nx));
    this.pointer.y = Math.max(-1, Math.min(1, ny));
  }

  setAtmosphere(a: SkyAtmosphere) {
    this.atmWanted = a;
  }

  /** Width/height of the canvas in CSS px changed. */
  resize() {
    const c = this.opts.canvas;
    this.width = Math.max(1, c.clientWidth);
    this.height = Math.max(1, c.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.applyScale();
    for (const cam of [this.camera, this.localCam]) {
      cam.aspect = this.width / this.height;
      cam.fov = this.width < this.height ? 66 : 60;
      cam.updateProjectionMatrix();
    }
    this.buildPoses();
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
      seconds: b.t,
      frames: b.dts.length,
      avgFps: fpsOf(b.dts),
      low1Fps: 1 / (worst.reduce((s, x) => s + x, 0) / worst.length),
      sections: [...b.bySection.entries()].sort((x, y) => x[0] - y[0])
        .map(([i, dts]) => ({ label: JOURNEY[i].label, avgFps: fpsOf(dts), frames: dts.length })),
    };
  }

  stats(): SkyStats {
    if (!this.gpu) {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      this.gpu = String((ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || "?");
    }
    return {
      fps: this.fps, frameMs: this.frameMs, scale: SCALES[this.scaleStep], dpr: this.dpr,
      width: Math.round(this.width * this.dpr * SCALES[this.scaleStep]), height: Math.round(this.height * this.dpr * SCALES[this.scaleStep]),
      gpu: this.gpu, stars: this.opts.catalog.count, progress: this.smooth,
      section: JOURNEY[Math.min(JOURNEY.length - 1, Math.round(this.smooth))].label,
    };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.opts.canvas.removeEventListener("webglcontextlost", this.onLost, false);
    document.removeEventListener("visibilitychange", this.onVisibility);
    for (const c of this.cubes) c.rt.dispose();
    for (const scene of [this.genScene, this.skyScene, this.starScene, this.meadowScene, this.moteScene, this.localScene, this.veilScene]) {
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        (m.material as ShaderMaterial | undefined)?.dispose?.();
      });
    }
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
    this.starMat.uniforms.uPx.value = px;
    this.moteMat.uniforms.uPx.value = px;
    this.skyMat.uniforms.uPx.value = px;
    const buf = this.renderer.getDrawingBufferSize(new Vector2());
    this.meadowMat.uniforms.uRes.value = [buf.x, buf.y];
  }

  // ── sky cubes ──

  private newCube(atm: SkyAtmosphere) {
    const rt = new WebGLCubeRenderTarget(this.cubeSize, { generateMipmaps: false, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    return { rt, atm, tiles: 0 };
  }

  /** Bakes up to `budget` tiles (6 faces × 4 quarters) of a cube. Returns true when complete. */
  private bake(cube: { rt: WebGLCubeRenderTarget; atm: SkyAtmosphere; tiles: number }, budget: number): boolean {
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

  // ── journey poses ──

  private star(i: number) {
    return new Vector3(this.positions[i * 3], this.positions[i * 3 + 1], this.positions[i * 3 + 2]);
  }

  private setupEarthFrame() {
    const t = this.star(STOP_STARS.barnard).normalize();
    const ncp = new Vector3(0, 0, 1);
    const up = ncp.clone().sub(t.clone().multiplyScalar(ncp.dot(t))).normalize();
    const elev = (28 * Math.PI) / 180;
    this.zenith = t.clone().multiplyScalar(Math.sin(elev)).add(up.multiplyScalar(Math.cos(elev))).normalize();
    this.forward = t.clone().sub(this.zenith.clone().multiplyScalar(t.dot(this.zenith))).normalize();
  }

  /** The view at a stop: just past the star, looking back at it with the Sun in frame. */
  private stopPose(id: string, portrait: boolean): Pose {
    const cfg = STOP_LOOK[id];
    const s = this.star(cfg.star);
    const out = s.clone().normalize();
    let perp = new Vector3(0, 0, 1).cross(out);
    perp = perp.lengthSq() < 1e-8 ? new Vector3(0, 1, 0) : perp.normalize();
    const eye = s.clone().add(out.clone().multiplyScalar(STANDOFF)).add(perp.clone().multiplyScalar(0.00026 * cfg.side));
    const toStar = s.clone().sub(eye).normalize();
    const toSun = eye.clone().multiplyScalar(-1).normalize();
    const look = toStar.clone().lerp(toSun, 0.5).normalize();
    // Portrait screens are narrow: turn so the star and the Sun sit one above the other.
    const up = portrait ? orthoUp(perp.clone().multiplyScalar(-cfg.side), look) : orthoUp(perp.clone().cross(toStar).multiplyScalar(-cfg.side), look);
    return { eye, look, up, r0: STANDOFF, dim: 1 };
  }

  private buildPoses() {
    const portrait = this.width < this.height;
    const right = this.forward.clone().cross(this.zenith).normalize();
    const toBarnard = this.star(STOP_STARS.barnard).normalize();
    const earth: Pose = { eye: new Vector3(), look: this.forward.clone().applyAxisAngle(right, 0.36), up: this.zenith.clone(), r0: 1e-7, dim: 1 };
    const liftoff: Pose = { eye: new Vector3(), look: toBarnard.clone(), up: this.zenith.clone(), r0: 1e-7, dim: 1 };
    const stops = {
      barnard: this.stopPose("barnard", portrait),
      gliese251: this.stopPose("gliese251", portrait),
      vega: this.stopPose("vega", portrait),
      titawin: this.stopPose("titawin", portrait),
    };

    // After the last stop the camera drifts back from Titawin and pans along
    // the Milky Way (galactic north up, so the band lies across the frame),
    // then turns home toward the Sun.
    const T = stops.titawin.eye;
    const away = this.star(STOP_STARS.titawin).normalize();
    const drift = (r: number, lDeg: number, dim = 1): Pose => {
      const look = galactic(lDeg, -8);
      return { eye: T.clone().add(away.clone().multiplyScalar(r)), look, up: orthoUp(GAL_N, look), r0: null, dim };
    };
    const homeEye = T.clone().add(away.clone().multiplyScalar(0.03));
    const homeLook = homeEye.clone().multiplyScalar(-1).normalize();
    const byId: Record<WaypointId, Pose> = {
      earth, liftoff, ...stops,
      forWhom: drift(0.002, -25),
      howItWorks: drift(0.004, 5),
      guardians: drift(0.007, 35),
      atmospheres: drift(0.01, 65),
      security: drift(0.01, 65, 0.55),
      pricing: drift(0.014, 95),
      faq: drift(0.019, 125),
      home: { eye: homeEye, look: homeLook, up: orthoUp(GAL_N, homeLook), r0: null, dim: 1 },
    };
    this.poses = JOURNEY.map((s) => byId[s.id]);

    // Titawin's planet: fixed in space, framed so that from the stop it hides
    // the edge of the star. Sizes are illustrative (see the concept board).
    const tp = stops.titawin;
    const toStar = this.star(STOP_STARS.titawin).sub(tp.eye);
    const D = toStar.length();
    const dir = toStar.normalize();
    const side = orthoUp(tp.up, dir);
    const across = dir.clone().cross(side).normalize();
    const u = D / 10;
    this.planetWorld = tp.eye.clone()
      .add(dir.clone().multiplyScalar(4.2 * u))
      .add(across.multiplyScalar((portrait ? -0.3 : -0.52) * u))
      .add(side.multiplyScalar((portrait ? -0.5 : -0.33) * u));
    this.planetRadius = 0.62 * u;
    this.localScale = 10 / D;
  }

  /** Camera pose, extinction and extras at journey progress s. */
  private poseAt(s: number) {
    const n = this.poses.length;
    const i = Math.min(n - 2, Math.floor(s));
    const f = clamp01(s - i);
    const u = easeInOut(f);
    const A = this.poses[i], B = this.poses[i + 1];

    const leg = B.eye.clone().sub(A.eye);
    const L = leg.length();
    let eye: Vector3;
    let look: Vector3;
    if (L < 1e-12) {
      eye = A.eye.clone();
      look = slerpDir(A.look, B.look, u);
    } else if (A.r0 !== null && B.r0 !== null) {
      // A real leg between stars: log-distance travel on a gentle arc, facing
      // the way we fly in the middle, settling on the next view at the end.
      const t = logLeg(u, L, A.r0, B.r0);
      const travel = leg.clone().normalize();
      const bowAxis = orthoUp(GAL_N, travel).cross(travel).normalize();
      eye = A.eye.clone().add(leg.clone().multiplyScalar(t)).add(bowAxis.multiplyScalar(Math.sin(Math.PI * t) * L * 0.06));
      const out = slerpDir(A.look, travel, easeInOut(clamp01(f / 0.35)));
      look = slerpDir(out, B.look, easeInOut(clamp01((f - 0.65) / 0.35)));
    } else {
      eye = A.eye.clone().add(leg.multiplyScalar(u));
      look = slerpDir(A.look, B.look, u);
    }
    const up = orthoUp(slerpDir(A.up, B.up, u), look);

    const id = JOURNEY[i].id;
    const extinction = i === 0 ? 1 - easeInOut(clamp01((f - 0.2) / 0.65)) : 0;
    const drop = i === 0 ? easeInOut(f) * 0.35 : 0;   // the land sinks as we rise
    // Motes only in the first half of the leg from the Earth: a push off, then just stars.
    const motes = id === "liftoff" ? Math.sin(Math.PI * clamp01(f / 0.5)) * 0.22 * (f < 0.5 ? 1 : 0) : 0;
    const dim = A.dim + (B.dim - A.dim) * u;
    return { eye, look, up, extinction, drop, motes, travel: f, dim };
  }

  // ── frame ──

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.time += this.opts.reducedMotion ? dt * 0.3 : dt;
    this.measure(dt);

    this.updateAtmosphere(dt);
    if (this.cubes[0].tiles < 24) return; // still baking the first sky

    // Scroll → camera, with lag; reduced motion cuts between waypoints instead.
    if (this.opts.reducedMotion) this.stepReduced(dt);
    else this.smooth += (this.target - this.smooth) * (1 - Math.exp(-dt / SCROLL_LAG_S));
    const k = 1 - Math.exp(-dt / 0.9);   // heavy inertia on the pointer
    this.pointer.sx += (this.pointer.x - this.pointer.sx) * k;
    this.pointer.sy += (this.pointer.y - this.pointer.sy) * k;

    this.render();
    if (!this.readyFired) {
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
    // Adaptive resolution: 1 → 0.83 → 0.66 of the capped DPR, and back.
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

    // Pointer: a slow turn of at most 1.5°; at rest a breath of ~0.2 px.
    const settled = Math.abs(this.target - this.smooth) < 1e-3 && !this.opts.reducedMotion;
    const breath = settled ? Math.sin(this.time * ((2 * Math.PI) / 7)) * 0.00024 : 0;
    const yaw = this.opts.reducedMotion ? 0 : this.pointer.sx * POINTER_MAX;
    const pitch = this.opts.reducedMotion ? 0 : -this.pointer.sy * POINTER_MAX * 0.6 + breath;
    const right = p.look.clone().cross(p.up).normalize();
    const look = p.look.clone().applyAxisAngle(p.up, -yaw).applyAxisAngle(right, pitch);

    const cam = this.camera;
    cam.position.copy(p.eye);
    cam.up.copy(p.up);
    cam.lookAt(p.eye.clone().add(look));
    cam.updateMatrixWorld();

    // Sky quad: clip corner → world direction.
    const ty = Math.tan((cam.fov * Math.PI) / 360), tx = ty * cam.aspect;
    const rot = new Matrix4().extractRotation(cam.matrixWorld);
    const scale = new Matrix4().set(tx, 0, 0, 0, 0, ty, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0);
    const su = this.skyMat.uniforms;
    su.uViewDir.value.multiplyMatrices(rot, scale);
    su.uCubeA.value = this.cubes[0].rt.texture;
    su.uCubeB.value = (this.cubes[1] ?? this.cubes[0]).rt.texture;
    const m = this.cubes.length === 2 && this.cubes[1].tiles >= 24 ? easeInOut(this.mix) : 0;
    su.uMix.value = m;
    const from = ATMOS[this.atmFrom], to = ATMOS[this.atmTo];
    su.uMilky.value = from.milky + (to.milky - from.milky) * m;
    su.uExtinction.value = p.extinction;
    su.uZenith.value = this.zenith;
    su.uDim.value = p.dim;

    const st = this.starMat.uniforms;
    st.uCam.value = p.eye;
    st.uTime.value = this.time;
    st.uExtinction.value = p.extinction;
    st.uZenith.value = this.zenith;
    st.uDim.value = p.dim;
    st.uMagLimit.value = from.mag + (to.mag - from.mag) * m;

    const r = this.renderer;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.skyScene, this.quadCam);
    r.render(this.starScene, cam);

    if (p.motes > 0.001) {
      this.moteMat.uniforms.uAlpha.value = p.motes;
      this.moteMat.uniforms.uTravel.value = p.travel * 4;
      r.render(this.moteScene, this.localCam);
    }

    if (this.placeCloseUp(p.eye, p.dim)) r.render(this.localScene, this.localCam);

    if (p.extinction > 0.001) {
      const mu = this.meadowMat.uniforms;
      mu.uFade.value = p.extinction;
      mu.uYaw.value = yaw;
      mu.uTime.value = this.time;
      const h = cam.position.clone().add(this.forward.clone().multiplyScalar(10)).project(cam);
      mu.uHorizon.value = (h.y + 1) / 2 - p.drop;
      r.render(this.meadowScene, this.quadCam);
    }

    if (this.veilMat.uniforms.uA.value > 0.001) r.render(this.veilScene, this.quadCam);
  }

  /** Corona of the nearest stop star, and Titawin's planet. Returns whether anything shows. */
  private placeCloseUp(eye: Vector3, dim: number): boolean {
    let best: { id: string; d: number } | null = null;
    for (const id of Object.keys(STOP_LOOK)) {
      const d = this.star(STOP_LOOK[id].star).distanceTo(eye);
      if (!best || d < best.d) best = { id, d };
    }
    if (!best) return false;
    const near = coronaNearness(best.d);
    const planetLocal = this.planetWorld.clone().sub(eye).multiplyScalar(this.localScale);
    const planetOn = planetLocal.length() < 1e4;
    if (near <= 0 && !planetOn) return false;

    const cfg = STOP_LOOK[best.id];
    this.localCam.quaternion.copy(this.camera.quaternion);
    this.localCam.position.set(0, 0, 0);
    this.localCam.updateMatrixWorld();
    const starPos = this.star(cfg.star);
    const dir = starPos.clone().sub(eye).normalize();
    const color = starColor(this.opts.catalog.colorIndex[cfg.star], cfg.whiten);
    const angular = 0.025 + (cfg.angular - 0.025) * Math.pow(near, 3);
    const size = 10 * Math.tan(angular) * 2;
    this.corona.visible = near > 0;
    this.corona.position.copy(dir.clone().multiplyScalar(10));
    this.corona.scale.set(size, size, 1);
    this.coronaMat.uniforms.uColor.value = color;
    this.coronaMat.uniforms.uIntensity.value = (0.3 + (cfg.intensity - 0.3) * Math.pow(near, 1.6)) * dim;
    this.coronaMat.uniforms.uTime.value = this.time;

    // The planet lives at Titawin, drawn over the corona as a silhouette.
    this.planet.visible = planetOn;
    if (planetOn) {
      const ts = this.star(STOP_STARS.titawin).sub(eye).multiplyScalar(this.localScale);
      this.planet.position.copy(planetLocal);
      this.planet.scale.setScalar(this.planetRadius * this.localScale);
      this.planetMat.uniforms.uStarPos.value = ts;
      this.planetMat.uniforms.uStarColor.value = starColor(this.opts.catalog.colorIndex[STOP_STARS.titawin], 0.1).map((c) => c * dim);
    }
    return true;
  }
}
