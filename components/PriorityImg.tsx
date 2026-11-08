"use client";

import type { ComponentPropsWithoutRef } from "react";

// An eager <img> rendered from a client component. React's server renderer adds
// a preload hint to a route's prefetch data for every eager <img> in a server
// component, so each page that prefetched a link also downloaded that link's
// hero image (about 580 KB of unseen images on the homepage, on a phone).
// Rendered from here, a page's own HTML still preloads its image on a direct
// visit, but the prefetch data carries no hint.
export default function PriorityImg(props: ComponentPropsWithoutRef<"img">) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- alt comes from props
  return <img {...props} />;
}
