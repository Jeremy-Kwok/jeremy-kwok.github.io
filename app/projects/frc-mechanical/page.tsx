import type { Metadata } from 'next';
import Link from 'next/link';
import { getProject } from '@/lib/content';
import { SITE_NAME } from '@/lib/site';
import { ogImage } from '@/lib/ogCard';

// The FRC page moved to /projects/mechanical-builds/. A static host can't
// send a 301, so this keeps the old URL working: a meta refresh, a canonical
// pointing at the new page, noindex, and a plain link if the refresh is
// blocked. React hoists the <meta> into <head>. Links shared under the old
// URL still preview as the new page.

const TARGET = '/projects/mechanical-builds/';
const target = getProject('mechanical-builds');
const title = target?.title ?? 'Mechanical builds';
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
    images: [ogImage('mechanical-builds', title)],
  },
  twitter: { card: 'summary_large_image', images: [ogImage('mechanical-builds', title)] },
};

export default function FrcMechanicalRedirect() {
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
