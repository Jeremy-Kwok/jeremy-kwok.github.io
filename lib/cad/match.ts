// Part selection for content/cad settings. Shared by the STEP converter (node),
// the renderer and the 3D view (browser), so a rule selects the same parts in
// all three.

/** "/.../" is a case-insensitive regular expression; anything else a case-insensitive substring. */
export function partMatcher(rule: string): (path: string) => boolean {
  if (rule.length > 2 && rule.startsWith('/') && rule.endsWith('/')) {
    const re = new RegExp(rule.slice(1, -1), 'i');
    return (path) => re.test(path);
  }
  const needle = rule.toLowerCase();
  return (path) => path.toLowerCase().includes(needle);
}

export function matchesAny(rules: string[], path: string): boolean {
  return rules.some((rule) => partMatcher(rule)(path));
}

/** Names that usually mean hardware, which arrives last and in quick bursts. */
export const FASTENER_NAME = /screw|bolt|nut\b|washer|shcs|bhcs|fhcs|standoff|rivet|insert|dowel|spacer|\bpin\b/i;
