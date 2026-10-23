"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAtmosphere } from "../atmosphere";
import { loadCatalog } from "./catalog";
import { progressAt, JOURNEY } from "./journey";
import type { SkyEngine } from "./engine";
import { PerfOverlay } from "./PerfOverlay";

// The fixed sky behind the landing. Renders a CSS night sky at once (no
// layout shift, nothing for LCP to wait on), then — after the first paint —
// loads Three.js and the catalogue, and fades the WebGL sky in over it.
// Without WebGL the CSS layer swaps to a still render of the same scene.

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

  useEffect(() => {
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

    // Section offsets → journey progress.
    const sections = () => Array.from(document.querySelectorAll<HTMLElement>("[data-waypoint]"));
    let tops: number[] = [];
    const holds = JOURNEY.map((s) => s.hold);
    const measure = () => {
      tops = sections().map((el) => el.getBoundingClientRect().top + window.scrollY);
    };
    const progress = () => progressAt(tops, holds, window.scrollY);

    const boot = async () => {
      const [{ SkyEngine }, catalog] = await Promise.all([import("./engine"), loadCatalog(abort.signal)]);
      if (disposed) return;
      const engine = SkyEngine.create({
        canvas,
        catalog,
        atmosphere,
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
    // The atmosphere is applied by its own effect; the engine is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="sky" data-state={state} aria-hidden="true">
        <div className="sky__still" />
        <canvas ref={canvasRef} className="sky__canvas" />
      </div>
      {perf && <PerfOverlay engineRef={engineRef} lenisRef={lenisRef} atmosphere={atmosphere} setAtmosphere={setAtmosphere} state={state} />}
    </>
  );
}
