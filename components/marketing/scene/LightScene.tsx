"use client";

import { useEffect, useRef } from "react";
import { LightRenderer, type OrbDraw, type RGB } from "./renderer";
import { AMBIENT_ORBS, WORLD_HEIGHT, sceneState, type TintKey } from "./sceneState";

// The light scene behind the whole marketing page. Loaded client-only via
// next/dynamic; the CSS sky (.mk-sky) underneath is both its placeholder and
// its fallback — the canvas only fades in once WebGL has drawn a frame.

interface Tier {
  /** render resolution relative to CSS px × capped DPR */
  scale: number;
  /** shader quality knob */
  detail: number;
  /** keep backdrop-filter on glass panels */
  glass: boolean;
}

const TIERS: Tier[] = [
  { scale: 0.7, detail: 1, glass: true },
  { scale: 0.55, detail: 0.6, glass: true },
  { scale: 0.42, detail: 0.25, glass: false },
];
const MAX_DPR = 1.5;
const SLOW_FRAME_MS = 25; // below ~40 fps on average → step down
const SAMPLE_FRAMES = 90;
const SETTLE_FRAMES = 30;

type Palette = { a: RGB; b: RGB; c: RGB; deep: RGB; warm: RGB };

function createColorReader() {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  return (css: string, fallback: RGB): RGB => {
    if (!ctx || !css.trim()) return fallback;
    ctx.fillStyle = "#000";
    ctx.fillStyle = css.trim();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  };
}

function readPalette(root: HTMLElement, toRGB: ReturnType<typeof createColorReader>): Palette {
  const cs = getComputedStyle(root);
  return {
    a: toRGB(cs.getPropertyValue("--mk-a"), [0.43, 0.12, 0.48]),
    b: toRGB(cs.getPropertyValue("--mk-b"), [0.06, 0.36, 0.4]),
    c: toRGB(cs.getPropertyValue("--mk-c"), [0.48, 0.1, 0.29]),
    deep: toRGB(cs.getPropertyValue("--mk-deep"), [0.03, 0.02, 0.05]),
    warm: toRGB(cs.getPropertyValue("--orb-orange"), [1, 0.55, 0]),
  };
}

// Glass carries a brighter, slightly whitened version of its light.
function tintOf(p: Palette, key: TintKey): RGB {
  const c = p[key];
  return [0, 1, 2].map((i) => Math.min(1, c[i] * 1.5 + 0.12)) as RGB;
}

