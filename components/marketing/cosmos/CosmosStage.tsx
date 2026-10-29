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
    // The page's accents follow the atmosphere too (landing.css, .l-body[data-atmosphere]).
    document.body.dataset.atmosphere = atmosphere;
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
    // The message's light never crosses the words. Whenever text is on screen it rests at a spot clear of every
    // text box (at a stop, by preference just left of the sample's first line); between sections it leads the flight.
    const TEXT = "h1,h2,h3,p,li,dt,dd,summary,blockquote,a,button,label,textarea,.l-kicker,.l-badge,.l-index";
    const LIGHT_R = 44;   // the sprite's bloom, px
    const toNdc = (x: number, y: number): [number, number] => {
      // NDC in the engine's reference frame (16:9 landscape, 9:16 portrait): the scene is fitted to the height.
      const portrait = window.innerWidth < window.innerHeight;
      const ref = portrait ? 9 / 16 : 16 / 9;
      return [((x / window.innerWidth) * 2 - 1) * ((window.innerWidth / window.innerHeight) / ref), 1 - (y / window.innerHeight) * 2];
    };
    let lastSpot: [number, number] | null = null;
    const anchorFor = (s: number): [number, number] | null => {
      const W = window.innerWidth, H = window.innerHeight;
      // The words themselves (the glyphs' box of each innermost text element), not their layout boxes.
      const rects: DOMRect[] = [];
      const range = document.createRange();
      for (const el of document.querySelectorAll<HTMLElement>(`main :is(${TEXT})`)) {
        if (el.closest("details:not([open])") && el.tagName !== "SUMMARY") continue;
        if (el.querySelector(TEXT)) continue;                    // a container: its children are measured
        if (!(el.textContent ?? "").trim()) continue;
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        // Words just outside the viewport count too: they are about to scroll in, and the light must be gone by then.
        if (r.width < 2 || r.height < 2 || r.bottom < -240 || r.top > H + 240) continue;
        rects.push(r);
      }
      if (rects.length === 0) { lastSpot = null; return null; }
      // How far the light's box is from the nearest word (negative: overlapping).
      const clearance = (x: number, y: number) => {
        let m = Infinity;
        for (const r of rects) {
          const dx = Math.max(r.left - (x + LIGHT_R), (x - LIGHT_R) - r.right, 0);
          const dy = Math.max(r.top - (y + LIGHT_R), (y - LIGHT_R) - r.bottom, 0);
          const overlap = dx === 0 && dy === 0;
          m = Math.min(m, overlap ? -1 : Math.hypot(dx, dy));
        }
        return m;
      };
      const inside = (x: number, y: number) => x > LIGHT_R && x < W - LIGHT_R && y > LIGHT_R + 60 && y < H - LIGHT_R;
      const KEEP = 170, NEED = 200;   // leave a spot before the words come within KEEP px (the blink takes a few frames); a new spot needs NEED
      // At a stop: beside the sample's first line, if that stays clear.
      const el = Number.isInteger(s) ? waypoints[s] : undefined;
      if (el && el.dataset.waypoint! in STOP_YEARS) {
        const quote = el.querySelector<HTMLElement>(".l-stop__quote");
        if (quote) {
          const r = quote.getBoundingClientRect();
          const portrait = W < H;
          const x = portrait ? r.left + r.width / 2 : r.left - LIGHT_R - 10, y = portrait ? r.top - LIGHT_R - 12 : r.top + 18;
          if (inside(x, y) && clearance(x, y) > 8) { lastSpot = [x, y]; return toNdc(x, y); }
        }
      }
      // Otherwise a spot far from every word, kept while the words stay away; gone when there is none.
      if (lastSpot && inside(...lastSpot) && clearance(...lastSpot) >= KEEP) return toNdc(...lastSpot);
      let best: [number, number] | null = null, bestC = NEED;
      for (let gy = 0.1; gy <= 0.92; gy += 0.04) for (let gx = 0.05; gx <= 0.95; gx += 0.05) {
        const x = gx * W, y = gy * H;
        if (!inside(x, y)) continue;
        const c = clearance(x, y);
        if (c > bestC) { bestC = c; best = [x, y]; }
      }
      lastSpot = best;
      return best ? toNdc(best[0], best[1]) : [NaN, NaN];
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

      // The hero's composer: rings per year, and the sealing of a message.
      const onYears = (e: Event) => { const d = (e as CustomEvent<{ years: number; gone: boolean }>).detail; engine.setHeroYears(d.years, d.gone); };
      const onSeal = (e: Event) => {
        const d = (e as CustomEvent<{ from: [number, number]; avoid?: { x0: number; x1: number } }>).detail;
        engine.sealMessage(toNdc(d.from[0], d.from[1]), d.avoid ?? null);
      };
      const onSkip = () => engine.skipSeal();
      const onUnseal = () => engine.unseal();
      const onScrollTo = (e: Event) => {
        const y = (e as CustomEvent<{ y: number }>).detail.y;
        if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 0.9 });
        else window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
      };
      if (window.__arcaYears) engine.setHeroYears(window.__arcaYears.years, window.__arcaYears.gone);   // the card rendered first
      window.addEventListener("arca:scroll", onScrollTo);
      cleanups.push(() => window.removeEventListener("arca:scroll", onScrollTo));
      window.addEventListener("arca:years", onYears);
      window.addEventListener("arca:seal", onSeal);
      window.addEventListener("arca:seal-skip", onSkip);
      window.addEventListener("arca:unseal", onUnseal);
      cleanups.push(() => {
        window.removeEventListener("arca:years", onYears);
        window.removeEventListener("arca:seal", onSeal);
        window.removeEventListener("arca:seal-skip", onSkip);
        window.removeEventListener("arca:unseal", onUnseal);
      });

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
