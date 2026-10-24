import type { EvidenceItem } from "@/lib/schema";

// Colors and short labels from Enport's EvidenceCard, shared here by the
// claim cards and the evidence list so a type reads the same in both.
const typeColors: Record<EvidenceItem["type"], string> = {
  repo: "bg-purple-100 text-purple-700",
  cad: "bg-blue-100 text-blue-700",
  report: "bg-orange-100 text-orange-700",
  photo: "bg-green-100 text-green-700",
  test_data: "bg-yellow-100 text-yellow-700",
  diagram: "bg-indigo-100 text-indigo-700",
  spec: "bg-pink-100 text-pink-700",
  screenshot: "bg-teal-100 text-teal-700",
  drawing: "bg-cyan-100 text-cyan-700",
  video: "bg-red-100 text-red-700",
  minutes: "bg-gray-100 text-gray-700",
  other: "bg-zinc-100 text-zinc-600",
};

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
    <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeColors[type]}`}>
      {typeLabels[type]}
    </span>
  );
}
