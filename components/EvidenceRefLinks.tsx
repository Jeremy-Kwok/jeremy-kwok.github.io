import type { EvidenceItem } from "@/lib/schema";
import EvidenceTypeChip from "@/components/EvidenceTypeChip";

// Chips that jump to items in the Evidence section. Shared by claim cards
// and decision-path steps. Unknown ids are skipped; the schema already
// rejects them at build time.

interface EvidenceRefLinksProps {
  refs: string[];
  evidenceById: Map<string, EvidenceItem>;
  className?: string;
}

export default function EvidenceRefLinks({ refs, evidenceById, className = "" }: EvidenceRefLinksProps) {
  const linked = refs
    .map((ref) => evidenceById.get(ref))
    .filter((e): e is EvidenceItem => !!e);
  if (linked.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {linked.map((ev) => (
        <a
          key={ev.id}
          href={`#evidence-${ev.id}`}
          className="inline-flex max-w-full items-center gap-1.5 border border-hairline bg-panel px-1.5 py-0.5 text-xs transition-colors hover:border-ink"
        >
          <EvidenceTypeChip type={ev.type} />
          <span className="text-zinc-600 truncate">{ev.label}</span>
        </a>
      ))}
    </div>
  );
}
