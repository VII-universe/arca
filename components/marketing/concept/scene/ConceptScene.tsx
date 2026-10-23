"use client";

// M0b CONCEPT PROTOTYPE — "Světlo na cestě" scene (concept-v2 branch only).
// One Three.js scene, several shots: the night meadow (hero), the flight from
// the horizon to the first star (video), two stops on the journey (Vega,
// Titawin with a planet) and a deep-sky view used for the atmospheres.
// Stars are the HYG v4.4 catalogue at true 3D positions (parsecs).

import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { starColor, type RGB } from "../starColor";
import {
  CORONA_FRAG, CORONA_VERT, MEADOW_FRAG, MOTE_FRAG, MOTE_VERT, PLANET_FRAG, PLANET_VERT, QUAD_VERT, SKY_FRAG, SKY_VERT, STAR_FRAG, STAR_VERT,
} from "./shaders";

export type Shot = "meadow" | "flight" | "vega" | "titawin" | "deep";
export type Atmosphere = "nebula" | "sunset" | "ocean" | "midnight" | "stars";

// Distinct at a glance, still muted — hue and density only, never magenta.
const ATMOS: Record<Atmosphere, { a: RGB; b: RGB; amt: number; scale: number; milky: number; mag: number }> = {
  nebula: { a: [0.2, 0.3, 0.6], b: [0.32, 0.38, 0.66], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  sunset: { a: [0.7, 0.4, 0.17], b: [0.46, 0.25, 0.13], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  ocean: { a: [0.1, 0.52, 0.52], b: [0.14, 0.32, 0.56], amt: 1, scale: 2.2, milky: 1, mag: 7.2 },
  midnight: { a: [0.17, 0.2, 0.44], b: [0.11, 0.13, 0.32], amt: 0.75, scale: 1.4, milky: 0.7, mag: 7.0 },
  stars: { a: [0, 0, 0], b: [0, 0, 0], amt: 0, scale: 2.2, milky: 1.15, mag: 8.6 },
};

const BARNARD = 30002, VEGA = 5, TITAWIN = 573;     // indices in stars-v2.bin (see stars-v2.json)
const FLIGHT_SECONDS = 10;

let catalogPromise: Promise<Float32Array> | null = null;
const loadCatalog = () =>
  (catalogPromise ??= fetch("/concept/stars-v2.bin").then((r) => r.arrayBuffer()).then((b) => new Float32Array(b)));

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);  // power2.inOut
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

declare global {
  interface Window {
    __concept?: { render: (t: number) => void; ready: boolean };
  }
}

export function ConceptScene({
  shot,
  atmosphere = "nebula",
  capture = false,
  className,
  pitch = 0.36,
}: {
  shot: Shot;
  atmosphere?: Atmosphere;
  capture?: boolean;
  className?: string;
  /** Meadow only: how far above the horizon the view looks (radians). */
  pitch?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const live = useRef({ pitch });
  useEffect(() => {
    live.current = { pitch };
  }, [pitch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: capture });
    } catch {
      return;
    }
    renderer.setPixelRatio(capture ? Math.min(window.devicePixelRatio || 1, 2) : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.autoClear = false;
    const atm = ATMOS[atmosphere];

    // Cameras: the star field lives in parsecs; the close-up (corona, planet)
    // has its own small-unit scene that shares the rotation.
    const camera = new PerspectiveCamera(60, 1, 1e-5, 1e5);
    const localCam = new PerspectiveCamera(60, 1, 0.01, 1000);
    const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const skyMat = new ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, depthTest: false,
      uniforms: {
        uNebA: { value: atm.a }, uNebB: { value: atm.b }, uNebAmt: { value: atm.amt }, uNebScale: { value: atm.scale },
        uMilky: { value: atm.milky }, uExtinction: { value: 0 }, uZenith: { value: new Vector3(0, 0, 1) },
      },
    });
    const sky = new Mesh(new SphereGeometry(1, 64, 32), skyMat);
    const skyScene = new Scene();
    skyScene.add(sky);

    const starMat = new ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uCam: { value: new Vector3() }, uPx: { value: renderer.getPixelRatio() }, uTime: { value: 0 }, uMagLimit: { value: atm.mag },
        uBright: { value: 1 }, uExtinction: { value: 0 }, uZenith: { value: new Vector3(0, 0, 1) },
      },
    });
    const starScene = new Scene();

    const meadowMat = new ShaderMaterial({
      vertexShader: QUAD_VERT, fragmentShader: MEADOW_FRAG, transparent: true, depthWrite: false, depthTest: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor,
      uniforms: { uRes: { value: [1, 1] }, uHorizon: { value: 0.2 }, uYaw: { value: 0 }, uFade: { value: 1 }, uGlowWarm: { value: [0.11, 0.075, 0.045] }, uTime: { value: 0 } },
    });
    const meadowScene = new Scene();
    meadowScene.add(new Mesh(new PlaneGeometry(2, 2), meadowMat));

    // Close-up scene: a star's corona and (Titawin) a planet in front of it.
    const localScene = new Scene();
    const coronaMat = new ShaderMaterial({
      vertexShader: CORONA_VERT, fragmentShader: CORONA_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: [1, 1, 1] }, uIntensity: { value: 0 }, uTime: { value: 0 } },
    });
    const corona = new Mesh(new PlaneGeometry(1, 1), coronaMat);
    corona.renderOrder = 1;
    localScene.add(corona);
    const bleedMat = coronaMat.clone();
    const bleed = new Mesh(new PlaneGeometry(1, 1), bleedMat); // light wrapping over the planet's limb
    bleed.renderOrder = 3;
    const planetMat = new ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
      uniforms: { uStarPos: { value: new Vector3() }, uStarColor: { value: [1, 1, 1] }, uAtmo: { value: 1 } },
    });
    const planet = new Mesh(new SphereGeometry(1, 96, 64), planetMat);
    planet.renderOrder = 2;

    // Flight only: motes for parallax (positions: xy spread, z = phase).
    const moteMat = new ShaderMaterial({
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending,
      uniforms: { uTravel: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uAlpha: { value: 0 } },
    });
    const moteScene = new Scene();
    {
      const n = 1400, mp = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const r = (k: number) => Math.abs((Math.sin(i * 91.7 + k * 17.3) * 43758.5453) % 1);
        mp.set([r(1) * 2 - 1, r(2) * 2 - 1, r(3)], i * 3);
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(mp, 3));
      const motes = new Points(g, moteMat);
      motes.frustumCulled = false;
      moteScene.add(motes);
    }
    let moteAlpha = 0;

    let pos: Float32Array | null = null;
    let absMag: Float32Array | null = null;
    let ci: Float32Array | null = null;
    const star = (i: number) => new Vector3(pos![i * 3], pos![i * 3 + 1], pos![i * 3 + 2]);

    // Observer frame on Earth: the first star (Barnard's) sits 28° above the
    // southern-ish horizon, celestial north tilted toward the zenith.
    const frame = { zenith: new Vector3(0, 0, 1), forward: new Vector3(1, 0, 0) };
    function setupMeadowFrame() {
      const t = star(BARNARD).normalize();
      const ncp = new Vector3(0, 0, 1);
      const up = ncp.clone().sub(t.clone().multiplyScalar(ncp.dot(t))).normalize();
      const elev = (28 * Math.PI) / 180;
      frame.zenith = t.clone().multiplyScalar(Math.sin(elev)).add(up.clone().multiplyScalar(Math.cos(elev))).normalize();
      frame.forward = t.clone().sub(frame.zenith.clone().multiplyScalar(t.dot(frame.zenith))).normalize();
    }

    function lookFrom(eye: Vector3, dir: Vector3, up: Vector3) {
      camera.position.copy(eye);
      camera.up.copy(up);
      camera.lookAt(eye.clone().add(dir));
      camera.updateMatrixWorld();
    }

    function horizonScreenY(): number {
      // Where the horizontal forward direction lands on screen (0 bottom .. 1 top).
      const p = camera.position.clone().add(frame.forward.clone().multiplyScalar(10)).project(camera);
      return (p.y + 1) / 2;
    }

    let disposed = false;
    let raf = 0;
    const t0 = performance.now();

    function resize() {
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      renderer.setSize(w, h, false);
      for (const c of [camera, localCam]) {
        c.aspect = w / Math.max(1, h);
        c.fov = shot === "deep" ? 72 : shot === "titawin" || shot === "vega" ? 58 : 62;
        c.updateProjectionMatrix();
      }
      meadowMat.uniforms.uRes.value = [w * renderer.getPixelRatio(), h * renderer.getPixelRatio()];
    }

    function placeCorona(target: Vector3, color: RGB, intensity: number, angular: number, time: number) {
      // Local scene: star at 10 units straight along the same direction.
      const dir = target.clone().sub(camera.position).normalize();
      localCam.quaternion.copy(camera.quaternion);
      localCam.position.set(0, 0, 0);
      localCam.updateMatrixWorld();
      corona.position.copy(dir.clone().multiplyScalar(10));
      const size = 10 * Math.tan(angular) * 2;
      corona.scale.set(size, size, 1);
      coronaMat.uniforms.uColor.value = color;
      coronaMat.uniforms.uIntensity.value = intensity;
      coronaMat.uniforms.uTime.value = time;
    }

    function render(t: number) {
      if (!pos) return;
      let showMeadow = false;
      let coronaOn = false;
      let extinction = 0;
      starMat.uniforms.uTime.value = t;

      if (shot === "meadow" || shot === "flight") {
        const up = frame.zenith;
        const p = shot === "meadow" ? live.current.pitch : 0.36 + (0.49 - 0.36) * ease(seg(t, 0.8, 5.2));
        const right = frame.forward.clone().cross(up).normalize();
        const look = frame.forward.clone().applyAxisAngle(right, p);
        // Flight: after leaving the ground, travel toward Barnard's Star,
        // easing in log-distance so the approach feels continuous.
        const target = star(BARNARD);
        const D0 = target.length();
        const k = shot === "flight" ? ease(seg(t, 4.2, FLIGHT_SECONDS)) : 0;
        const dist = D0 * Math.pow(0.0018 / D0, k);
        const eye = target.clone().normalize().multiplyScalar(D0 - dist);
        const toTarget = target.clone().sub(eye).normalize();
        const turn = shot === "flight" ? ease(seg(t, 3.6, 6.4)) : 0;
        lookFrom(eye, look.clone().lerp(toTarget, turn).normalize(), up);
        extinction = shot === "flight" ? 1 - ease(seg(t, 2.6, 4.6)) : 1;
        showMeadow = extinction > 0.001;
        meadowMat.uniforms.uHorizon.value = horizonScreenY();
        meadowMat.uniforms.uFade.value = extinction;
        meadowMat.uniforms.uTime.value = t;
        if (shot === "flight") {
          // The star swells only in the last stretch; it keeps growing to the final frame.
          const near = Math.max(0, (k - 0.15) / 0.85);
          coronaOn = near > 0;
          placeCorona(target, starColor(ci![BARNARD], 0.04), 0.3 + 0.95 * Math.pow(near, 1.6), 0.025 + 0.3 * Math.pow(near, 3), t);
          // Motes stream at the speed of the approach (derivative of the eased progress).
          const dk = (ease(seg(t + 0.05, 4.2, FLIGHT_SECONDS)) - ease(seg(t - 0.05, 4.2, FLIGHT_SECONDS))) / 0.1;
          moteMat.uniforms.uTravel.value = k * 9 + ease(seg(t, 0.8, 5.2)) * 0.6;
          moteAlpha = clamp01(0.12 + dk * 0.9) * clamp01((t - 0.8) / 2);
        }
      } else if (shot === "vega" || shot === "titawin") {
        const idx = shot === "vega" ? VEGA : TITAWIN;
        const s = star(idx);
        const out = s.clone().normalize();                       // away from the Sun
        const perp = new Vector3(0, 0, 1).cross(out).normalize();
        const eye = s.clone().add(out.clone().multiplyScalar(0.0006)).add(perp.clone().multiplyScalar(shot === "vega" ? 0.00026 : -0.00022));
        const toStar = s.clone().sub(eye).normalize();
        const toSun = eye.clone().multiplyScalar(-1).normalize();
        // Portrait screens are narrow: turn the camera so the star and the Sun sit one above the other.
        const portrait = camera.aspect < 1;
        const up = portrait
          ? perp.clone().sub(toStar.clone().multiplyScalar(perp.dot(toStar))).normalize().multiplyScalar(-1)
          : perp.clone().cross(toStar).normalize().multiplyScalar(-1);
        lookFrom(eye, toStar.clone().lerp(toSun, 0.5).normalize(), up);
        coronaOn = true;
        placeCorona(s, starColor(ci![idx], 0.12), shot === "vega" ? 1.25 : 1.2, shot === "vega" ? 0.2 : 0.16, t);
        if (shot === "titawin") {
          // A dark planet just in front of the star — the star peeks past its limb.
          const dir = corona.position.clone().normalize();
          const side = new Vector3(0, 1, 0).applyQuaternion(localCam.quaternion);
          const across = dir.clone().cross(side).normalize();
          const center = dir.clone().multiplyScalar(4.2).add(across.multiplyScalar(portrait ? -0.3 : -0.52)).add(side.multiplyScalar(portrait ? -0.5 : -0.33));
          planet.position.copy(center);
          planet.scale.setScalar(0.62);
          planetMat.uniforms.uStarPos.value = corona.position.clone();
          planetMat.uniforms.uStarColor.value = starColor(ci![idx], 0.1);
          if (!planet.parent) localScene.add(planet, bleed);
          bleed.position.copy(corona.position);
          bleed.scale.copy(corona.scale).multiplyScalar(0.7);
          bleedMat.uniforms.uColor.value = coronaMat.uniforms.uColor.value;
          bleedMat.uniforms.uIntensity.value = 0.55;
          bleedMat.uniforms.uTime.value = t;
        }
        // Label the Sun — from here it's just a faint star.
        const sun = new Vector3(0, 0, 0).project(camera);
        const label = labelRef.current;
        if (label) {
          const visible = sun.z < 1 && Math.abs(sun.x) < 0.95 && Math.abs(sun.y) < 0.9;
          label.style.opacity = visible ? "1" : "0";
          // Text beside the mark on wide screens; centred under it on portrait ones.
          label.style.flexDirection = portrait ? "column" : shot === "vega" ? "row-reverse" : "row";
          label.style.transform = portrait ? "translate(-50%, -9px)" : shot === "vega" ? "translate(calc(-100% + 9px), -50%)" : "translate(-9px, -50%)";
          label.style.left = `${((sun.x + 1) / 2) * 100}%`;
          label.style.top = `${((1 - sun.y) / 2) * 100}%`;
        }
      } else {
        // Deep sky: from the Sun toward the galactic centre (Sagittarius).
        const gc = new Vector3(-0.0548755604, -0.8734370902, -0.4838350155);
        lookFrom(new Vector3(0, 0, 0), gc, new Vector3(0, 0, 1));
      }

      sky.position.copy(camera.position);
      skyMat.uniforms.uExtinction.value = extinction;
      skyMat.uniforms.uZenith.value = frame.zenith;
      starMat.uniforms.uCam.value = camera.position;
      starMat.uniforms.uExtinction.value = extinction;
      starMat.uniforms.uZenith.value = frame.zenith;

      renderer.clear();
      renderer.render(skyScene, camera);
      renderer.render(starScene, camera);
      if (shot === "flight" && moteAlpha > 0) {
        moteMat.uniforms.uAlpha.value = moteAlpha;
        renderer.render(moteScene, localCam);
      }
      if (coronaOn) {
        corona.visible = true;
        renderer.clearDepth();
        renderer.render(localScene, localCam);
      }
      if (showMeadow) renderer.render(meadowScene, quadCam);
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      const t = (now - t0) / 1000;
      render(shot === "flight" ? t % (FLIGHT_SECONDS + 2) : t);
    }

    loadCatalog().then((data) => {
      if (disposed) return;
      const n = data.length / 5;
      pos = new Float32Array(n * 3);
      absMag = new Float32Array(n);
      ci = new Float32Array(n);
      const col = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([data[i * 5], data[i * 5 + 1], data[i * 5 + 2]], i * 3);
        absMag[i] = data[i * 5 + 3];
        ci[i] = data[i * 5 + 4];
        col.set(starColor(ci[i]), i * 3);
        seed[i] = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new BufferAttribute(pos, 3));
      geo.setAttribute("aAbs", new BufferAttribute(absMag, 1));
      geo.setAttribute("aColor", new BufferAttribute(col, 3));
      geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
      const points = new Points(geo, starMat);
      points.frustumCulled = false;
      starScene.add(points);
      setupMeadowFrame();
      resize();
      if (capture) {
        window.__concept = { render: (t: number) => { resize(); render(t); }, ready: true };
        render(4);
      } else {
        raf = requestAnimationFrame(loop);
      }
      canvas.dataset.ready = "true";
    });

    const ro = new ResizeObserver(() => { resize(); if (capture) render(4); });
    ro.observe(canvas);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (capture) delete window.__concept;
    };
  }, [shot, atmosphere, capture]);

  return (
    <div className={`cx-scene ${className ?? ""}`}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {(shot === "vega" || shot === "titawin") && (
        <span ref={labelRef} className="cx-mono" style={{ position: "absolute", transform: shot === "vega" ? "translate(calc(-100% + 9px), -50%)" : "translate(-9px, -50%)", flexDirection: shot === "vega" ? "row-reverse" : "row", opacity: 0, pointerEvents: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="cx-sunmark" aria-hidden="true" /> Slunce · {shot === "vega" ? "25" : "44"} světelných let
        </span>
      )}
    </div>
  );
}
