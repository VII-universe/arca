// Czech typesetting for the landing's copy: a one-letter preposition or
// conjunction (a, i, k, o, s, u, v, z) never ends a line, and a number never
// breaks from its unit. Applied to Czech strings only, at render time, so
// the translations stay plain text.

const ONE_LETTER = /(?<=^|[\s(„“])([aikosuvzAIKOSUVZ])\s+/g;
const NUMBER_UNIT = /(\d)\s+(ly|let|roky|rok|dní|dny|den|hodin|Kč|%|€|\$)(?=[\s.,;:)·]|$)/g;

export function czText(text: string): string {
  // Lookbehind (not a consumed group), so "a v lese" glues both "a" and "v".
  return text.replace(ONE_LETTER, "$1 ").replace(NUMBER_UNIT, "$1 $2");
}

/** Deep-applies czText to strings inside arrays and plain objects (t.raw values). */
export function czDeep<T>(value: T): T {
  if (typeof value === "string") return czText(value) as T;
  if (Array.isArray(value)) return value.map(czDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, czDeep(v)])) as T;
  }
  return value;
}

export function typeset(locale: string) {
  const cs = locale === "cs";
  return {
    text: (s: string) => (cs ? czText(s) : s),
    deep: <T,>(v: T): T => (cs ? czDeep(v) : v),
  };
}
