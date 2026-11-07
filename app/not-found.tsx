import type { Metadata } from 'next';
import Link from 'next/link';

// Adapted from Enport's app/not-found.tsx. The root layout already supplies
// the header, so this is only the message and the way back.

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
      <p className="font-label text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">404</p>
      <h1 className="font-display text-3xl leading-tight text-ink mb-3">This page isn&rsquo;t here</h1>
      <p className="text-sm text-zinc-500 mb-8">The link may be mistyped, or the page may have moved.</p>
      <div className="flex items-center justify-center gap-6">
        <Link
          href="/#projects"
          className="border border-ink bg-ink px-5 py-2 font-label text-[15px] font-semibold text-paper transition-colors hover:bg-ink-2"
        >
          See projects
        </Link>
        <Link href="/" className="text-sm text-link underline underline-offset-2 hover:text-ink">
          Go home
        </Link>
      </div>
    </div>
  );
}
