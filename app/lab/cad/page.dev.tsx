import type { Metadata } from "next";
import CadShowcase from "@/components/cad/CadShowcase";
import { loadCadEntries, toPublic } from "@/lib/cad/content";

// Dev-only preview of every CAD showcase, including the lab test models.
// The ".dev.tsx" extension is only a page extension under `next dev` (see
// next.config.ts), so this route never reaches the static export.

export const metadata: Metadata = {
  title: "CAD lab",
  robots: { index: false, follow: false },
};

export default function CadLabPage() {
  const entries = loadCadEntries();
  return (
    <div data-page-width="wide" className="px-4 pb-16 pt-10 text-[17px] leading-[1.5] text-ink sm:px-8">
      <div className="mx-auto max-w-[1120px]">
        <h1 className="font-display text-4xl">CAD lab</h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          Dev only. Every showcase in content/cad/, rendered with <code>npm run cad -- &lt;slug&gt;</code>.
        </p>
        {entries.map((entry) => {
          const cad = toPublic(entry);
          return (
            <section key={entry.project.slug} className="mt-12">
              <h2 className="border-t border-rule pt-3 font-display text-2xl">
                {entry.project.title} <span className="font-label text-[14px] font-normal text-ink-2">({entry.lab ? "lab" : "site"}: {entry.project.slug})</span>
              </h2>
              {cad ? (
                <CadShowcase cad={cad} className="mt-4" />
              ) : (
                <p className="mt-3 text-ink-2">
                  Not rendered yet. Run <code>npm run cad -- {entry.project.slug} --step &quot;/path/to/file.step&quot;</code>
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
