import type { EvidenceItem } from "@/lib/schema";
import { detectFormatKind } from "@/lib/evidenceRender";
import { safeExternalUrl } from "@/lib/externalUrl";
import EvidenceTypeChip from "@/components/EvidenceTypeChip";

// Read-only adaptation of Enport's ArtifactsSection: images in a grid,
// everything else as document rows. No viewer modal and no three.js. A CAD
// file is a download link. Evidence without a URL is described but marked
// as not publicly released, so a claim can still point at it honestly.

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

function hrefFor(item: EvidenceItem): string | null {
  if (!item.url) return null;
  return item.url.startsWith("/") ? item.url : safeExternalUrl(item.url);
}

export default function EvidenceList({ evidence }: EvidenceListProps) {
  const images = evidence.filter((e) => hrefFor(e) && detectFormatKind(e) === "image");
  const rows = evidence.filter((e) => !images.includes(e));

  return (
    <div>
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {images.map((item) => {
            const href = hrefFor(item)!;
            return (
              <figure
                key={item.id}
                id={`evidence-${item.id}`}
                className="border border-zinc-200 rounded-md overflow-hidden bg-zinc-50 scroll-mt-20"
              >
                <a href={href} target="_blank" rel="noopener noreferrer" className="block bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={href}
                    alt={item.label}
                    loading="lazy"
                    className="w-full aspect-video object-contain"
                  />
                </a>
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
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex-shrink-0"
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
