import type { Metadata } from 'next';
import Link from 'next/link';
import { getProject } from '@/lib/content';
import { SITE_NAME } from '@/lib/site';
import { ogImage } from '@/lib/ogCard';

// The fall 2025 segmentation page is now part of /projects/afm-research/,
// which covers both semesters of the research. A static host can't send a
// 301, so this keeps the old URL working: a meta refresh, a canonical
// pointing at the new page, noindex, and a plain link if the refresh is
// blocked. React hoists the <meta> into <head>. Links shared under the old
// URL still preview as the new page. Same pattern as ../frc-mechanical/.

const TARGET = '/projects/afm-research/';
const target = getProject('afm-research');
const title = target?.title ?? 'AFM research';
const description = target?.oneLiner.split(/(?<=[.!?])\s+/)[0];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: TARGET },
  robots: { index: false, follow: true },
  openGraph: {
    title,
    description,
    url: TARGET,
    siteName: SITE_NAME,
    type: 'article',
    images: [ogImage('afm-research', title)],
  },
  twitter: { card: 'summary_large_image', images: [ogImage('afm-research', title)] },
};

export default function AfmSegmentationRedirect() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <h1 className="font-display text-3xl leading-tight text-ink mb-3">This page has moved</h1>
      <p className="text-sm text-zinc-500">
        It&rsquo;s now at{' '}
        <Link href={TARGET} className="text-link underline underline-offset-2 hover:text-ink">
          {title}
        </Link>
        .
      </p>
    </div>
  );
}
