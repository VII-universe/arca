"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { BenchResult, CosmosEngine, CosmosStats } from "./engine";
import type { Atmosphere } from "../atmosphere";

// ?perf=1 — live numbers for measuring on real phones, plus a fixed 40 s run
// through the whole journey whose summary can be copied and sent back.

const ATMOS: { id: Atmosphere; label: string }[] = [
  { id: "nebula", label: "Výchozí" },
  { id: "sunset", label: "Soumrak" },
  { id: "ocean", label: "Oceán" },
  { id: "midnight", label: "Půlnoc" },
  { id: "stars", label: "Hvězdy" },
];
const BENCH_SECONDS = 40;

function summary(stats: CosmosStats | null, bench: BenchResult | null): string {
  const lines = [
    `ARCA cosmos perf · ${new Date().toISOString().slice(0, 16)}`,
    `UA: ${navigator.userAgent}`,
    stats ? `GPU: ${stats.gpu} · ${stats.width}×${stats.height} px · scale ${stats.scale} · DPR ${stats.dpr} · ${stats.stars} hvězd · textury ${stats.textures}` : "",
  ];
  if (bench) {
    lines.push(`Test ${bench.seconds.toFixed(0)} s, ${bench.frames} snímků: průměr ${bench.avgFps.toFixed(1)} fps, 1% low ${bench.low1Fps.toFixed(1)} fps`);
    for (const s of bench.sections) lines.push(`  ${s.label}: ${s.avgFps.toFixed(1)} fps`);
  }
  return lines.filter(Boolean).join("\n");
}

export function PerfOverlay({
  engineRef, lenisRef, atmosphere, setAtmosphere, state,
}: {
  engineRef: RefObject<CosmosEngine | null>;
  lenisRef: RefObject<import("lenis").default | null>;
  atmosphere: Atmosphere;
  setAtmosphere: (a: Atmosphere) => void;
  state: string;
}) {
  const [stats, setStats] = useState<CosmosStats | null>(null);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [running, setRunning] = useState(0);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => setStats(engineRef.current?.stats() ?? null), 500);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf.current);
    };
  }, [engineRef]);

  const scrollTo = (y: number) => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };

  const runBench = () => {
    const engine = engineRef.current;
    if (!engine || running) return;
    setBench(null);
    scrollTo(0);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) {
        t0 = now;
        engine.startBenchmark();
      }
      const t = (now - t0) / 1000;
      setRunning(Math.min(1, t / BENCH_SECONDS));
      scrollTo(max * Math.min(1, t / BENCH_SECONDS));
      if (t < BENCH_SECONDS + 1) raf.current = requestAnimationFrame(step);
      else {
        setBench(engine.stopBenchmark());
        setRunning(0);
      }
    };
    // Let the camera settle at the top first.
    window.setTimeout(() => (raf.current = requestAnimationFrame(step)), 1500);
    setRunning(0.0001);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary(stats, bench));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the text is on screen to retype.
    }
  };

  return (
    <aside className="cosmos-perf" data-collapsed={collapsed} aria-label="Měření výkonu scény">
      {/* Tap the number to fold the panel away from the scene. */}
      <button type="button" className="cosmos-perf__fps" aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
        {stats ? stats.fps.toFixed(0) : "–"} <small>fps{running > 0 ? ` · test ${Math.round(running * 100)} %` : ""}</small>
      </button>
      {collapsed ? null : stats ? (
        <dl>
          <div><dt>snímek</dt><dd>{stats.frameMs.toFixed(1)} ms</dd></div>
          <div><dt>render</dt><dd>{stats.width}×{stats.height} · {Math.round(stats.scale * 100)} % · DPR {stats.dpr}</dd></div>
          <div><dt>GPU</dt><dd>{stats.gpu}</dd></div>
          <div><dt>sekce</dt><dd>{stats.section} · {stats.progress.toFixed(2)}</dd></div>
          <div><dt>kamera</dt><dd>{stats.distance} od Slunce · textury {stats.textures}</dd></div>
        </dl>
      ) : (
        <p>Scéna: {state}</p>
      )}
      {!collapsed && <>
      <div className="cosmos-perf__row">
        {ATMOS.map((a) => (
          <button key={a.id} type="button" aria-pressed={atmosphere === a.id} onClick={() => setAtmosphere(a.id)}>{a.label}</button>
        ))}
      </div>
      <div className="cosmos-perf__row">
        <button type="button" onClick={runBench} disabled={!stats || running > 0}>
          {running > 0 ? `Test běží… ${Math.round(running * 100)} %` : `Spustit test (${BENCH_SECONDS} s)`}
        </button>
        <button type="button" onClick={copy}>{copied ? "Zkopírováno" : "Kopírovat výsledek"}</button>
      </div>
      </>}
      {bench && !collapsed && (
        <div className="cosmos-perf__bench">
          <p><b>{bench.avgFps.toFixed(1)} fps</b> průměr · 1% low {bench.low1Fps.toFixed(1)} fps</p>
          <ul>
            {bench.sections.map((s) => <li key={s.label}>{s.label}: {s.avgFps.toFixed(0)} fps</li>)}
          </ul>
        </div>
      )}
    </aside>
  );
}
