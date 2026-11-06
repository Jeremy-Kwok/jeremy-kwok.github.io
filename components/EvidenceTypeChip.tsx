import type { EvidenceItem } from "@/lib/schema";

// Short labels from Enport's EvidenceCard, shared by the claim cards and the
// evidence list so a type reads the same in both. Drawn as an outlined code,
// like a drawing callout; the site's palette keeps color for the accent.
const typeLabels: Record<EvidenceItem["type"], string> = {
  repo: "REPO",
  cad: "CAD",
  report: "RPT",
  photo: "IMG",
  test_data: "DATA",
  diagram: "DGM",
  spec: "SPEC",
  screenshot: "SCR",
  drawing: "DWG",
  video: "VID",
  minutes: "MIN",
  other: "OTH",
};

interface EvidenceTypeChipProps {
  type: EvidenceItem["type"];
}

export default function EvidenceTypeChip({ type }: EvidenceTypeChipProps) {
  return (
    <span className="flex-shrink-0 border border-rule px-1 font-label text-[10px] font-bold uppercase leading-4 tracking-wide text-ink-2">
      {typeLabels[type]}
    </span>
  );
}
