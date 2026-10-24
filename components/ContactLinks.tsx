import { CONTACT } from "@/lib/site";
import { safeExternalUrl } from "@/lib/externalUrl";

// Renders only the contact entries that are filled in, so a blank
// placeholder in lib/site.ts never becomes a dead link.
export function contactLinks(): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  if (CONTACT.email.trim()) links.push({ label: "Email", href: `mailto:${CONTACT.email.trim()}` });
  const linkedin = safeExternalUrl(CONTACT.linkedin);
  if (linkedin) links.push({ label: "LinkedIn", href: linkedin });
  const github = safeExternalUrl(CONTACT.github);
  if (github) links.push({ label: "GitHub", href: github });
  return links;
}

interface ContactLinksProps {
  className?: string;
}

export default function ContactLinks({ className = "" }: ContactLinksProps) {
  const links = contactLinks();
  if (links.length === 0) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            className="text-blue-600 hover:underline"
            {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
