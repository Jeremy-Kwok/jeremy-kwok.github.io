import type { CadChapter, CadJoint, CadProject, CadStep } from '@/lib/cad/schema';

// The timeline as plain numbers: where each step starts and ends, and the
// animation state at any second. No three.js, so the page can compute chapter
// labels on the server without shipping a 3D engine.

export interface Span {
  step: CadStep;
  index: number;
  start: number;
  end: number;
}

export function spans(timeline: CadStep[]): Span[] {
  let t = 0;
  return timeline.map((step, index) => {
    const span = { step, index, start: t, end: t + step.seconds };
    t = span.end;
    return span;
  });
}

export function duration(timeline: CadStep[]): number {
  return timeline.reduce((sum, s) => sum + s.seconds, 0);
}

/** Smooth start and stop. */
export function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

type Ease = 'inOut' | 'out' | 'in' | 'linear';
export function ease(kind: Ease, p: number): number {
  switch (kind) {
    case 'out':
      return 1 - Math.pow(1 - p, 3);
    case 'in':
      return p * p * p;
    case 'linear':
      return p;
    default:
      return easeInOut(p);
  }
}

/** Seconds for focus to fade in or out at the edge of a focused stretch. */
const FOCUS_FADE = 0.35;

export interface ScalarState {
  /** 0 = every part away, 1 = assembled. */
  assembly: number;
  /** True while parts are leaving (an unbuild step), which reverses the flight easing. */
  leaving: boolean;
  /** 0 = assembled positions, 1 = a normal exploded view. */
  explode: number;
  /** Joint id -> degrees (revolute) or model units (prismatic). */
  joints: Record<string, number>;
  /** Group labels at full strength while everything else dims, and how far the dimming has gone (0..1). */
  focus: { groups: string[]; amount: number } | null;
}

export function initialState(project: Pick<CadProject, 'timeline' | 'joints'>): ScalarState {
  const joints: Record<string, number> = {};
  for (const j of project.joints) joints[j.id] = j.initial;
  return {
    assembly: project.timeline[0]?.kind === 'build' ? 0 : 1,
    leaving: false,
    explode: 0,
    joints,
    focus: null,
  };
}

type MoveStep = Extract<CadStep, { kind: 'move' }>;

/** A move's per-joint timing, with the step's defaults filled in. */
export function jointMove(spec: MoveStep['joints'][string], step: MoveStep) {
  if (typeof spec === 'number') return { to: spec, delay: 0, seconds: step.seconds, ease: step.ease };
  const delay = spec.delay ?? 0;
  return { to: spec.to, delay, seconds: spec.seconds ?? Math.max(1e-6, step.seconds - delay), ease: spec.ease ?? step.ease };
}

const focusKey = (step: CadStep) => ('focus' in step && step.focus ? step.focus.join('|') : '');

/**
 * Focus at second t. Consecutive steps with the same focus share one stretch:
 * it fades in where the stretch starts and out where it ends, not at every step.
 */
function focusAt(timeline: CadStep[], t: number): ScalarState['focus'] {
  const all = spans(timeline);
  const i = all.findIndex((s) => t >= s.start && t < s.end);
  if (i === -1) return null;
  const key = focusKey(all[i].step);
  if (!key) return null;
  let start = all[i].start;
  for (let k = i - 1; k >= 0 && focusKey(all[k].step) === key; k--) start = all[k].start;
  let end = all[i].end;
  for (let k = i + 1; k < all.length && focusKey(all[k].step) === key; k++) end = all[k].end;
  const smooth = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  };
  const amount = Math.min(smooth((t - start) / FOCUS_FADE), smooth((end - t) / FOCUS_FADE));
  return amount > 0 ? { groups: key.split('|'), amount } : null;
}

/** The animation state at second t. Steps run in order; each starts from where the last left off. */
export function stateAt(project: Pick<CadProject, 'timeline' | 'joints'>, t: number): ScalarState {
  const state = initialState(project);
  for (const { step, start, end } of spans(project.timeline)) {
    if (t < start) break;
    const p = t >= end ? 1 : (t - start) / (end - start);
    const e = step.kind === 'move' ? ease(step.ease, p) : easeInOut(p);
    switch (step.kind) {
      case 'build':
        state.assembly = p;
        state.leaving = false;
        break;
      case 'unbuild':
        state.assembly = 1 - p;
        state.leaving = true;
        break;
      case 'explode':
        state.explode += (step.amount - state.explode) * e;
        break;
      case 'move':
        for (const [id, spec] of Object.entries(step.joints)) {
          const move = jointMove(spec, step);
          const local = t >= end ? 1 : Math.min(1, Math.max(0, (t - start - move.delay) / move.seconds));
          const from = state.joints[id] ?? 0;
          state.joints[id] = from + (move.to - from) * ease(move.ease, local);
        }
        break;
      case 'hold':
        break;
    }
    if (t < end) break;
  }
  state.focus = focusAt(project.timeline, t);
  return state;
}

