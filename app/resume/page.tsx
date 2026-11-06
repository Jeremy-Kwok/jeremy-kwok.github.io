import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ContactLinks from "@/components/ContactLinks";
import { RESUME_PATH, SITE_NAME } from "@/lib/site";
import { loadResumeImage } from "@/lib/resumeContent";
import { ogImage } from "@/lib/ogCard";

const description = `Resume of ${SITE_NAME}, mechanical engineer.`;

export const metadata: Metadata = {
  title: "Resume",
  description,
  alternates: { canonical: "/resume/" },
  openGraph: {
    title: `Resume — ${SITE_NAME}`,
    description,
    url: "/resume/",
    siteName: SITE_NAME,
    type: "website",
    images: [ogImage("site", SITE_NAME)],
  },
};

// The resume itself, as an image rendered from the PDF (`npm run images`), so
// it's on screen the moment the page opens, on any phone. The PDF is one tap
// away, and the text version underneath serves screen readers and search.
export default function ResumePage() {
  const image = loadResumeImage();
  const largest = image?.variants[image.variants.length - 1];

  return (
    <PageShell title="Resume">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <a
          href={RESUME_PATH}
          download="Jeremy-Kwok-Resume.pdf"
          className="border border-ink bg-ink px-5 py-2 font-label text-[15px] font-semibold text-paper transition-colors hover:bg-ink-2"
        >
          Download PDF
        </a>
        <a href={RESUME_PATH} className="font-label text-[15px] font-semibold text-link underline underline-offset-[3px]">
          Open PDF
        </a>
      </div>

      {image && largest && (
        <>
          <a href={RESUME_PATH} className="mt-6 block max-w-[850px] border border-hairline bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={largest.src}
              srcSet={image.variants.map((v) => `${v.src} ${v.w}w`).join(", ")}
              sizes="(min-width: 960px) 850px, 100vw"
              width={image.width}
              height={image.height}
              alt="Jeremy Kwok’s resume. The full text is below, under Text version."
              fetchPriority="high"
              className="block h-auto w-full"
            />
          </a>
          <details className="mt-4 max-w-[850px] border border-hairline bg-panel">
            <summary className="cursor-pointer px-4 py-2.5 font-label text-[15px] font-semibold text-ink">Text version</summary>
            <div className="whitespace-pre-line border-t border-hairline px-4 py-3 text-[15px] leading-relaxed text-ink">{image.text}</div>
          </details>
        </>
      )}

      <div className="mt-12">
        <h2 className="mb-3 border-t border-rule pt-3 font-display text-2xl leading-tight text-ink">Contact</h2>
        <ContactLinks className="text-sm" />
      </div>
    </PageShell>
  );
}
