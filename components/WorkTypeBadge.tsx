import type { WorkType } from '@/lib/schema';

type WorkTypeBadgeVariant = 'eyebrow' | 'pill';

// Solid fills + white text — legible on any placement and clearly distinct from
// the soft-grey topic-tag chips. Internship/research are the most saturated
// (top signal); personal is the quietest.
const WORK_TYPE_COLORS: Record<WorkType, string> = {
  internship: 'bg-emerald-600 text-white',
  research: 'bg-blue-800 text-white',
  coursework: 'bg-sky-500 text-white',
  extracurricular: 'bg-amber-500 text-white',
  personal: 'bg-zinc-600 text-white',
};

// pill = chip shape (default). eyebrow = small uppercase tracked label that sits
// above a title without overtaking it: loud in color, quiet in size.
const VARIANT_CLASSES: Record<WorkTypeBadgeVariant, string> = {
  pill: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  eyebrow: 'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
};

interface WorkTypeBadgeProps {
  type: WorkType;
  variant?: WorkTypeBadgeVariant;
}

export default function WorkTypeBadge({ type, variant = 'pill' }: WorkTypeBadgeProps) {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <span className={`${VARIANT_CLASSES[variant]} ${WORK_TYPE_COLORS[type]}`}>
      {label}
    </span>
  );
}
