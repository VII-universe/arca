"use client";

import { useEffect } from "react";

// The page's motion (brief, section 6): the words come in line by line from
// behind a mask as their section scrolls in, and leave a little later than
// they came; the larger blocks (cards, points, questions) rise in whole. Every
// tween is scrubbed by the scroll with a 0.8 s lag — the same lag the camera
// has (CosmosStage/engine: a 0.28 s time constant reaches 95 % in 0.8 s), so
// the words and the scene move as one.
//
// Loaded after the first paint; the hero's headline (the LCP) never moves.
// Without JS, or with prefers-reduced-motion, everything simply stands. In
// capture mode (?capture=1) the scrub is immediate, so captures are exact.

/** Split into masked lines: section headlines, leads, the stops' years and messages, the statement, the end. */
const LINES = [
  ".l-intro .l-h2", ".l-intro .l-lead",
  ".l-section .l-h2", ".l-section .l-lead", ".l-forwhom__lead", ".l-security__lead",
  ".l-display--final", ".l-final .l-lead",
].join(",");

/** Whole blocks that rise in, a little after one another. */
const BLOCKS = [
  ".l-points-orbit > li", ".l-trajectory__step", ".l-mech > li", ".l-guardians__text .l-note",
  ".l-atmos", ".l-points > li", ".l-whatif", ".l-plan", ".l-pricing__head .l-small", ".l-faq > details",
  ".l-galaxy__caption", ".l-final .l-btn",
].join(",");

