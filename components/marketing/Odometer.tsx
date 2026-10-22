"use client";

import { useEffect, useState } from "react";

// A year that rolls into place digit by digit, like a mechanical counter.
// Every digit sits in a fixed-width column, so the number never jitters even
// though the display serif has proportional figures. Motion is pure CSS
// (transform transition) — reduced-motion users get the final value at once.
export function Odometer({ value, from, className }: { value: number; from?: number; className?: string }) {
  const [shown, setShown] = useState(from ?? value);

  useEffect(() => {
    // Next frame, so the starting position has painted before it rolls.
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const digits = String(shown).split("");
  return (
    <span className={`mk-odo ${className ?? ""}`}>
      <span className="mk-sr">{value}</span>
      <span aria-hidden="true" className="mk-odo__digits">
        {digits.map((d, i) => (
          <span key={digits.length - i} className="mk-odo__col">
            <span
              className="mk-odo__strip"
              style={{ transform: `translateY(-${Number(d) * 10}%)`, transitionDelay: `${(digits.length - 1 - i) * 90}ms` }}
            >
              {"0123456789".split("").map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
