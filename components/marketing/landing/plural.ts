// A small formatter for the one ICU message the client builds itself (the year
// is chosen on the client, so the server cannot render it): "{count, plural,
// one {…} few {…} other {…}}" with "#" for the number, plus plain "{name}"
// arguments. Czech: one = 1, few = 2–4, other; English: one = 1, other.

export function formatIcuPlural(message: string, args: Record<string, number | string>, locale: string): string {
  const category = (n: number) => {
    if (locale.startsWith("cs") || locale.startsWith("sk")) return n === 1 ? "one" : n >= 2 && n <= 4 ? "few" : "other";
    return n === 1 ? "one" : "other";
  };
  let out = message.replace(/\{(\w+),\s*plural,\s*((?:\w+\s*\{[^}]*\}\s*)+)\}/g, (_m, name: string, forms: string) => {
    const n = Number(args[name] ?? 0);
    const map: Record<string, string> = {};
    for (const f of forms.matchAll(/(\w+)\s*\{([^}]*)\}/g)) map[f[1]] = f[2];
    const form = map[category(n)] ?? map.other ?? "";
    return form.replace(/#/g, String(n));
  });
  out = out.replace(/\{(\w+)\}/g, (_m, name: string) => String(args[name] ?? ""));
  return out;
}
