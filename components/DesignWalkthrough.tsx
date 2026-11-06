"use client";

import { useState } from "react";
import type { Mechanism } from "@/lib/aboutSchema";
import type { CadPublic } from "@/lib/cad/schema";
import CadShowcase from "@/components/cad/CadShowcase";
import { useHydrated } from "@/lib/useHydrated";

// BlockParty design walkthrough: a frame, a numbered list of mechanisms
// (drawing-style balloons), and the selected mechanism's notes.
//
// With the CAD rendered (content/cad/blockparty.ts), the frame is the CAD
// showcase and each mechanism plays its chapter of the animation, in the video
// or the 3D view; a swatch in the subsystem's color ties the row to the model.
// Without it, the frame cross-fades the four images. The page prints every
// mechanism in <noscript>, so neither is required.

interface DesignWalkthroughProps {
  mechanisms: Mechanism[];
  teamLine: string;
  imageSizes: Record<string, { width: number; height: number }>;
  /** The rendered CAD showcase, if there is one. */
  cad?: CadPublic | null;
}

export default function DesignWalkthrough({ mechanisms, teamLine, imageSizes, cad = null }: DesignWalkthroughProps) {
  const [index, setIndex] = useState(0);
  const [request, setRequest] = useState<{ label: string; nonce: number } | null>(null);
  const [onScreen, setOnScreen] = useState<string | null>(null);
  const selected = mechanisms[index];
  const hydrated = useHydrated();
  const chapterOf = (m: Mechanism) => (cad && m.cadChapter ? cad.chapters.find((c) => c.label === m.cadChapter) : undefined);

  const select = (i: number) => {
    setIndex(i);
    const chapter = chapterOf(mechanisms[i]);
    if (chapter) setRequest({ label: chapter.label, nonce: (request?.nonce ?? 0) + 1 });
  };

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        {cad ? (
          <CadShowcase cad={cad} request={request} onChapter={setOnScreen} />
        ) : (
          <div className="relative aspect-[16/10] overflow-hidden border border-rule bg-panel">
            {mechanisms.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.image}
                alt={i === index ? m.alt : ""}
                aria-hidden={i === index ? undefined : true}
                width={imageSizes[m.image]?.width}
                height={imageSizes[m.image]?.height}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 size-full object-contain transition-opacity duration-200 motion-reduce:transition-none ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{teamLine}</p>
      </div>

      <div>
        <div className="border border-rule bg-panel">
          <div
            aria-hidden="true"
            className="grid grid-cols-[56px_1fr] border-b border-rule font-label text-[12px] font-bold uppercase tracking-wide text-ink-2"
          >
            <span className="px-3 py-2 border-r border-hairline">Item</span>
            <span className="px-3 py-2">Mechanism</span>
          </div>
          <ul>
            {mechanisms.map((m, i) => {
              const active = i === index;
              const chapter = chapterOf(m);
              const playing = chapter !== undefined && onScreen === chapter.label;
              return (
                <li key={m.id} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    tabIndex={hydrated ? undefined : -1}
                    onClick={() => select(i)}
                    className={`grid w-full grid-cols-[56px_1fr] items-center text-left cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link ${
                      active ? "bg-accent/10" : "hover:bg-hairline/40"
                    }`}
                  >
                    <span className="flex justify-center py-2.5 border-r border-hairline">
                      <Balloon n={i + 1} filled={active} />
                    </span>
                    <span className={`flex items-center gap-2 px-3 py-2.5 text-[15px] text-ink ${active ? "font-semibold" : ""}`}>
                      {chapter?.color && (
                        <span aria-hidden="true" className="size-3 shrink-0 border border-ink/30" style={{ background: chapter.color }} />
                      )}
                      <span className="min-w-0 flex-1">{m.name}</span>
                      {playing && (
                        <span className="shrink-0 font-label text-[11px] font-semibold uppercase tracking-wide text-accent-text">
                          On screen
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div aria-live="polite" className="mt-5">
          <p className="flex items-center gap-2 font-label text-[13px] font-bold uppercase tracking-wide text-ink-2">
            <Balloon n={index + 1} filled />
            {selected.name}
          </p>
          <h3 className="mt-2 font-display text-xl font-extrabold leading-tight text-ink">{selected.title}</h3>
          <p className="mt-2 text-ink">{selected.text}</p>
          {selected.myPart && (
            <p className="mt-2 text-ink">
              <span className="font-semibold">My part:</span> {selected.myPart}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Balloon({ n, filled }: { n: number; filled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-accent font-label text-[13px] font-bold tabular-nums ${
        filled ? "bg-accent text-white" : "bg-panel text-accent"
      }`}
    >
      {n}
    </span>
  );
}
