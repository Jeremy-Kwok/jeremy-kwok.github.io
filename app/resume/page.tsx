import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ContactLinks from "@/components/ContactLinks";
import { RESUME_PATH, SITE_NAME } from "@/lib/site";
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

export default function ResumePage() {
  return (
    <PageShell title="Resume">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <a
          href={RESUME_PATH}
          className="font-medium text-white bg-zinc-900 hover:bg-zinc-700 px-5 py-2 rounded-lg transition-colors"
        >
          Open resume (PDF)
        </a>
        <a href={RESUME_PATH} download className="text-blue-600 hover:underline">
          Download
        </a>
      </div>
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-3">Contact</h2>
        <ContactLinks className="text-sm" />
      </div>
    </PageShell>
  );
}
