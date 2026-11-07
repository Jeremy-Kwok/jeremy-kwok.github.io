"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A header link that marks itself as the current page (aria-current plus a
// visible underline). Client-only because the header lives in the root layout,
// which doesn't know the route. Without JS the links still work; only the
// current-page marker is missing.

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  /** Mark as current when the path starts with href, not only on an exact match. */
  prefix?: boolean;
}

export default function NavLink({ href, children, prefix = false }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const path = href.split("#")[0];
  const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);
  const current = !href.includes("#") && (prefix ? norm(pathname).startsWith(norm(path)) : norm(pathname) === norm(path));

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? "page" : undefined}
      className={`py-2 transition-colors hover:text-ink ${
        current ? "text-ink underline decoration-accent decoration-2 underline-offset-[6px]" : ""
      }`}
    >
      {children}
    </Link>
  );
}
