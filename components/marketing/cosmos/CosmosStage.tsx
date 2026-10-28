"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useAtmosphere } from "../atmosphere";
import { loadCatalog } from "./catalog";
import { progressAt, READING_LINE, JOURNEY, type WaypointMark } from "./journey";
import type { CosmosEngine } from "./engine";

// The fixed scene behind the landing. The Earth shows at once as a still —
// rendered by this same scene from the hero's camera, with the same
// projection — so when the live scene has its first textured frame it
// fades in over it without a jump. Three.js, the catalogue and the
// textures load after the first paint. Without WebGL the stills stay and
// change with the scroll.

const PerfOverlay = dynamic(() => import("./PerfOverlay").then((m) => m.PerfOverlay), { ssr: false });

type StageState = "loading" | "live" | "fallback";
const noSubscribe = () => () => {};
const STILLS = ["earth", "orbits", "saturn", "galaxy"] as const;
/** Which still each waypoint shows without WebGL. */
const STILL_OF: Record<string, (typeof STILLS)[number]> = {
  hero: "earth", liftoff: "earth", y2032: "orbits", y2044: "orbits", y2051: "orbits", y2070: "orbits",
  forWhom: "orbits", how: "saturn", guardians: "saturn", statement: "saturn", atmospheres: "galaxy", security: "galaxy",
  pricing: "galaxy", faq: "galaxy", galaxy: "galaxy", home: "earth",
};

declare global {
  interface Window {
    __cosmos?: { engine: CosmosEngine; setProgress: (s: number) => void };
  }
}

export function CosmosStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CosmosEngine | null>(null);
  const [state, setState] = useState<StageState>("loading");
  const [still, setStill] = useState<(typeof STILLS)[number]>("earth");
  const perf = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).has("perf"), () => false);
  const [atmosphere, setAtmosphere] = useAtmosphere();
  const lenisRef = useRef<import("lenis").default | null>(null);

  const atmosphereRef = useRef(atmosphere);
  useEffect(() => {
    atmosphereRef.current = atmosphere;
    engineRef.current?.setAtmosphere(atmosphere);
  }, [atmosphere]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abort = new AbortController();
    const params = new URLSearchParams(window.location.search);
    // ?capture=1: the capture scripts drive the progress themselves (no scroll, fixed time).
    const capture = params.has("capture");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    let marks: WaypointMark[] = [];
    const measure = () => {
      marks = Array.from(document.querySelectorAll<HTMLElement>("[data-waypoint]")).map((el) => {
        const r = el.getBoundingClientRect();
        const leg = el.querySelector<HTMLElement>(":scope > [data-leg]");
        return { top: r.top + window.scrollY, legStart: (leg ? leg.getBoundingClientRect().top : r.bottom) + window.scrollY };
      });
    };
    const progress = () => progressAt(marks, window.scrollY + window.innerHeight * READING_LINE);
    const stillFor = (s: number) => STILL_OF[JOURNEY[Math.min(JOURNEY.length - 1, Math.round(s))].id] ?? "earth";

    const boot = async () => {
      const [{ CosmosEngine }, catalog] = await Promise.all([import("./engine"), loadCatalog(abort.signal)]);
      if (disposed) return;
      const jdParam = params.get("jd");
      const engine = CosmosEngine.create({
        canvas, catalog, atmosphere: atmosphereRef.current, reducedMotion, lowPower: memory <= 3,
        baseJd: jdParam ? Number(jdParam) : undefined,
        onReady: () => !disposed && setState("live"),
        onContextLost: () => !disposed && setState("fallback"),
      });
      if (!engine) {
        setState("fallback");
        return;
      }
      engineRef.current = engine;
      measure();
      if (capture) {
        window.__cosmos = { engine, setProgress: (s) => engine.jumpTo(s) };
        engine.jumpTo(Number(params.get("t") ?? 0));
      } else {
        engine.jumpTo(progress());
        const onScroll = () => {
          const s = progress();
          engine.setProgress(s);
          setStill(stillFor(s));
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      }

      const ro = new ResizeObserver(() => {
        engine.resize();
        measure();
        if (!capture) engine.setProgress(progress());
      });
      ro.observe(canvas);
      ro.observe(document.body);
      cleanups.push(() => ro.disconnect());

      if (window.matchMedia("(pointer: fine)").matches && !reducedMotion && !capture) {
        const onMove = (e: PointerEvent) => engine.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        window.addEventListener("pointermove", onMove, { passive: true });
        cleanups.push(() => window.removeEventListener("pointermove", onMove));
      }

      if (!reducedMotion && !capture) {
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

    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 200);
    idle(() => {
      boot().catch((err: unknown) => {
        if (disposed || (err instanceof DOMException && err.name === "AbortError")) return;
        console.error("[cosmos]", err);
        setState("fallback");
      });
    });

    // Without WebGL the still follows the scroll.
    const onScrollStill = () => {
      measure();
      setStill(stillFor(progress()));
    };
    window.addEventListener("scroll", onScrollStill, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScrollStill));

    return () => {
      disposed = true;
      abort.abort();
      cleanups.forEach((c) => c());
      engineRef.current?.dispose();
      engineRef.current = null;
      delete window.__cosmos;
    };
  }, []);

  return (
    <>
      <div className="cosmos" data-state={state} data-still={still} aria-hidden="true">
        <div className="cosmos__still" />
        {STILLS.map((s) => (
          <picture key={s} className="cosmos__photo" data-still={s}>
            <source media="(orientation: portrait)" type="image/avif" srcSet={`/cosmos/stills/${s}-tall.avif`} />
            <source type="image/avif" srcSet={`/cosmos/stills/${s}-wide.avif`} />
            <img src={`/cosmos/stills/${s}-wide.jpg`} alt="" width={1920} height={1080} fetchPriority={s === "earth" ? "high" : "low"} decoding="async" loading={s === "earth" ? "eager" : "lazy"} />
          </picture>
        ))}
        <canvas ref={canvasRef} className="cosmos__canvas" />
      </div>
      {perf && <PerfOverlay engineRef={engineRef} lenisRef={lenisRef} atmosphere={atmosphere} setAtmosphere={setAtmosphere} state={state} />}
    </>
  );
}
