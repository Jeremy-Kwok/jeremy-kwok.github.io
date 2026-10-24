import Link from "next/link";
import type { Project } from "@/lib/schema";
import WorkTypeBadge from "@/components/WorkTypeBadge";
import { detectFormatKind } from "@/lib/evidenceRender";

// Adapted from Enport's ProjectCard: no owner byline, no crop-box thumbnail
// math. The thumbnail is the hero image, else the first image evidence,
// else Enport's gradient.

const ACRONYM_TAGS: Record<string, string> = {
  cad: "CAD",
  ml: "ML",
  fea: "FEA",
  pcb: "PCB",
  ros: "ROS",
  matlab: "MATLAB",
  iot: "IoT",
  plc: "PLC",
  cfd: "CFD",
  cam: "CAM",
  cnc: "CNC",
};

function normalizeTag(tag: string): string {
  const lower = tag.toLowerCase().trim();
  return ACRONYM_TAGS[lower] ?? tag.trim();
}

// Pick first 1–3 tags that fit the single-row budget. Prefer fewer-but-readable
// over many-but-truncated. Always show at least one tag if any exist.
function pickDisplayTags(tags: string[]): string[] {
  const candidates = tags.slice(0, 3).map(normalizeTag);
  const ROW_CHAR_BUDGET = 32;
  const CHIP_OVERHEAD = 4;
  const picked: string[] = [];
  let used = 0;
  for (const tag of candidates) {
    const cost = tag.length + CHIP_OVERHEAD;
    if (picked.length > 0 && used + cost > ROW_CHAR_BUDGET) break;
    picked.push(tag);
    used += cost;
  }
  return picked;
}

function thumbnailFor(project: Project): string | null {
  if (project.heroImage) return project.heroImage;
  const image = project.evidence.find((e) => e.url && detectFormatKind(e) === "image");
  return image?.url ?? null;
}

type ProjectCardProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const thumbUrl = thumbnailFor(project);
  const metric = project.topMetrics[0];
  const tags = pickDisplayTags(project.tags);

  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="block bg-white border border-zinc-200 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.07)] hover:border-zinc-300"
    >
      {thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl} alt="" loading="lazy" className="w-full aspect-[1.92] object-cover bg-zinc-50" />
      ) : (
        <div className="w-full aspect-[1.92] bg-[linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)]" aria-hidden="true" />
      )}
      <div className="p-5">
        {project.workType && (
          <div className="mb-1.5">
            <WorkTypeBadge type={project.workType} variant="eyebrow" />
          </div>
        )}
        <h3 className="text-base font-semibold text-zinc-900 leading-snug">{project.title}</h3>
        <p className="text-sm text-zinc-500 mt-1">{project.role}</p>
        {metric && (
          <div className="mt-2 text-xs text-zinc-500">
            <span className="text-sm font-semibold text-zinc-900">{metric.value}</span>
            {metric.unit && `${/^\p{L}/u.test(metric.unit) ? ' ' : ''}${metric.unit}`}
            <span className="text-zinc-400 mx-1 text-[10px] align-middle">&bull;</span>
            {metric.label}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-hidden">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full whitespace-nowrap truncate max-w-[8rem]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
