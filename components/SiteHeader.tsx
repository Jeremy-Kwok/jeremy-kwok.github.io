import Link from "next/link";
import NavLink from "@/components/NavLink";
import { SITE_NAME } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 px-4 max-[359px]:px-3 sm:px-8">
      <div className="max-w-(--page-max) mx-auto flex items-center justify-between h-14 gap-3 max-[359px]:gap-2">
        <Link href="/" className="font-display text-lg max-[359px]:text-base sm:text-xl text-zinc-900 whitespace-nowrap">
          {SITE_NAME}
        </Link>
        <nav className="flex items-center gap-3.5 max-[359px]:gap-2 sm:gap-6 font-label text-[15px] max-[359px]:text-[14px] font-semibold text-zinc-500">
          <NavLink href="/#projects">Projects</NavLink>
          <NavLink href="/about/">About</NavLink>
          <NavLink href="/enport/">Enport</NavLink>
          <NavLink href="/resume/">Resume</NavLink>
        </nav>
      </div>
    </header>
  );
}