function defaultLabel(step: CadStep, joints: CadJoint[]): string | null {
  switch (step.kind) {
    case 'build':
      return 'Build';
    case 'explode':
      return step.amount > 0 ? 'Exploded view' : null;
    case 'move': {
      // A move back to the starting position is the second half of the move
      // before it, not a chapter of its own.
      const away = Object.entries(step.joints).filter(
        ([id, value]) => (typeof value === 'number' ? value : value.to) !== (joints.find((j) => j.id === id)?.initial ?? 0)
      );
      if (away.length === 0) return null;
      return away.map(([id]) => joints.find((j) => j.id === id)?.label ?? id).join(' + ');
    }
    default:
      return null;
  }
}

/**
 * The parts of the timeline worth jumping to from the 3D view: builds, explodes
 * and moves, plus anything labeled. Each runs until the next one starts (so
 * "Lever" covers the flip and the return), stopping before an unbuild.
 */
export function chapters(project: Pick<CadProject, 'timeline' | 'joints'>): CadChapter[] {
  // A move with no label of its own continues the move chapter it follows (the
  // second half of a launch, the jitter after a tug) instead of starting one.
  let headKind: CadStep['kind'] | null = null;
  const heads = spans(project.timeline).map((span) => {
    const { step } = span;
    let label = step.label ?? null;
    if (!label && !(step.kind === 'move' && headKind === 'move')) label = defaultLabel(step, project.joints);
    if (label) headKind = step.kind;
    if (step.kind === 'unbuild') headKind = null;
    return { span, label };
  });
  const out: CadChapter[] = [];
  heads.forEach(({ span, label }, i) => {
    if (!label) return;
    let end = span.end;
    for (const next of heads.slice(i + 1)) {
      if (next.label || next.span.step.kind === 'unbuild' || next.span.step.kind === 'build') break;
      end = next.span.end;
    }
    const focus = 'focus' in span.step && span.step.focus ? span.step.focus : undefined;
    out.push({ label, start: span.start, end, ...(focus ? { focus } : {}) });
  });
  return out;
}

/** Problems a schema can't see: unknown joint ids, missing pivots, a loop that would jump. */
export function timelineProblems(project: CadProject): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const j of project.joints) {
    if (ids.has(j.id)) errors.push(`joint id "${j.id}" is used twice`);
    ids.add(j.id);
    if (j.type === 'revolute' && !j.pivot) errors.push(`joint "${j.id}" is revolute but has no pivot`);
  }
  project.timeline.forEach((step, i) => {
    if (step.kind !== 'move') return;
    const keys = Object.keys(step.joints);
    if (keys.length === 0) errors.push(`timeline[${i}] moves no joints`);
    for (const id of keys) if (!ids.has(id)) errors.push(`timeline[${i}] moves unknown joint "${id}"`);
    for (const [id, spec] of Object.entries(step.joints)) {
      const m = jointMove(spec, step);
      if (m.delay + m.seconds > step.seconds + 1e-6) {
        errors.push(`timeline[${i}] joint "${id}" runs past the end of its step (delay ${m.delay} + ${m.seconds}s > ${step.seconds}s)`);
      }
    }
  });
  const total = duration(project.timeline);
  if (project.playFrom !== undefined && !chapters(project).some((c) => c.label === project.playFrom)) {
    errors.push(`playFrom "${project.playFrom}" isn't a chapter (have: ${chapters(project).map((c) => c.label).join(', ')})`);
  }
  if (project.posterAt !== undefined && project.posterAt > total) {
    errors.push(`posterAt ${project.posterAt}s is past the end of the timeline (${total}s)`);
  }
  const groupLabels = new Set(project.groups.map((g) => g.label).filter(Boolean));
  project.timeline.forEach((step, i) => {
    if (!('focus' in step) || !step.focus) return;
    for (const label of step.focus) if (!groupLabels.has(label)) errors.push(`timeline[${i}] focuses unknown group "${label}"`);
  });
  const start = initialState(project);
  const end = stateAt(project, total);
  const drift: string[] = [];
  // Nothing on screen at the loop point (every part has flown out): any jump there is invisible.
  if (end.assembly === 0 && start.assembly === 0) return { errors, warnings };
  if (Math.abs(end.assembly - start.assembly) > 1e-6) drift.push('assembly (end on an unbuild step)');
  if (Math.abs(end.explode - start.explode) > 1e-6) drift.push('explode (end with amount 0)');
  for (const id of Object.keys(start.joints)) {
    if (Math.abs((end.joints[id] ?? 0) - start.joints[id]) > 1e-6) drift.push(`joint "${id}"`);
  }
  if (drift.length) warnings.push(`the loop will jump because it doesn't return to its start: ${drift.join(', ')}`);
  return { errors, warnings };
}

/** Default poster moment: just after the first build finishes, otherwise the middle. */
export function posterTime(project: Pick<CadProject, 'timeline' | 'posterAt'>): number {
  if (project.posterAt !== undefined) return project.posterAt;
  const build = spans(project.timeline).find((s) => s.step.kind === 'build');
  const total = duration(project.timeline);
  return build ? Math.min(build.end + 0.4, total) : total / 2;
}
