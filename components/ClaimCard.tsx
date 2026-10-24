import type { Claim, EvidenceItem } from "@/lib/schema";
import EvidenceTypeChip from "@/components/EvidenceTypeChip";

// Read-only adaptation of Enport's EvidenceCard. The result is always
// visible; the supporting detail sits in a native <details> so the page
// stays scannable on a phone and still needs no client JavaScript.

interface ClaimCardProps {
  claim: Claim;
  index: number;
  evidenceById: Map<string, EvidenceItem>;
}

function Field({ label, text, preLine = false }: { label: string; text: string; preLine?: boolean }) {
  if (text.trim() === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm text-zinc-700 leading-relaxed ${preLine ? "whitespace-pre-line" : ""}`}>{text}</p>
    </div>
  );
}

export default function ClaimCard({ claim, index, evidenceById }: ClaimCardProps) {
  const linked = claim.evidenceRefs
    .map((ref) => evidenceById.get(ref))
    .filter((e): e is EvidenceItem => !!e);
  const hasDetails =
    claim.ownedScope.trim() !== "" ||
    claim.requirementOrConstraint.trim() !== "" ||
    claim.method.trim() !== "" ||
    claim.limitations.trim() !== "";

  return (
    <article id={`claim-${index + 1}`} className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5">
      <h3 className="text-base font-semibold text-zinc-900 leading-snug">{claim.title}</h3>

      <div className="mt-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Result</p>
        <p className="text-sm text-zinc-700 leading-relaxed">{claim.resultMetric}</p>
      </div>

      {linked.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {linked.map((ev) => (
            <a
              key={ev.id}
              href={`#evidence-${ev.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs hover:border-zinc-400 transition-colors max-w-full"
            >
              <EvidenceTypeChip type={ev.type} />
              <span className="text-zinc-600 truncate">{ev.label}</span>
            </a>
          ))}
        </div>
      )}

      {hasDetails && (
        <details className="group mt-4">
          <summary className="text-sm text-blue-600 hover:underline cursor-pointer list-none">
            <span className="group-open:hidden">Show method and limitations</span>
            <span className="hidden group-open:inline">Hide details</span>
          </summary>
          <div className="mt-4 space-y-3">
            <Field label="What I owned" text={claim.ownedScope} />
            <Field label="Requirement" text={claim.requirementOrConstraint} />
            <Field label="Method" text={claim.method} preLine />
            <Field label="Limitations" text={claim.limitations} preLine />
          </div>
        </details>
      )}
    </article>
  );
}
