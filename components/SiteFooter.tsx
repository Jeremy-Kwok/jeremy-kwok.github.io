import ContactLinks from "@/components/ContactLinks";
import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-100 px-4 sm:px-8 mt-16">
      <div className="max-w-4xl mx-auto py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-zinc-500">
        <p>{SITE_NAME}</p>
        <ContactLinks />
      </div>
    </footer>
  );
}
