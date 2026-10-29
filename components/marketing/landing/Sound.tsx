"use client";

import { useEffect, useRef, useState } from "react";

// Optional sound (brief, section 6): off by default, on only from this button
// (a user gesture, so the browser allows it), never remembered across
// visits. Everything is synthesised with Web Audio — no files to load:
//  - a very quiet, deep tone (a low fifth through a slowly breathing
//    low-pass), which darkens and quietens as the camera goes further out;
//  - a soft two-note chime when a message is sealed in the hero.
// It pauses with the tab and fades in and out over a second or two.

const LEVEL = 0.05;        // the tone's peak gain; the chime sits just above it

type Rig = { ctx: AudioContext; master: GainNode; filter: BiquadFilterNode; stop: () => void; pending?: number };

function build(): Rig {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  filter.Q.value = 0.4;
  filter.connect(master);

  // A low A and its fifth, the fifth a hair detuned so the tone slowly beats.
  const voices: [OscillatorType, number, number][] = [["sine", 55, 0.9], ["triangle", 82.6, 0.22], ["sine", 110.15, 0.18]];
  const oscs = voices.map(([type, f, g]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const gain = ctx.createGain();
    gain.gain.value = g;
    o.connect(gain).connect(filter);
    o.start();
    return o;
  });
  // The breath: the filter opens and closes once every ~18 s.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / 18;
  const depth = ctx.createGain();
  depth.gain.value = 90;
  lfo.connect(depth).connect(filter.frequency);
  lfo.start();

  return {
    ctx, master, filter,
    stop: () => { [...oscs, lfo].forEach((o) => o.stop()); void ctx.close(); },
  };
}

function chime(rig: Rig) {
  const { ctx, master } = rig;
  const t = ctx.currentTime;
  // C5 then G5, bell-soft: a quick rise, a long fall.
  [[523.25, 0], [783.99, 0.16]].forEach(([f, delay]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(0.5, t + delay + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.6);
    o.connect(g).connect(master);
    o.start(t + delay);
    o.stop(t + delay + 2.7);
  });
}

/** The sound's state for the whole navigation (one tone however many buttons show it). */
export function useSound(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    if (!on) return;
    const r = rig.current ?? (rig.current = build());
    clearTimeout(r.pending);
    void r.ctx.resume();
    const now = r.ctx.currentTime;
    r.master.gain.cancelScheduledValues(now);
    r.master.gain.setTargetAtTime(LEVEL, now, 0.8);

    // Further out, darker and quieter: from the hero to the Galaxy.
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, window.scrollY / max);
      const t = r.ctx.currentTime;
      r.filter.frequency.setTargetAtTime(420 - 220 * p, t, 0.6);
      r.master.gain.setTargetAtTime(LEVEL * (1 - 0.35 * p), t, 0.6);
    };
    onScroll();
    const onSeal = () => chime(r);
    const onVisibility = () => void (document.hidden ? r.ctx.suspend() : r.ctx.resume());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("arca:seal", onSeal);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("arca:seal", onSeal);
      document.removeEventListener("visibilitychange", onVisibility);
      const t = r.ctx.currentTime;
      r.master.gain.cancelScheduledValues(t);
      r.master.gain.setTargetAtTime(0, t, 0.4);
      // Once faded out, the audio thread rests.
      const rest = window.setTimeout(() => void r.ctx.suspend(), 2500);
      r.pending = rest;
    };
  }, [on]);

  useEffect(() => () => { clearTimeout(rig.current?.pending); rig.current?.stop(); rig.current = null; }, []);
  return [on, () => setOn((v) => !v)];
}

export function SoundButton({ label, on, onToggle, className = "" }: { label: string; on: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" className={`l-sound ${className}`} aria-pressed={on} onClick={onToggle}>
      <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
        {[1, 5, 9, 13, 17].map((x, i) => (
          <line key={x} className="l-sound__bar" style={{ animationDelay: `${-i * 0.27}s` }} x1={x} x2={x} y1="3" y2="11" />
        ))}
      </svg>
      <span className="l-sound__label">{label}</span>
    </button>
  );
}
