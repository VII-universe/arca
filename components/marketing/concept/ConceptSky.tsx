"use client";

// M0 CONCEPT PROTOTYPE — throwaway, lives only on the concept-v2 branch.
// Real night sky from the HYG v4.4 catalogue (CC BY-SA 4.0) + procedural
// nebula + optional Earth horizon. Used to render the hero variants and the
// atmosphere swatches for review; the production scene comes in M1.

import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
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
  Vector3,
  WebGLRenderer,
} from "three";
import { starColor } from "./starColor";

export type ConceptAtmosphere = "nebula" | "sunset" | "ocean" | "midnight" | "stars";

// Nebula tint per atmosphere — only hue and density change; no pink/magenta.
const NEBULA: Record<ConceptAtmosphere, { a: [number, number, number]; b: [number, number, number]; density: number; magLimit: number }> = {
  nebula: { a: [0.11, 0.17, 0.31], b: [0.13, 0.19, 0.33], density: 1, magLimit: 6.6 },
  sunset: { a: [0.26, 0.16, 0.08], b: [0.12, 0.13, 0.22], density: 1, magLimit: 6.6 },
  ocean: { a: [0.06, 0.23, 0.25], b: [0.07, 0.17, 0.28], density: 1, magLimit: 6.6 },
  midnight: { a: [0.08, 0.1, 0.18], b: [0.06, 0.08, 0.14], density: 0.3, magLimit: 6.6 },
  stars: { a: [0, 0, 0], b: [0, 0, 0], density: 0, magLimit: 7.7 },
};

const NOISE = /* glsl */ `
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.02+17.3; a*=0.5; } return v; }
`;

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const NEBULA_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uDensity; uniform vec2 uOffset;
varying vec2 vUv;
${NOISE}
void main(){
  vec2 p = gl_FragCoord.xy / uRes.y * 1.5 + uOffset;
  float t = uTime * 0.003;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.5*q + vec2(1.7, 9.2)), fbm(p + 3.5*q + vec2(8.3, 2.8)));
  float f = fbm(p + 3.0*r);
  vec2 p2 = p * 0.5 + vec2(11.0, 3.0);
  float f2 = fbm(p2 + 2.0*vec2(fbm(p2), fbm(p2 + 3.1)));
  // #0A0F1C at the bottom to #05070D at the top — never pure black.
  vec3 col = mix(vec3(0.039, 0.059, 0.110), vec3(0.020, 0.027, 0.051), vUv.y);
  col += uA * smoothstep(0.42, 1.0, f) * 0.55 * uDensity;
  col += uB * smoothstep(0.35, 0.9, f2) * 0.32 * uDensity;
  // Dark dust lanes carved through the glow.
  col *= 1.0 - 0.28 * smoothstep(0.52, 0.8, fbm(p * 2.3 + r)) * uDensity;
  gl_FragColor = vec4(col, 1.0);
}`;

const HORIZON_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uDepth;
${NOISE}
float n1(float x){ return fbm(vec2(x, 0.5)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = uv.x * uRes.x / uRes.y;
  // Low, quiet ridge line — just enough land to stand on.
  float hy = 0.085 + 0.03 * n1(x * 1.1 + 2.0) + 0.007 * n1(x * 6.0 + 4.0);
  float above = uv.y - hy;
  float land = smoothstep(0.0012, -0.0012, above);
  // Faint airglow hugging the horizon; it fades as the year moves further out.
  vec3 glow = vec3(0.09, 0.12, 0.19) * exp(-max(above, 0.0) * 24.0) * 0.55 * (1.0 - uDepth * 0.7);
  // A hair of cool light along the ridge, so the silhouette reads as land.
  vec3 rim = vec3(0.16, 0.19, 0.26) * exp(-abs(above) * 700.0) * 0.35;
  vec3 ground = mix(vec3(0.016, 0.02, 0.032), vec3(0.008, 0.01, 0.017), clamp((hy - uv.y) / 0.08, 0.0, 1.0));
  // Premultiplied: ground replaces the sky, glow adds to it.
  gl_FragColor = vec4(ground * land + (glow + rim) * (1.0 - land) + rim * land, land);
}`;

const STAR_VERT = /* glsl */ `
attribute float aMag; attribute float aAbs; attribute vec3 aColor; attribute float aSeed;
uniform float uPx; uniform float uMagLimit; uniform float uTime; uniform float uBright; uniform float uDeep;
varying vec3 vColor; varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float m = aMag;
  if (uDeep > 0.5) { m = aAbs + 5.0 * log(max(length(mv.xyz), 0.05) / 10.0) / log(10.0); }
  if (m > uMagLimit) { gl_PointSize = 0.0; vAlpha = 0.0; return; }
  float flux = pow(10.0, -0.4 * (m - 1.0));
  // Size and brightness both grow with flux; the faintest stars stay a soft
  // two-pixel point instead of disappearing between pixel centres.
  gl_PointSize = clamp(2.2 + 3.4 * pow(flux, 0.34), 2.2, 13.0) * uPx;
  float tw = 0.9 + 0.1 * sin(uTime * (0.2 + aSeed * 0.5) + aSeed * 40.0);
  vAlpha = clamp(0.22 + 0.9 * pow(flux, 0.4), 0.0, 1.0) * tw * uBright;
  vColor = aColor;
}`;

