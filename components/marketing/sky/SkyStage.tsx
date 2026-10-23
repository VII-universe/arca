"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAtmosphere } from "../atmosphere";
import { loadCatalog } from "./catalog";
import { progressAt, READING_LINE, type WaypointMark } from "./journey";
import type { SkyEngine } from "./engine";
import dynamic from "next/dynamic";
import meadowWideWebp from "./stills/meadow-wide.webp";
import meadowTallWebp from "./stills/meadow-tall.webp";

// AVIF as plain hashed assets (the image pipeline doesn't read AVIF; these
// need no processing — they're served as rendered).
const meadowWideAvif = new URL("./stills/meadow-wide.avif", import.meta.url).href;
const meadowTallAvif = new URL("./stills/meadow-tall.avif", import.meta.url).href;

// The fixed sky behind the landing. The meadow shows at once as a still —
// rendered by this same scene from the hero's camera, with the same
// projection (fitted to the height, centred), so when the live sky has its
// first frame it fades in over it without a jump. Three.js and the
// catalogue load after the first paint. Without WebGL the still stays.

// ?perf=1 only — not part of the landing's bundle otherwise.
const PerfOverlay = dynamic(() => import("./PerfOverlay").then((m) => m.PerfOverlay), { ssr: false });

type StageState = "loading" | "live" | "fallback";
const noSubscribe = () => () => {};

export function SkyStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SkyEngine | null>(null);
  const [state, setState] = useState<StageState>("loading");
  // ?perf=1 — read on the client only (the server render never shows the panel).
  const perf = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).has("perf"), () => false);
  const [atmosphere, setAtmosphere] = useAtmosphere();
  const lenisRef = useRef<import("lenis").default | null>(null);

  // The engine is built asynchronously; it starts from whatever the
  // atmosphere is by then (the stored choice arrives after hydration).
  const atmosphereRef = useRef(atmosphere);
  useEffect(() => {
    atmosphereRef.current = atmosphere;
    engineRef.current?.setAtmosphere(atmosphere);
  }, [atmosphere]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abort = new AbortController();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    // Sections → where each one starts and where its flight (leg) starts.
    let marks: WaypointMark[] = [];
    const measure = () => {
      marks = Array.from(document.querySelectorAll<HTMLElement>("[data-waypoint]")).map((el) => {
        const r = el.getBoundingClientRect();
        const leg = el.querySelector<HTMLElement>(":scope > [data-leg]");
        return { top: r.top + window.scrollY, legStart: (leg ? leg.getBoundingClientRect().top : r.bottom) + window.scrollY };
      });
    };
    const progress = () => progressAt(marks, window.scrollY + window.innerHeight * READING_LINE);

    const boot = async () => {
      const [{ SkyEngine }, catalog] = await Promise.all([import("./engine"), loadCatalog(abort.signal)]);
      if (disposed) return;
      const engine = SkyEngine.create({
        canvas,
        catalog,
        atmosphere: atmosphereRef.current,
        reducedMotion,
        lowPower: memory <= 3,
        onReady: () => !disposed && setState("live"),
        onContextLost: () => !disposed && setState("fallback"),
      });
      if (!engine) {
        setState("fallback");
        return;
      }
      engineRef.current = engine;
      measure();
      engine.jumpTo(progress());

      const onScroll = () => engine.setProgress(progress());
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));

      const ro = new ResizeObserver(() => {
        engine.resize();
        measure();
        engine.setProgress(progress());
      });
      ro.observe(canvas);
      ro.observe(document.body);
      cleanups.push(() => ro.disconnect());

      if (window.matchMedia("(pointer: fine)").matches && !reducedMotion) {
        const onMove = (e: PointerEvent) => engine.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        window.addEventListener("pointermove", onMove, { passive: true });
        cleanups.push(() => window.removeEventListener("pointermove", onMove));
      }

      // Smooth wheel scrolling; touch keeps the native feel. Off for reduced motion.
      if (!reducedMotion) {
        const { default: Lenis } = await import("lenis");
        if (disposed) return;
        const lenis = new Lenis({ autoRaf: true });
        lenisRef.current = lenis;
        cleanups.push(() => {
          lenis.destroy();
          lenisRef.current = null;
        });
      }
    };

    // After the first paint, when the browser is idle: the text comes first.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 200);
    idle(() => {
      boot().catch(() => !disposed && setState("fallback"));
    });

    return () => {
      disposed = true;
      abort.abort();
      cleanups.forEach((c) => c());
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <>
      <div className="sky" data-state={state} aria-hidden="true">
        <div className="sky__still" />
        <picture className="sky__photo">
          <source media="(orientation: portrait)" type="image/avif" srcSet={meadowTallAvif} />
          <source media="(orientation: portrait)" type="image/webp" srcSet={meadowTallWebp.src} />
          <source type="image/avif" srcSet={meadowWideAvif} />
          <img src={meadowWideWebp.src} alt="" width={meadowWideWebp.width} height={meadowWideWebp.height} fetchPriority="high" decoding="async" />
        </picture>
        <canvas ref={canvasRef} className="sky__canvas" />
      </div>
      {perf && <PerfOverlay engineRef={engineRef} lenisRef={lenisRef} atmosphere={atmosphere} setAtmosphere={setAtmosphere} state={state} />}
    </>
  );
}
