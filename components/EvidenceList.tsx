import { responsiveImage } from "@/lib/images";
import type { EvidenceItem } from "@/lib/schema";
import { detectFormatKind } from "@/lib/evidenceRender";
import { safeExternalUrl } from "@/lib/externalUrl";
import { SITE_URL } from "@/lib/site";
import EvidenceTypeChip from "@/components/EvidenceTypeChip";

// Read-only adaptation of Enport's ArtifactsSection: images in a grid,
// everything else as document rows. No viewer modal and no three.js. A CAD
// file is a download link. Evidence without a URL is described but marked
// as not publicly released, so a claim can still point at it honestly.

interface EvidenceListProps {
  evidence: EvidenceItem[];
  // The page's hero image and its `sizes`: that item's thumbnail uses the same
  // `sizes`, so the browser picks the file it already downloaded for the hero.
  heroImage?: string;
  heroSizes?: string;
}

function hrefFor(item: EvidenceItem): string | null {
  if (!item.url) return null;
  return item.url.startsWith("/") ? item.url : safeExternalUrl(item.url);
}

// A page on this site (the StatsMonitor report demo, the About walkthrough)
// opens in place, so Back returns to the project. Files open in a new tab.
function isSitePage(href: string): boolean {
  try {
    const url = new URL(href, SITE_URL);
    if (url.origin.toLowerCase() !== new URL(SITE_URL).origin.toLowerCase()) return false;
    return url.pathname.endsWith("/") || /\.html?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

// Thumbnails are drawn object-contain in a 16:9 box, so a tall image (a robot
// photo) is shown much narrower than the box. Scale `sizes` by that so the
// browser doesn't fetch a variant three times wider than it draws.
function thumbSizes(width?: number, height?: number): string {
  const f = width && height ? Math.min(1, width / height / (16 / 9)) : 1;
  const r = (n: number) => Math.ceil(n * f);
  return `(min-width: 960px) ${r(430)}px, (min-width: 640px) ${r(50)}vw, ${r(100)}vw`;
}

export default function EvidenceList({ evidence, heroImage, heroSizes }: EvidenceListProps) {
  // Clips hosted here, with a poster, play in the grid beside the photos.
  const isClip = (e: EvidenceItem) => detectFormatKind(e) === "video" && !!e.poster && !!e.url?.startsWith("/");
  const images = evidence.filter((e) => hrefFor(e) && (detectFormatKind(e) === "image" || isClip(e)));
  const rows = evidence.filter((e) => !images.includes(e));

  return (
    <div>
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {images.map((item) => {
            const href = hrefFor(item)!;
            const img = isClip(item) ? null : responsiveImage(href);
            return (
              <figure
                key={item.id}
                id={`evidence-${item.id}`}
                className="border border-hairline overflow-hidden bg-panel scroll-mt-20"
              >
                {!img ? (
                  // preload="none": nothing downloads until someone presses play.
                  <video
                    src={href}
                    poster={item.poster}
                    controls
                    playsInline
                    preload="none"
                    aria-label={item.label}
                    className="block w-full aspect-video bg-black object-contain"
                  />
                ) : (
                <a href={href} target="_blank" rel="noopener noreferrer" className="block bg-panel">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    {...img}
                    sizes={item.url === heroImage && heroSizes ? heroSizes : thumbSizes(img.width, img.height)}
                    alt={item.label}
                    loading="lazy"
                    className="w-full aspect-video object-contain"
                  />
                </a>
                )}
                <figcaption className="border-t border-zinc-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <EvidenceTypeChip type={item.type} />
                    <span className="text-sm text-zinc-700 truncate">{item.label}</span>
                  </div>
                  {item.note && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.note}</p>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-zinc-100 border-y border-zinc-100">
          {rows.map((item) => {
            const href = hrefFor(item);
            return (
              <li key={item.id} id={`evidence-${item.id}`} className="py-3 scroll-mt-20">
                <div className="flex items-center gap-3">
                  <EvidenceTypeChip type={item.type} />
                  <span className="text-sm text-zinc-700 flex-1 min-w-0">{item.label}</span>
                  {href ? (
                    <a
                      href={href}
                      {...(isSitePage(href) ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                      className="-my-[5px] py-[5px] text-xs text-blue-600 hover:underline flex-shrink-0"
                    >
                      {detectFormatKind(item) === "cad" ? "Download" : "Open"}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400 flex-shrink-0">Not public</span>
                  )}
                </div>
                {item.note && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.note}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
