import Link from "next/link";
import type { Project } from "@/lib/schema";
import { WorkTypeBadges } from "@/components/WorkTypeBadge";
import { aspectRatio, projectThumbnail, responsiveImage } from "@/lib/images";

// Adapted from Enport's ProjectCard: no owner byline, no crop-box thumbnail
// math. The thumbnail is the card image, else the hero image, else the first
// image evidence, else Enport's gradient.

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

// Pick the first 1–3 tags that fit about one row of a card (a narrow phone
// card wraps to two). Always show at least one tag if any exist.
function pickDisplayTags(tags: string[]): string[] {
  const candidates = tags.slice(0, 3).map(normalizeTag);
  const ROW_CHAR_BUDGET = 44;
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

type ProjectCardProps = {
  project: Project;
  /** The first card's image is the homepage's largest element: load it right away, not lazily. */
  priority?: boolean;
};

export default function ProjectCard({ project, priority = false }: ProjectCardProps) {
  const thumbUrl = projectThumbnail(project);
  const thumb = thumbUrl ? responsiveImage(thumbUrl) : null;
  // A strip wider than about 2.6:1 loses its labels when cropped into the card; show it whole.
  const wide = thumbUrl ? (aspectRatio(thumbUrl) ?? 0) > 2.6 : false;
  const metric = project.topMetrics[0];
  const tags = pickDisplayTags(project.tags);

  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="group block border border-hairline bg-panel transition-colors duration-150 hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.src}
          srcSet={thumb.srcSet}
          sizes="(min-width: 960px) 430px, (min-width: 640px) 50vw, 100vw"
          width={thumb.width}
          height={thumb.height}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className={`w-full aspect-[1.92] bg-zinc-50 ${wide ? "object-contain px-2" : "object-cover"}`}
        />
      ) : (
        <div className="w-full aspect-[1.92] bg-[linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)]" aria-hidden="true" />
      )}
      <div className="p-5">
        <WorkTypeBadges value={project.workType} className="mb-1.5" />
        <h3 className="font-display text-lg leading-snug text-ink group-hover:underline">{project.title}</h3>
        {project.cardSummary && <p className="text-sm text-ink-2 mt-1 leading-snug">{project.cardSummary}</p>}
        <p className="text-sm text-zinc-500 mt-1">{project.role}</p>
        {(project.organization || project.timeframe) && (
          <p className="mt-0.5 font-label text-[13px] font-semibold text-ink-2">
            {[project.organization, project.timeframe].filter(Boolean).join(" · ")}
          </p>
        )}
        {metric && (
          <div className="mt-2 text-xs text-zinc-500">
            <span className="text-sm font-semibold text-zinc-900">{metric.value}</span>
            {metric.unit && `${/^\p{L}/u.test(metric.unit) ? ' ' : ''}${metric.unit}`}
            <span className="text-zinc-400 mx-1 text-[10px] align-middle">&bull;</span>
            {metric.label}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border border-hairline px-1.5 py-px font-label text-[11px] font-semibold text-ink-2 whitespace-nowrap"
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
