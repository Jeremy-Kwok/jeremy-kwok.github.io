import Link from 'next/link';

// Adapted from Enport's app/not-found.tsx. The root layout already supplies
// the header, so this is only the message and the way back.
export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-3">
        404
      </p>
      <h1 className="text-2xl font-bold text-zinc-900 mb-3">
        This page isn&rsquo;t here
      </h1>
      <p className="text-sm text-zinc-500 mb-8">
        The link may be mistyped, or the page may have moved.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/#projects"
          className="text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 px-5 py-2 rounded-lg transition-colors"
        >
          See projects
        </Link>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  );
}
