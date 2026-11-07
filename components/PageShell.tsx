import React from "react";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function PageShell({ children, title, subtitle }: PageShellProps) {
  return (
    // Padding outside, max width inside, like the site header, so the content's
    // left edge lines up with the logo at every width.
    <div className="px-4 sm:px-8 py-12">
      <div className="mx-auto max-w-(--page-max)">
        {title && <h1 className="mb-2 font-display text-[clamp(30px,6vw,44px)] leading-[1.05] text-ink">{title}</h1>}
        {subtitle && <p className="text-lg mb-8 text-zinc-500">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
