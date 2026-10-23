import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

// Czech typesetting rule: a one-letter preposition or conjunction (a, i, k,
// o, s, u, v, z) never ends a line, and a number never breaks from its unit.
// Works on plain strings and recurses into element children.

const ONE_LETTER = /(?<=^|[\s(„“])([aikosuvzAIKOSUVZ])\s+/g;
const NUMBER_UNIT = /(\d)\s+(ly|K|mas|kB|px|%|let)(?=[\s.,;:)·]|$)/g;

export function czText(text: string): string {
  // Lookbehind (not a consumed group), so "a v lese" glues both "a" and "v".
  return text.replace(ONE_LETTER, "$1\u00a0").replace(NUMBER_UNIT, "$1\u00a0$2");
}

export function cz(node: ReactNode): ReactNode {
  if (typeof node === "string") return czText(node);
  if (Array.isArray(node)) return Children.map(node, cz);
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    if (el.props.children === undefined) return el;
    return cloneElement(el, undefined, cz(el.props.children));
  }
  return node;
}
