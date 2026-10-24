// A user-supplied profile link (LinkedIn / GitHub / website), made safe to
// render as an href.
//
// Storing these raw causes two failures. A scheme-less value like
// "linkedin.com/in/jane" — the common way people type a URL — resolves as a
// RELATIVE path, so a recruiter clicking "LinkedIn" on a profile lands on an
// Enport 404. And a "javascript:" or "data:" value is a script-injection
// vector on the enport.dev origin for anyone who clicks the link on a public
// profile. Both close by resolving through the URL parser and allowing only
// http(s).
//
// Called at RENDER, which is the security boundary: it protects every viewer
// regardless of what is already stored or written straight to PostgREST, and
// it also repairs the scheme-less case on the way out, so the stored value is
// left untouched (no silent save-time data loss).
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // A leading "scheme:" is kept as-is (so javascript:/data:/mailto: reach the
  // protocol check below and are rejected); anything else is treated as a
  // scheme-less host and gets https://, with leading slashes stripped so a
  // scheme-relative "//host" also becomes https.
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}