export default function LightScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.closest<HTMLElement>(".mk");
    if (!canvas || !root) return;

    const renderer = LightRenderer.create(canvas);
    if (!renderer) return; // no WebGL — the CSS sky stays

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    const lowEnd =
      !finePointer.matches ||
      (navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

    let tierIndex = lowEnd ? 1 : 0;
    let frame = 0;
    let running = false;
    let shown = false;
    let lastT = 0;
    let deltas: number[] = [];
    let framesSinceTierChange = 0;
    const start = performance.now();

    const toRGB = createColorReader();
    let palette = readPalette(root, toRGB);
    let paletteLiveUntil = 0;

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scroll = window.scrollY / window.innerHeight;

    function applyTier() {
      const tier = TIERS[tierIndex];
      root!.dataset.glass = tier.glass ? "" : "solid";
      resize();
    }

    function resize() {
      const tier = TIERS[tierIndex];
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(canvas!.clientWidth * dpr * tier.scale));
      const h = Math.max(1, Math.round(canvas!.clientHeight * dpr * tier.scale));
      renderer!.resize(w, h);
    }

    function orbsFor(time: number, aspect: number): OrbDraw[] {
      const out: OrbDraw[] = [];
      const motion = reduceMotion.matches ? 0 : 1;
      // Portrait phones: the same orbs read much larger against narrow text
      // columns, so shrink them a little.
      const sizeScale = Math.min(1, 0.62 + aspect * 0.4);
      AMBIENT_ORBS.forEach((orb, i) => {
        const speed = 0.25 + 0.6 * orb.depth;
        let y = orb.y - scroll * speed + Math.sin(time * 0.22 + i * 1.7) * 0.012 * (0.5 + orb.depth) * motion;
        y = ((y % WORLD_HEIGHT) + WORLD_HEIGHT) % WORLD_HEIGHT - 0.3;
        if (y < -0.25 || y > 1.25) return;
        out.push({
          x: orb.x * aspect + mouse.x * 0.03 * orb.depth * motion,
          y: y + mouse.y * 0.02 * orb.depth * motion,
          r: orb.r * sizeScale,
          opacity: 1,
          tint: tintOf(palette, orb.tint),
          light: 0.9,
        });
      });
      return out.concat(sceneState.overlayOrbs);
    }

    function draw(now: number) {
      if (now < paletteLiveUntil) palette = readPalette(root!, toRGB);
      const aspect = canvas!.clientWidth / Math.max(1, canvas!.clientHeight);
      const time = (now - start) / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      renderer!.render({
        time: reduceMotion.matches ? 12 : time,
        scroll,
        mouse: [mouse.x, mouse.y],
        a: palette.a,
        b: palette.b,
        c: palette.c,
        deep: palette.deep,
        stars: (root!.dataset.atmosphere === "stars" ? 1 : 0.3) * sceneState.starBoost,
        detail: TIERS[tierIndex].detail,
        orbs: orbsFor(time, aspect),
      });
      if (!shown) {
        shown = true;
        canvas!.dataset.ready = "true";
        root!.dataset.scene = "webgl";
      }
    }

    // Step down when frames are consistently slow. A device that simply caps
    // at 30 fps (low-power mode) shows a steady ~33 ms — that isn't "slow".
    function adapt(delta: number) {
      framesSinceTierChange++;
      if (framesSinceTierChange < SETTLE_FRAMES) return;
      deltas.push(delta);
      if (deltas.length < SAMPLE_FRAMES) return;
      const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      const sd = Math.sqrt(deltas.reduce((s, d) => s + (d - avg) ** 2, 0) / deltas.length);
      deltas = [];
      const cappedAt30 = Math.abs(avg - 1000 / 30) < 2.5 && sd < 4;
      if (avg <= SLOW_FRAME_MS || cappedAt30) return;
      if (tierIndex < TIERS.length - 1) {
        tierIndex++;
        framesSinceTierChange = 0;
        applyTier();
      } else {
        // Still struggling at the lowest tier: keep a still frame, stop the loop.
        stop();
      }
    }

    function loop(now: number) {
      if (!running) return;
      if (lastT) adapt(now - lastT);
      lastT = now;
      draw(now);
      frame = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (running || reduceMotion.matches || document.hidden) return;
      running = true;
      lastT = 0;
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    // Reduced motion: no loop — one still frame whenever something changes.
    function redrawStill() {
      if (!running) requestAnimationFrame(draw);
    }

    const onScroll = () => {
      scroll = window.scrollY / window.innerHeight;
      if (reduceMotion.matches) redrawStill();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onVisibility = () => (document.hidden ? stop() : startLoop());
    const onMotionPref = () => (reduceMotion.matches ? (stop(), redrawStill()) : startLoop());
    const onContextLost = (e: Event) => {
      e.preventDefault();
      stop();
      delete canvas.dataset.ready;
      root.dataset.scene = "css";
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      redrawStill();
    });
    resizeObserver.observe(canvas);

    // Atmosphere switch: the CSS variables cross-fade over ~1.6 s, so follow
    // them frame by frame for a moment instead of jumping to the end color.
    const atmosphereObserver = new MutationObserver(() => {
      paletteLiveUntil = performance.now() + 2000;
      if (!running) {
        const until = paletteLiveUntil;
        const step = (now: number) => {
          draw(now);
          if (now < until) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
    atmosphereObserver.observe(root, { attributes: true, attributeFilter: ["data-atmosphere"] });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", onMotionPref);
    canvas.addEventListener("webglcontextlost", onContextLost);

    applyTier();
    requestAnimationFrame(draw);
    startLoop();

    return () => {
      stop();
      resizeObserver.disconnect();
      atmosphereObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", onMotionPref);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      renderer.dispose();
      delete root.dataset.scene;
      delete root.dataset.glass;
    };
  }, []);

  return <canvas ref={canvasRef} className="mk-canvas" aria-hidden="true" />;
}
