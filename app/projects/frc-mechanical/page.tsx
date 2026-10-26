import type { Metadata } from 'next';
import Link from 'next/link';

// The FRC page moved to /projects/mechanical-builds/. A static host can't
// send a 301, so this keeps the old URL working: a meta refresh, a canonical
// pointing at the new page, noindex, and a plain link if the refresh is
// blocked. React hoists the <meta> into <head>.

const TARGET = '/projects/mechanical-builds/';

export const metadata: Metadata = {
  title: 'Mechanical builds',
  alternates: { canonical: TARGET },
  robots: { index: false, follow: true },
};

export default function FrcMechanicalRedirect() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <h1 className="text-2xl font-bold text-zinc-900 mb-3">This page has moved</h1>
      <p className="text-sm text-zinc-500">
        It&rsquo;s now at{' '}
        <Link href={TARGET} className="text-blue-600 hover:underline">
          Mechanical builds
        </Link>
        .
      </p>
    </div>
  );
}
