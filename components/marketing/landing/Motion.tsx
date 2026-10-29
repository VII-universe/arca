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
  ".l-statement__text", ".l-display--final", ".l-final .l-lead",
].join(",");

/** Whole blocks that rise in, a little after one another. */
const BLOCKS = [
  ".l-points-orbit > li", ".l-trajectory__step", ".l-guardians__figure", ".l-mech > li", ".l-guardians__text .l-note",
  ".l-atmos", ".l-points > li", ".l-whatif", ".l-plan", ".l-pricing__head .l-small", ".l-faq > details",
  ".l-galaxy__caption", ".l-final .l-btn",
].join(",");

export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const capture = new URLSearchParams(window.location.search).has("capture");
    let disposed = false;
    let ctx: { revert(): void } | null = null;

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
          const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top top", end: "bottom 75%", scrub, invalidateOnRefresh: true } });
          tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, ease: "power2.out", duration: 0.25 * H * 0.7, stagger: (0.25 * H * 0.3) / Math.max(1, lines.length - 1) }, 0);
          tl.fromTo(small, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.2 * H }, 0.08 * H);
          tl.to(lines, { yPercent: -110, ease: "power1.in", duration: 0.25 * H * 0.8, stagger: (0.25 * H * 0.2) / Math.max(1, lines.length - 1) }, hold);
          tl.to(small, { autoAlpha: 0, ease: "power1.in", duration: 0.2 * H }, hold);
          tl.set({}, {}, hold + 0.25 * H);
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
          const tl = gsap.timeline({ scrollTrigger: { trigger: pin, start: "top top", end: "bottom 75%", scrub, invalidateOnRefresh: true } });
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
          const atStop = !!el.closest(".l-stop");
          const p = passage(el, atStop ? 0.62 : 0.94, atStop ? 0.44 : 0.7, 0.18, 0);
          const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: p.start, end: p.end, scrub, invalidateOnRefresh: true } });
          tl.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: p.inDur }, 0);
          tl.to(el, { autoAlpha: 0, ease: "power1.in", duration: p.outDur }, p.outStart);
          tl.set({}, {}, p.total);
        }
      });
      // Layout settles after the scene's stills and fonts: measure once more.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    })().catch(() => { /* motion is an enhancement: the page stands without it */ });

    return () => {
      disposed = true;
      ctx?.revert();
    };
  }, []);
  return null;
}
