import type { Project, EvidenceItem } from "@/lib/schema";
import WorkTypeBadge from "@/components/WorkTypeBadge";
import ClaimCard from "@/components/ClaimCard";
import DecisionPath from "@/components/DecisionPath";
import InterfacesTable from "@/components/InterfacesTable";
import EvidenceList from "@/components/EvidenceList";

// The read-only half of Enport's ProjectPreview: same section order and the
// same Tailwind classes, with every edit, roster, highlight and upload
// branch removed. Outcome is new and sits right after the work it reports on;
// the decision path is new too and sits between the overview and the claims.

const ACRONYM_TAGS: Record<string, string> = {
  'cad': 'CAD', 'ml': 'ML', 'fea': 'FEA', 'pcb': 'PCB', 'ros': 'ROS',
  'matlab': 'MATLAB', 'iot': 'IoT', 'plc': 'PLC', 'cfd': 'CFD', 'cam': 'CAM', 'cnc': 'CNC',
};
function normalizeTag(tag: string): string {
  const lower = tag.toLowerCase().trim();
  return ACRONYM_TAGS[lower] ?? tag.trim();
}

interface ProjectBodyProps {
  project: Project;
}

export default function ProjectBody({ project }: ProjectBodyProps) {
  const evidenceById = new Map<string, EvidenceItem>(project.evidence.map((e) => [e.id, e]));
  const meta = [
    project.organization,
    project.timeframe,
    project.teamSize ? (project.teamSize === 1 ? "Solo" : `Team of ${project.teamSize}`) : null,
  ].filter((v): v is string => !!v && v.trim() !== "");
  const risks = project.projectRisks ?? [];
  const lessons = project.lessons ?? [];

  return (
    <div>
      {project.heroImage && (
        <div className="w-full mb-8 rounded-lg overflow-hidden border border-zinc-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.heroImage} alt="" className="w-full max-h-80 object-contain" />
        </div>
      )}

      {/* Header */}
      <div id="header">
        {project.workType && (
          <div className="mb-1.5">
            <WorkTypeBadge type={project.workType} variant="eyebrow" />
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight">{project.title}</h1>
        <p className="text-base text-zinc-500 mt-2 leading-relaxed">{project.oneLiner}</p>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Role</dt>
            <dd className="text-sm text-zinc-700">{project.role}</dd>
          </div>
          {meta.length > 0 && (
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Context</dt>
              <dd className="text-sm text-zinc-700">{meta.join(" · ")}</dd>
            </div>
          )}
        </dl>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {project.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-100 text-zinc-700 text-xs px-3 py-1">
                {normalizeTag(tag)}
              </span>
            ))}
          </div>
        )}

        <div id="metrics" className="mt-5 flex flex-wrap gap-3">
          {project.topMetrics.map((metric, idx) => (
            <span key={idx} className="rounded-full border border-zinc-200 px-4 py-2 text-sm bg-white">
              <span className="font-bold text-zinc-900">{metric.value}</span>
              {metric.unit && (
                <span className={`text-zinc-500 ${/^\p{L}/u.test(metric.unit) ? 'ml-1' : ''}`}>{metric.unit}</span>
              )}
              <span className="text-zinc-500">
                <span className="text-zinc-400 mx-1.5 text-xs align-middle">&bull;</span>
                {metric.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      <section id="owned" className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-3">What I owned</h2>
        <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">{project.whatIOwnedSummary}</p>
      </section>

      {project.path && project.path.length > 0 && (
        <section id="path" className="mt-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">Decision path</h2>
          <DecisionPath steps={project.path} evidenceById={evidenceById} />
        </section>
      )}

      <section id="claims" className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">
          Key Work
          <span className="font-normal text-zinc-400"> · {project.claims.length}</span>
        </h2>
        <div className="space-y-4">
          {project.claims.map((claim, i) => (
            <ClaimCard key={i} claim={claim} index={i} evidenceById={evidenceById} />
          ))}
        </div>
      </section>

      <section id="outcome" className="mt-12">
        <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-md p-5">
          <h2 className="text-xs font-semibold tracking-widest text-emerald-700 uppercase mb-3">Outcome</h2>
          <p className="text-sm sm:text-base text-zinc-800 leading-relaxed">{project.outcome}</p>
        </div>
      </section>

      {project.interfaces && project.interfaces.length > 0 && (
        <section id="interfaces" className="mt-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Interfaces</h2>
          <InterfacesTable interfaces={project.interfaces} />
        </section>
      )}

      {project.evidence.length > 0 && (
        <section id="evidence" className="mt-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Evidence</h2>
          <EvidenceList evidence={project.evidence} />
        </section>
      )}

      {(risks.length > 0 || lessons.length > 0) && (
        <div className={`mt-12 grid grid-cols-1 gap-6 ${risks.length > 0 && lessons.length > 0 ? 'md:grid-cols-[5fr_7fr]' : ''}`}>
          {risks.length > 0 && (
            <div id="risks" className="border-l-4 border-orange-400 bg-orange-50 rounded-r-md p-5">
              <h2 className="text-xs font-semibold tracking-widest text-orange-600 uppercase mb-3">Limitations</h2>
              <ul className="space-y-2">
                {risks.map((risk, i) => (
                  <li key={i} className="text-sm text-zinc-700 leading-relaxed">• {risk}</li>
                ))}
              </ul>
            </div>
          )}
          {lessons.length > 0 && (
            <div id="lessons" className="border-l-4 border-blue-500 bg-blue-50 rounded-r-md p-5">
              <h2 className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-3">Lessons</h2>
              <ul className="space-y-2">
                {lessons.map((lesson, i) => (
                  <li key={i} className="text-sm text-zinc-700 leading-relaxed">• {lesson.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