export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const capture = new URLSearchParams(window.location.search).has("capture");
    let disposed = false;
    let ctx: { revert(): void } | null = null;
    const cleanups: (() => void)[] = [];

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText"),
      ]);
      await document.fonts.ready;
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const scrub = capture ? true : 0.8;

      ctx = gsap.context(() => {
        // The stops: the frame is pinned while the camera stands at the planet (CSS, Timeline.tsx). Over its first
        // 25 svh the year, label, message and metadata rise in line by line; then they rest (60 svh); as the camera
        // leaves (the pin's container bottom from 100 % to 75 % of the viewport) they leave upward.
        for (const pin of gsap.utils.toArray<HTMLElement>(".l-stop__pin")) {
          const H = window.innerHeight;
          const year = pin.querySelector<HTMLElement>(".l-stop__year")!, quote = pin.querySelector<HTMLElement>(".l-stop__quote")!;
          const small = pin.querySelectorAll<HTMLElement>(".l-stop__orbits, .l-stop__meta");
          const splits = [year, quote].map((el) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "l-line" }));
          const lines = splits.flatMap((sp) => sp.lines);
          const hold = pin.offsetHeight - H;            // = --hold
          const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top top", end: "bottom 75%", scrub } });
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: 0.25 * H * 0.7, stagger: (0.25 * H * 0.3) / Math.max(1, lines.length - 1) }, 0);
          tl.fromTo(small, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.2 * H }, 0.08 * H);
          tl.to(lines, { yPercent: -110, ease: "power1.in", duration: 0.25 * H * 0.8, stagger: (0.25 * H * 0.2) / Math.max(1, lines.length - 1) }, hold);
          tl.to(small, { autoAlpha: 0, ease: "power1.in", duration: 0.2 * H }, hold);
          tl.set({}, {}, hold + 0.25 * H);
        }
        // ── M5: each section's own motion ──
        const H = window.innerHeight;
        // Elements inside a frame that is actually sticky get their timeline from the pin, not from their own place
        // (ScrollTrigger measures where they would sit without sticky).
        const inStickyPin = (el: Element) => {
          const frame = el.closest("[data-pin] > .l-wrap");
          return !!frame && getComputedStyle(frame).position === "sticky";
        };
        const pinTimeline = (pin: HTMLElement, lineEls: HTMLElement[], blockEls: HTMLElement[]) => {
          const splits = lineEls.map((el) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "l-line" }));
          const lines = splits.flatMap((sp) => sp.lines);
          const total = 0.3 * H + pin.offsetHeight;   // from its top at 90 % to its bottom at 60 % of the viewport
          const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top 90%", end: "bottom 60%", scrub } });
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: 0.35 * H, stagger: (0.15 * H) / Math.max(1, lines.length - 1) }, 0);
          tl.fromTo(blockEls, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.3 * H, stagger: (0.2 * H) / Math.max(1, blockEls.length - 1) }, 0.15 * H);
          tl.to(lines, { yPercent: -110, ease: "power1.in", duration: 0.3 * H, stagger: (0.1 * H) / Math.max(1, lines.length - 1) }, total - 0.4 * H);
          tl.to(blockEls, { autoAlpha: 0, ease: "power1.in", duration: 0.3 * H }, total - 0.4 * H);
          tl.set({}, {}, total);
        };
        {
          const pin = document.querySelector<HTMLElement>('[data-pin="forWhom"]');
          if (pin && inStickyPin(pin.firstElementChild!)) {
            pinTimeline(pin, gsap.utils.toArray<HTMLElement>(pin.querySelectorAll(".l-h2, .l-lead")), gsap.utils.toArray<HTMLElement>(pin.querySelectorAll(".l-kicker, .l-points-orbit > li, .l-points-orbit__line")));
          }
        }
        // The guardians' figure is sticky beside the steps: it fades in, and goes with the section.
        {
          const fig = document.querySelector<HTMLElement>(".l-guardians__figure");
          if (fig) gsap.fromTo(fig, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: fig.closest("section"), start: "top 70%", end: "top 30%", scrub } });
        }
        const setActive = (items: HTMLElement[], k: number, attr = "data-active") => items.forEach((el, i) => el.setAttribute(attr, String(i === k)));

        // Pro koho: the five points joined one by one. Pinned on wide screens: the orbit's lit part grows across the
        // pin; on narrow screens (a vertical list, not pinned) the active point is the one at the reading line.
        {
          const ol = document.querySelector<HTMLElement>(".l-points-orbit");
          const pin = document.querySelector<HTMLElement>('[data-pin="forWhom"]');
          if (ol && pin) {
            const items = gsap.utils.toArray<HTMLElement>(".l-points-orbit > li");
            const pinned = getComputedStyle(pin.firstElementChild!).position === "sticky";
            ScrollTrigger.create({
              trigger: pinned ? pin : ol,
              start: pinned ? "top top" : "top 55%",
              end: pinned ? "bottom bottom" : "bottom 55%",
              scrub,
              onUpdate: (st) => {
                const p = st.progress;
                const k = Math.min(items.length - 1, Math.floor(p * items.length * 0.999 + (pinned ? 0 : 0)));
                setActive(items, k);
                // Lit up to the active point (its dot), on wide screens; the list's line on narrow ones.
                ol.style.setProperty("--progress", String(Math.min(1, (k + Math.min(1, (p * items.length - k) * 1.4)) / Math.max(1, items.length - 1))));
              },
            });
          }
        }

        // Jak to funguje: the trajectory draws itself and the light travels along it, stopping at each of the four
        // steps (plateaus), the active step full.
        {
          const ol = document.querySelector<HTMLElement>(".l-trajectory");
          const path = ol?.querySelector<SVGPathElement>(".l-trajectory__drawn");
          const svg = ol?.querySelector<SVGSVGElement>(".l-trajectory__line");
          const light = ol?.querySelector<HTMLElement>(".l-trajectory__light");
          const steps = gsap.utils.toArray<HTMLElement>(".l-trajectory__step");
          if (ol && path && svg && light && steps.length) {
            const n = steps.length;
            // Where along the path each step sits: the step's number's position, projected onto the path.
            const base = ol.querySelector<SVGPathElement>(".l-trajectory__base")!;
            let len = 1;
            const stops: number[] = [];
            // The path is stretched (preserveAspectRatio none) and stroked without scaling, so its dashes are screen
            // pixels: keep a table of its drawn length in pixels against the parameter t.
            const T = 200;
            const cum = new Float64Array(T + 1);
            let pxLen = 1;
            const place = () => {
              const box = svg.getBoundingClientRect();
              if (box.width < 1 || box.height < 1) return;   // not laid out (hidden on narrow screens): nothing to place
              // The trajectory runs through the stops — each just left of its step's number, where nothing is written.
              const pts = steps.map((st) => {
                const r = st.querySelector(".l-trajectory__n")!.getBoundingClientRect();
                return [((r.left - 22 - box.left) / box.width) * 100, ((r.top + r.height / 2 - box.top) / box.height) * 100] as [number, number];
              });
              // Around the cards, never across them: down the clear left side of a step's number, across the gap
              // between that step and the next, down to the next number — with rounded corners.
              const rx = (18 / box.width) * 100, ry = (18 / box.height) * 100;
              const gaps = steps.slice(0, -1).map((st, j) => {
                const a2 = st.getBoundingClientRect(), b2 = steps[j + 1].getBoundingClientRect();
                return ((((a2.bottom + b2.top) / 2) - box.top) / box.height) * 100;
              });
              const way: [number, number][] = [[pts[0][0], 0.5]];
              pts.forEach((q, j) => {
                way.push(q);
                if (j < pts.length - 1) { way.push([q[0], gaps[j]]); way.push([pts[j + 1][0], gaps[j]]); }
              });
              way.push([pts[pts.length - 1][0], 99.5]);
              let d = `M ${way[0][0].toFixed(2)} ${way[0][1].toFixed(2)}`;
              for (let i = 1; i < way.length; i++) {
                const p0 = way[i - 1], p1 = way[i], p2 = way[i + 1];
                const turn = p2 && (Math.abs(p1[0] - p0[0]) > 0.01) !== (Math.abs(p2[0] - p1[0]) > 0.01);
                if (!turn) { d += ` L ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`; continue; }
                // A corner at p1: stop short of it, curve through it.
                const inX = Math.sign(p1[0] - p0[0]), inY = Math.sign(p1[1] - p0[1]);
                const outX = Math.sign(p2[0] - p1[0]), outY = Math.sign(p2[1] - p1[1]);
                const a1: [number, number] = [p1[0] - inX * rx, p1[1] - inY * ry], b1: [number, number] = [p1[0] + outX * rx, p1[1] + outY * ry];
                d += ` L ${a1[0].toFixed(2)} ${a1[1].toFixed(2)} Q ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} ${b1[0].toFixed(2)} ${b1[1].toFixed(2)}`;
              }
              base.setAttribute("d", d);
              path.setAttribute("d", d);
              len = path.getTotalLength();
              cum[0] = 0;
              let prev = path.getPointAtLength(0);
              const tAt: number[] = pts.map(() => 0), best: number[] = pts.map(() => Infinity);
              for (let k = 1; k <= T; k++) {
                const pt = path.getPointAtLength((k / T) * len);
                cum[k] = cum[k - 1] + Math.hypot(((pt.x - prev.x) / 100) * box.width, ((pt.y - prev.y) / 100) * box.height);
                prev = pt;
                pts.forEach((q, j) => { const dd = Math.hypot(pt.x - q[0], pt.y - q[1]); if (dd < best[j]) { best[j] = dd; tAt[j] = k / T; } });
              }
              pxLen = cum[T] || 1;
              path.style.strokeDasharray = `${pxLen} ${pxLen}`;
              stops.length = 0;
              stops.push(...tAt);
            };
            place();
            ScrollTrigger.addEventListener("refreshInit", place);
            ScrollTrigger.create({
              trigger: ol,
              start: "top 62%",
              end: "bottom 62%",
              scrub,
              onUpdate: (st) => {
                if (stops.length < n) return;   // not placed (hidden on narrow screens)
                // A staircase: travel between steps over 40 % of each interval, stand at each step for the rest.
                const x = st.progress * (n - 1);
                const k = Math.min(n - 2, Math.floor(x));
                const f = x - k;
                const move = Math.min(1, Math.max(0, (f - 0.3) / 0.4));
                const e = move * move * (3 - 2 * move);
                const t = stops[k] + (stops[k + 1] - stops[k]) * e;
                setActive(steps, Math.round(k + e));
                const drawn = cum[Math.min(T, Math.round(t * T))];
                path.style.strokeDashoffset = String(pxLen - drawn);
                // The light stands beside a step's number; between steps it fades out and comes up at the next one
                // (the path runs under the steps' words, and the light never crosses words).
                const at = e < 0.5 ? stops[k] : stops[k + 1];
                light.style.opacity = String(e < 0.5 ? 1 - e * 2 : (e - 0.5) * 2);
                const pt = path.getPointAtLength(at * len);
                const box = svg.getBoundingClientRect(), obox = ol.getBoundingClientRect();
                light.style.setProperty("--lx", `${box.left - obox.left + (pt.x / 100) * box.width}px`);
                light.style.setProperty("--ly", `${box.top - obox.top + (pt.y / 100) * box.height}px`);
              },
            });
          }
        }

        // Strážci: the figure plays the mechanism with the steps of the text — the ring drains over step 1, the
        // pulses go out over step 2, one comes back and the ring refills over step 3, over step 4 nobody answers,
        // the guardians fade a little and the light goes on its way.
        {
          const fig = document.querySelector<SVGSVGElement>(".l-guardians__figure");
          const mech = document.querySelector<HTMLElement>(".l-mech");
          const items = gsap.utils.toArray<HTMLElement>(".l-mech > li");
          if (fig && mech && items.length === 4) {
            const q = (sel: string) => fig.querySelector(sel)!;
            const along = (el: Element) => ({ x1: +el.getAttribute("data-x1")!, y1: +el.getAttribute("data-y1")!, x2: +el.getAttribute("data-x2")!, y2: +el.getAttribute("data-y2")! });
            const pa = q(".l-g-pulse--a"), pb = q(".l-g-pulse--b"), pk = q(".l-g-pulse--back");
            const A = along(pa), B = along(pb), K = along(pk);
            const tl = gsap.timeline({ defaults: { ease: "none" } });
            // 1: the countdown ring drains.
            tl.to(q(".l-g-ring"), { strokeDashoffset: 0.98, duration: 1 }, 0);
            // 2: two pulses out, along the threads.
            tl.fromTo([pa, pb], { opacity: 0 }, { opacity: 1, duration: 0.1 }, 1);
            tl.fromTo(pa, { attr: { cx: A.x1, cy: A.y1 } }, { attr: { cx: A.x2, cy: A.y2 }, duration: 0.8 }, 1.1);
            tl.fromTo(pb, { attr: { cx: B.x1, cy: B.y1 } }, { attr: { cx: B.x2, cy: B.y2 }, duration: 0.8 }, 1.1);
            tl.to([pa, pb], { opacity: 0, duration: 0.1 }, 1.9);
            // 3: one guardian answers — a pulse back, the ring refills.
            tl.fromTo(pk, { opacity: 0, attr: { cx: K.x1, cy: K.y1 } }, { opacity: 1, duration: 0.1 }, 2);
            tl.to(pk, { attr: { cx: K.x2, cy: K.y2 }, duration: 0.6 }, 2.1);
            tl.to(pk, { opacity: 0, duration: 0.1 }, 2.7);
            tl.to(q(".l-g-ring"), { strokeDashoffset: 0, duration: 0.3 }, 2.7);
            // 4: the other path — nobody answers: the ring drains again, the guardians stay quiet, the light leaves.
            tl.to(q(".l-g-ring"), { strokeDashoffset: 0.98, duration: 0.5 }, 3);
            tl.to(fig.querySelectorAll(".l-g-planet"), { opacity: 0.45, duration: 0.3 }, 3.1);
            tl.to(q(".l-g-ray"), { strokeDashoffset: 0, duration: 0.5 }, 3.5);
            tl.set({}, {}, 4);
            ScrollTrigger.create({
              trigger: mech,
              start: "top 60%",
              end: "bottom 45%",
              scrub,
              animation: tl,
              onUpdate: (st) => {
                mech.setAttribute("data-active", "");
                setActive(items, Math.min(3, Math.floor(st.progress * 4 * 0.999)), "data-current");
              },
            });
          }
        }

        // The statement: pinned like a stop — its lines rise in as the pin starts, stand, and leave as it ends.
        {
          const pin = document.querySelector<HTMLElement>('[data-pin="statement"]');
          const text = pin?.querySelector<HTMLElement>(".l-statement__text");
          if (pin && text) {
            const split = SplitText.create(text, { type: "lines", mask: "lines", linesClass: "l-line" });
            const hold = pin.offsetHeight - H;
            const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top 60%", end: "bottom 40%", scrub } });
            const total = hold + 0.4 * H + 0.4 * H;
            tl.fromTo(split.lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: 0.45 * H, stagger: 0.1 * H / Math.max(1, split.lines.length - 1) }, 0);
            tl.to(split.lines, { yPercent: -110, ease: "power1.in", duration: 0.45 * H, stagger: 0.1 * H / Math.max(1, split.lines.length - 1) }, total - 0.5 * H);
            tl.set({}, {}, total);
          }
        }

        // Lines: in from below the mask while the element's top runs from 90 % to 62 % of the viewport (at a stop:
        // from 56 % to 34 %, i.e. once the camera has arrived at its planet); out upward, later, while its bottom
        // runs from 24 % to 4 %.
        // One timeline per element over its whole passage — from its top at `inAt` of the viewport to its bottom at
        // `outEnd` — with the in and out segments placed at their share of that scroll distance.
        const passage = (el: HTMLElement, inAt: number, inEnd: number, outAt: number, outEnd: number) => {
          const H = window.innerHeight, h = el.offsetHeight;
          const total = (inAt - outEnd) * H + h;
          return { total, inDur: (inAt - inEnd) * H, outStart: total - (outAt - outEnd) * H, outDur: (outAt - outEnd) * H, start: `top ${inAt * 100}%`, end: `bottom ${outEnd * 100}%` };
        };
        // The stops: the frame is pinned while the camera stands at the planet (CSS, Timeline.tsx). Over its first
        // 25 svh the year, label, message and metadata rise in line by line; then they rest (60 svh); as the camera
        // leaves (the pin's container bottom from 100 % to 75 % of the viewport) they leave upward.
        for (const pin of gsap.utils.toArray<HTMLElement>(".l-stop__pin")) {
          const H = window.innerHeight;
          const year = pin.querySelector<HTMLElement>(".l-stop__year")!, quote = pin.querySelector<HTMLElement>(".l-stop__quote")!;
          const small = pin.querySelectorAll<HTMLElement>(".l-stop__orbits, .l-stop__meta");
          const splits = [year, quote].map((el) => SplitText.create(el, { type: "lines", mask: "lines", linesClass: "l-line" }));
          const lines = splits.flatMap((sp) => sp.lines);
          const hold = pin.offsetHeight - H;            // = --hold
          const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top top", end: "bottom 75%", scrub } });
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: 0.25 * H * 0.7, stagger: (0.25 * H * 0.3) / Math.max(1, lines.length - 1) }, 0);
          tl.fromTo(small, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.2 * H }, 0.08 * H);
          tl.to(lines, { yPercent: -110, ease: "power1.in", duration: 0.25 * H * 0.8, stagger: (0.25 * H * 0.2) / Math.max(1, lines.length - 1) }, hold);
          tl.to(small, { autoAlpha: 0, ease: "power1.in", duration: 0.2 * H }, hold);
          tl.set({}, {}, hold + 0.25 * H);
        }
        // Lines: in from below the mask while the element's top runs from 90 % to 62 % of the viewport (at a stop:
        // from 56 % to 34 %, once the camera has arrived at its planet); out upward, later, while its bottom runs
        // from 24 % to 4 %.
        for (const el of gsap.utils.toArray<HTMLElement>(LINES)) {
          if (inStickyPin(el)) continue;
          const atStop = !!el.closest(".l-stop");
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            linesClass: "l-line",
            autoSplit: true,
            onSplit(self) {
              const p = passage(el, atStop ? 0.56 : 0.9, atStop ? 0.34 : 0.62, 0.24, 0.04);
              const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: p.start, end: p.end, scrub } });
              tl.fromTo(self.lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: p.inDur * 0.7, stagger: (p.inDur * 0.3) / Math.max(1, self.lines.length - 1) }, 0);
              tl.to(self.lines, { yPercent: -110, ease: "power1.in", duration: p.outDur * 0.8, stagger: (p.outDur * 0.2) / Math.max(1, self.lines.length - 1) }, p.outStart);
              tl.set({}, {}, p.total);
              return tl;
            },
          });
        }
        // Blocks: rise in, fade out late.
        for (const el of gsap.utils.toArray<HTMLElement>(BLOCKS)) {
          if (inStickyPin(el)) continue;
          const atStop = !!el.closest(".l-stop");
          const p = passage(el, atStop ? 0.62 : 0.94, atStop ? 0.44 : 0.7, 0.18, 0);
          const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: p.start, end: p.end, scrub } });
          tl.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: p.inDur }, 0);
          tl.to(el, { autoAlpha: 0, ease: "power1.in", duration: p.outDur }, p.outStart);
          tl.set({}, {}, p.total);
        }
      });
      // Layout settles after the scene's stills and fonts: measure once more.
      requestAnimationFrame(() => ScrollTrigger.refresh());

      // An answer opening (or closing) in the FAQ moves everything below it: measure again once it has eased open.
      let refreshT = 0;
      const onToggle = (e: Event) => {
        if (!(e.target instanceof HTMLDetailsElement)) return;
        clearTimeout(refreshT);
        refreshT = window.setTimeout(() => ScrollTrigger.refresh(), 600);
      };
      document.addEventListener("toggle", onToggle, true);
      // The obsidian cards' sheen follows the pointer (landing.css, .l-card::before).
      const onPointer = (e: PointerEvent) => {
        const card = (e.target as Element | null)?.closest?.<HTMLElement>(".l-card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      };
      if (window.matchMedia("(pointer: fine)").matches) document.addEventListener("pointermove", onPointer, { passive: true });
      cleanups.push(() => {
        clearTimeout(refreshT);
        document.removeEventListener("toggle", onToggle, true);
        document.removeEventListener("pointermove", onPointer);
      });
    })().catch(() => { /* motion is an enhancement: the page stands without it */ });

    return () => {
      disposed = true;
      ctx?.revert();
      cleanups.forEach((c) => c());
    };
  }, []);
  return null;
}
