import type { EvidenceItem, PathStep } from "@/lib/schema";
import EvidenceRefLinks from "@/components/EvidenceRefLinks";

// Vertical stepper for a project's decision path. Numbered markers sit on a
// left rail and the text column takes the rest of the width, so it reads the
// same on a phone as on a desktop. Server-rendered, no client JavaScript.

interface DecisionPathProps {
  steps: PathStep[];
  evidenceById: Map<string, EvidenceItem>;
}

export default function DecisionPath({ steps, evidenceById }: DecisionPathProps) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="absolute left-3.5 top-8 bottom-1 w-px bg-zinc-200" />
          )}
          <span className="flex-shrink-0 w-7 h-7 rounded-full border border-zinc-300 bg-white text-xs font-semibold text-zinc-700 flex items-center justify-center">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{step.stage}</h3>
              {step.when && <span className="text-xs text-zinc-400">{step.when}</span>}
            </div>
            <p className="mt-1 text-sm sm:text-base text-zinc-800 leading-relaxed">{step.decision}</p>
            {step.why && (
              <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                <span className="font-medium text-zinc-600">Why:</span> {step.why}
              </p>
            )}
            <EvidenceRefLinks refs={step.evidenceIds ?? []} evidenceById={evidenceById} className="mt-2" />
          </div>
        </li>
      ))}
    </ol>
  );
}