const STAR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d2 = dot(c, c) * 4.0;               // 0 at the centre, 1 at the edge
  float core = exp(-d2 * 7.0);
  float halo = exp(-d2 * 2.2) * 0.22;
  float a = (core + halo) * smoothstep(1.0, 0.55, d2);
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}`;

let catalog: Promise<Float32Array> | null = null;
function loadCatalog() {
  catalog ??= fetch("/concept/stars-m0.bin").then((r) => r.arrayBuffer()).then((b) => new Float32Array(b));
  return catalog;
}

// Equatorial unit vector for RA (hours) / Dec (degrees), in HYG's x,y,z frame.
function radec(raH: number, decDeg: number) {
  const ra = (raH / 24) * Math.PI * 2;
  const dec = (decDeg * Math.PI) / 180;
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
}

export interface ConceptSkyProps {
  /** "horizon": the sky from Earth with a land silhouette; "deep": a view into 3D depth. */
  mode: "horizon" | "deep";
  atmosphere?: ConceptAtmosphere;
  /** 0 = next year, 1 = "when I'm gone" — how far up and how deep the view goes. */
  depth?: number;
  className?: string;
  /** Look direction (RA hours, Dec degrees). Defaults to Lyra, around Vega. */
  look?: [number, number];
}

export function ConceptSky({ mode, atmosphere = "nebula", depth = 0.2, className, look = [18.6, 30] }: ConceptSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lookRa, lookDec] = look;
  const live = useRef({ depth, atmosphere });
  useEffect(() => {
    live.current = { depth, atmosphere };
  }, [depth, atmosphere]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the CSS background behind stays
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.autoClear = false;

    const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const nebulaMat = new ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: NEBULA_FRAG,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uRes: { value: [1, 1] }, uTime: { value: 0 }, uA: { value: [0, 0, 0] }, uB: { value: [0, 0, 0] },
        uDensity: { value: 1 }, uOffset: { value: mode === "deep" ? [3.2, 7.1] : [0.4, 2.3] },
      },
    });
    const nebulaScene = new Scene();
    nebulaScene.add(new Mesh(new PlaneGeometry(2, 2), nebulaMat));

    const horizonMat = new ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: HORIZON_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      uniforms: { uRes: { value: [1, 1] }, uDepth: { value: 0 } },
    });
    const horizonScene = new Scene();
    horizonScene.add(new Mesh(new PlaneGeometry(2, 2), horizonMat));

    const starMat = new ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uPx: { value: renderer.getPixelRatio() }, uMagLimit: { value: 6.6 }, uTime: { value: 0 },
        uBright: { value: 1 }, uDeep: { value: mode === "deep" ? 1 : 0 },
      },
    });
    const starScene = new Scene();
    const camera = new PerspectiveCamera(mode === "deep" ? 52 : 62, 1, 0.01, 6000);
    camera.up.set(0, 0, 1); // celestial north up
    const lookDir = radec(lookRa, lookDec);

    let disposed = false;
    let raf = 0;
    let visible = true;
    const t0 = performance.now();

    loadCatalog().then((data) => {
      if (disposed) return;
      const n = data.length / 5;
      const pos = new Float32Array(n * 3);
      const mag = new Float32Array(n);
      const abs = new Float32Array(n);
      const col = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = data[i * 5], y = data[i * 5 + 1], z = data[i * 5 + 2];
        const d = Math.hypot(x, y, z) || 1e-6;
        const s = mode === "deep" ? 1 : 500 / d; // sky dome vs true 3D positions (parsecs)
        pos.set([x * s, y * s, z * s], i * 3);
        mag[i] = data[i * 5 + 3];
        abs[i] = mag[i] - 5 * Math.log10(d / 10);
        col.set(starColor(data[i * 5 + 4]), i * 3);
        seed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      }
      const geo = new BufferGeometry();
      geo.setAttribute("position", new BufferAttribute(pos, 3));
      geo.setAttribute("aMag", new BufferAttribute(mag, 1));
      geo.setAttribute("aAbs", new BufferAttribute(abs, 1));
      geo.setAttribute("aColor", new BufferAttribute(col, 3));
      geo.setAttribute("aSeed", new BufferAttribute(seed, 1));
      const points = new Points(geo, starMat);
      points.frustumCulled = false;
      starScene.add(points);
      canvas.dataset.ready = "true";
    });

    function resize() {
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      const px = [w * renderer.getPixelRatio(), h * renderer.getPixelRatio()];
      nebulaMat.uniforms.uRes.value = px;
      horizonMat.uniforms.uRes.value = px;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const t = (now - t0) / 1000;
      const { depth: dp, atmosphere: atm } = live.current;
      const neb = NEBULA[atm];
      const gone = dp >= 0.999;
      nebulaMat.uniforms.uTime.value = t;
      nebulaMat.uniforms.uA.value = neb.a;
      nebulaMat.uniforms.uB.value = neb.b;
      nebulaMat.uniforms.uDensity.value = neb.density * (gone ? 0.55 : 1);
      starMat.uniforms.uTime.value = t;
      starMat.uniforms.uMagLimit.value = neb.magLimit + (mode === "horizon" ? dp * 0.8 : 0);
      starMat.uniforms.uBright.value = gone ? 0.78 : 1;
      horizonMat.uniforms.uDepth.value = dp;

      if (mode === "horizon") {
        // Further years look higher above the horizon.
        const up = new Vector3(0, 0, 1);
        const right = new Vector3().crossVectors(lookDir, up).normalize();
        const dir = lookDir.clone().applyAxisAngle(right, 0.08 + dp * 0.32);
        camera.position.set(0, 0, 0);
        camera.lookAt(dir);
      } else {
        // Slow drift forward, so the depth reads even when nothing else moves.
        const drift = lookDir.clone().multiplyScalar(-1.2 + t * 0.012);
        camera.position.copy(drift);
        camera.lookAt(drift.clone().add(lookDir));
      }

      renderer.clear();
      renderer.render(nebulaScene, quadCam);
      renderer.render(starScene, camera);
      if (mode === "horizon") renderer.render(horizonScene, quadCam);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      renderer.dispose();
    };
  }, [mode, lookRa, lookDec]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
