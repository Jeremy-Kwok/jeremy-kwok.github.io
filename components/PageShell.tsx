import React from "react";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function PageShell({ children, title, subtitle }: PageShellProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {title && <h1 className="text-3xl font-bold mb-2 text-zinc-900">{title}</h1>}
      {subtitle && <p className="text-lg mb-8 text-zinc-500">{subtitle}</p>}
      {children}
    </div>
  );
}
