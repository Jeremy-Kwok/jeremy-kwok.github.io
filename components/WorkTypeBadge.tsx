import type { WorkType } from '@/lib/schema';

type WorkTypeBadgeVariant = 'eyebrow' | 'pill';

// A colored square and a label, in the same colors as the About timeline's
// lanes (internships are Work, research is Research, coursework is School),
// so the two pages read as one system. The color is the signal; the label
// stays ink so it is always legible.
const WORK_TYPE_COLORS: Record<WorkType, string> = {
  internship: '#C8641A',
  research: '#2E8571',
  coursework: '#2B5FA6',
  extracurricular: '#8A6A14',
  personal: '#4A5257',
};

const VARIANT_CLASSES: Record<WorkTypeBadgeVariant, string> = {
  pill: 'inline-flex items-center gap-1.5 border border-hairline bg-panel px-2 py-0.5 font-label text-xs font-semibold text-ink',
  eyebrow: 'inline-flex items-center gap-1.5 font-label text-[11px] font-bold uppercase tracking-wider text-ink-2',
};

interface WorkTypeBadgeProps {
  type: WorkType;
  variant?: WorkTypeBadgeVariant;
}

/** The eyebrow above a project title: one badge, or a row of them for a page covering several kinds of work. */
export function WorkTypeBadges({ value, className = '' }: { value: WorkType | WorkType[] | undefined; className?: string }) {
  const types = value === undefined ? [] : Array.isArray(value) ? value : [value];
  if (types.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {types.map((t) => (
        <WorkTypeBadge key={t} type={t} variant="eyebrow" />
      ))}
    </div>
  );
}

export default function WorkTypeBadge({ type, variant = 'pill' }: WorkTypeBadgeProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span className={VARIANT_CLASSES[variant]}>
      <span aria-hidden="true" className="size-2.5 shrink-0" style={{ background: WORK_TYPE_COLORS[type] }} />
      {label}
    </span>
  );
}
