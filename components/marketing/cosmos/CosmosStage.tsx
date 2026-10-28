"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useAtmosphere } from "../atmosphere";
import { loadCatalog } from "./catalog";
import { progressAt, scrollForProgress, holdAt, READING_LINE, JOURNEY, STOP_YEARS, type WaypointMark } from "./journey";
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
  hero: "earth", liftoff: "earth", y2032: "orbits", y2044: "orbits", y2051: "saturn", y2070: "orbits",
  forWhom: "orbits", how: "galaxy", guardians: "galaxy", statement: "galaxy", atmospheres: "galaxy", security: "galaxy",
  pricing: "galaxy", faq: "galaxy", galaxy: "galaxy", home: "earth",
};

declare global {
  interface Window {
    __cosmos?: { engine: CosmosEngine; setProgress: (s: number) => void; scrollTo: (s: number) => void; setScroll: (y: number) => void; step: (dt: number) => void; pageEnd: () => number };
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
    let waypoints: HTMLElement[] = [];
    const measure = () => {
      waypoints = Array.from(document.querySelectorAll<HTMLElement>("[data-waypoint]"));
      marks = waypoints.map((el) => {
        const r = el.getBoundingClientRect();
        const leg = el.querySelector<HTMLElement>(":scope > [data-leg]");
        return { top: r.top + window.scrollY, legStart: (leg ? leg.getBoundingClientRect().top : r.bottom) + window.scrollY };
      });
    };
    const readingY = () => window.scrollY + window.innerHeight * READING_LINE;
    const progress = () => progressAt(marks, readingY());
    // At a stop the message's light settles where the sample's words begin (just left of the quote's first line).
    const anchorFor = (s: number): [number, number] | null => {
      if (!Number.isInteger(s)) return null;
      const el = waypoints[s];
      if (!el || !(el.dataset.waypoint! in STOP_YEARS)) return null;
      const quote = el.querySelector<HTMLElement>(".l-stop__quote");
      if (!quote) return null;
      const r = quote.getBoundingClientRect();
      const portrait = window.innerWidth < window.innerHeight;
      const x = portrait ? r.left + r.width / 2 : r.left - 22;
      const y = portrait ? r.top - 26 : r.top + 18;
      // NDC in the engine's reference frame (16:9 landscape, 9:16 portrait): the scene is fitted to the height.
      const ref = portrait ? 9 / 16 : 16 / 9;
      const nx = ((x / window.innerWidth) * 2 - 1) * ((window.innerWidth / window.innerHeight) / ref);
      return [nx, 1 - (y / window.innerHeight) * 2];
    };
    const apply = (engine: CosmosEngine, s: number) => {
      engine.setProgress(s);
      engine.setHold(holdAt(marks, readingY()));
      engine.setAnchor(anchorFor(s));
      setStill(stillFor(s));
    };
    const stillFor = (s: number) => STILL_OF[JOURNEY[Math.min(JOURNEY.length - 1, Math.round(s))].id] ?? "earth";

    const boot = async () => {
      const [{ CosmosEngine }, catalog] = await Promise.all([import("./engine"), loadCatalog(abort.signal)]);
      if (disposed) return;
      const jdParam = params.get("jd");
      const engine = CosmosEngine.create({
        canvas, catalog, atmosphere: atmosphereRef.current, reducedMotion, lowPower: memory <= 3,
        baseJd: jdParam ? Number(jdParam) : undefined,
        spin0: params.has("spin") ? Number(params.get("spin")) : undefined,
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
        // The capture scripts drive the camera (setProgress) or the page itself (scrollTo: the page scrolls
        // to where that progress is read, the camera jumps there, no lag) — the ride videos use the latter.
        window.__cosmos = {
          engine,
          setProgress: (s) => engine.jumpTo(s),
          scrollTo: (s) => {
            measure();
            // A whole number is a section: its top at the top of the viewport (the camera holds there anyway).
            const y = Number.isInteger(s) && marks[s] ? marks[s].top : scrollForProgress(marks, s) - window.innerHeight * READING_LINE;
            window.scrollTo(0, Math.max(0, y));
            apply(engine, s);
            engine.jumpTo(s);
          },
          setScroll: (y) => {
            measure();
            window.scrollTo(0, y);
            const s = progress();
            apply(engine, s);
            engine.jumpTo(s);
          },
          // Deterministic time for the ride videos: the clock stops, each frame advances it by dt.
          step: (dt) => {
            engine.pause();
            engine.step(dt);
          },
          pageEnd: () => { measure(); return marks.length - 1; },
        };
        engine.jumpTo(Number(params.get("t") ?? 0));
      } else {
        engine.jumpTo(progress());
        apply(engine, progress());
        const onScroll = () => apply(engine, progress());
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));
      }

      const ro = new ResizeObserver(() => {
        engine.resize();
        measure();
        if (!capture) apply(engine, progress());
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
