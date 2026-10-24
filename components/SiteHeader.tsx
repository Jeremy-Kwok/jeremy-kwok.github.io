import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="border-b border-zinc-100 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-14 gap-4">
        <Link href="/" className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight whitespace-nowrap">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm text-zinc-500">
          <Link href="/#projects" className="hover:text-zinc-900 transition-colors">Projects</Link>
          <Link href="/enport/" className="hover:text-zinc-900 transition-colors">Enport</Link>
          <Link href="/resume/" className="hover:text-zinc-900 transition-colors">Resume</Link>
        </nav>
      </div>
    </header>
  );
}
