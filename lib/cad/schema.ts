import { z } from 'zod';

// Settings for one CAD showcase (content/cad/*.ts) and the meta.json that
// `npm run cad` writes next to its outputs. Kept free of three.js and node
// APIs so client components can import the types.

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
const Seconds = z.number().positive().max(60);

/**
 * Selects parts by their path in the STEP tree, e.g. "Robot/carriage-subassembly/arm".
 * Plain text matches as a case-insensitive substring; "/.../" is a regular expression.
 */
export const PartMatchSchema = z
  .string()
  .min(1)
  .refine((rule) => {
    if (!(rule.length > 2 && rule.startsWith('/') && rule.endsWith('/'))) return true;
    try {
      new RegExp(rule.slice(1, -1), 'i');
      return true;
    } catch {
      return false;
    }
  }, 'invalid regular expression');

/**
 * Selects parts by name, by where they sit, or both. Position is the part's
 * center in model coordinates (after the up-axis turn) in the pose the STEP
 * was saved in. Use it when two parts share a name, like the left and right
 * members of a drawer slide.
 */
export const PartSelectorSchema = z.union([
  PartMatchSchema,
  z
    .strictObject({
      match: PartMatchSchema.optional(),
      /** [[minX, minY, minZ], [maxX, maxY, maxZ]] */
      within: z.tuple([Vec3, Vec3]).optional(),
      /** Leave out parts that match this rule. */
      not: PartMatchSchema.optional(),
    })
    .refine((s) => s.match !== undefined || s.within !== undefined, 'give `match`, `within`, or both'),
]);
export type PartSelector = z.output<typeof PartSelectorSchema>;

/** A direction: a named axis, a vector, or the long axis of a reference part (a shaft or rail). */
const AxisSchema = z.union([
  z.enum(['x', 'y', 'z', '-x', '-y', '-z']),
  Vec3,
  z.strictObject({ alongPart: PartMatchSchema }),
]);

/** A point: model coordinates (after the up-axis turn), or the center of a reference part. */
const PivotSchema = z.union([Vec3, z.strictObject({ centerOf: PartMatchSchema })]);

export const JointSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, digits and dashes'),
  /** Shown on the 3D view's chapter buttons, e.g. "Ore arms". */
  label: z.string().min(1),
  /** The parts this joint moves. List a parent joint before any joint it carries. */
  parts: z.array(PartSelectorSchema).min(1),
  type: z.enum(['revolute', 'prismatic']),
  axis: AxisSchema,
  /** Required for revolute joints. */
  pivot: PivotSchema.optional(),
  /** Starting value: degrees for revolute, model units (usually mm) for prismatic. */
  initial: z.number().default(0),
});

const Label = z.string().min(1).optional();
/** Group labels to keep at full strength; every other part dims while the step runs. */
const Focus = z.array(z.string().min(1)).min(1).optional();
const Hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'use a hex color like #c23b22');

const EaseSchema = z.enum(['inOut', 'out', 'in', 'linear']);

/** One joint's part of a move: where it goes, and when within the step. */
const JointMoveSchema = z.strictObject({
  to: z.number(),
  /** Seconds after the step starts. */
  delay: z.number().min(0).default(0),
  /** Defaults to the rest of the step. */
  seconds: z.number().positive().optional(),
  /** Defaults to the step's ease. */
  ease: EaseSchema.optional(),
});

export const StepSchema = z.discriminatedUnion('kind', [
  /** Parts fly in one after another and snap into place. */
  z.strictObject({ kind: z.literal('build'), seconds: Seconds, label: Label }),
  /** Parts fly back out, last in first out. Ending on this makes the video loop cleanly. */
  z.strictObject({ kind: z.literal('unbuild'), seconds: Seconds, label: Label }),
  z.strictObject({ kind: z.literal('hold'), seconds: Seconds, label: Label, focus: Focus }),
  /** Spread parts apart (amount 1 is a normal exploded view) or bring them back (amount 0). */
  z.strictObject({ kind: z.literal('explode'), seconds: Seconds, amount: z.number().min(0).max(3), label: Label }),
  /**
   * Drive joints to new values. Values persist until the next move. A joint can
   * be just a target, or { to, delay, seconds, ease } to overlap motions inside
   * one step (a carriage launching while the arms open, say).
   */
  z.strictObject({
    kind: z.literal('move'),
    seconds: Seconds,
    joints: z.record(z.string(), z.union([z.number(), JointMoveSchema])),
    label: Label,
    focus: Focus,
    /** "out" starts fast and settles (a launch); "in" starts slow; "inOut" both. */
    ease: EaseSchema.default('inOut'),
  }),
]);

export const CameraSchema = z.strictObject({
  /** Degrees around the vertical axis, 0 = looking from +Z. */
  azimuth: z.number().default(35),
  /** Degrees above the horizon. */
  elevation: z.number().min(-80).max(80).default(22),
  /** The camera sways this many degrees either side of `azimuth` over one loop. */
  sway: z.number().min(0).max(180).default(18),
  /** Above 1 moves closer than the automatic fit. */
  zoom: z.number().positive().max(5).default(1),
});

export const CadProjectSchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, digits and dashes'),
  title: z.string().min(1),
  /** One sentence describing what the animation shows. Read by screen readers. */
  description: z.string().min(1),
  /**
   * false publishes the video only: no 3D model file is written to public/, so
   * nobody can download the geometry. Use it for work under NDA.
   */
  interactive: z.boolean().default(true),
  /** Which axis points up in the STEP file. SolidWorks exports Y-up; Onshape and FreeCAD Z-up. */
  up: z.enum(['y', 'z']).default('y'),
  /** "cad" keeps the colors in the STEP file; "mono" draws every part in drawing grey. */
  colors: z.enum(['cad', 'mono']).default('cad'),
  /** Parts drawn in the site's accent red. */
  accent: z.array(PartMatchSchema).default([]),
  /** Parts left out of the model, e.g. a test fixture or the field. */
  hide: z.array(PartMatchSchema).default([]),
  /**
   * Build steps, in order: earlier groups arrive first and explode as units.
   * `color` paints the group's parts (several groups can share one subsystem color).
   */
  groups: z.array(z.strictObject({ match: PartMatchSchema, label: Label, color: Hex.optional() })).default([]),
  joints: z.array(JointSchema).default([]),
  camera: CameraSchema.prefault({}),
  timeline: z.array(StepSchema).min(1),
  /** Second of the timeline used for the poster image. Defaults to the end of the first build. */
  posterAt: z.number().min(0).optional(),
});

export type CadProjectInput = z.input<typeof CadProjectSchema>;
export type CadProject = z.output<typeof CadProjectSchema>;
export type CadJoint = CadProject['joints'][number];
export type CadStep = CadProject['timeline'][number];

export const CadMetaSchema = z.strictObject({
  pipeline: z.number().int(),
  /** Hash of every setting that changes the output; the build fails when it goes stale. */
  renderHash: z.string().regex(/^[0-9a-f]{64}$/),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/),
  generated: z.string().min(1),
  video: z.strictObject({
    file: z.literal('loop.mp4'),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().int().positive(),
    seconds: z.number().positive(),
    bytes: z.number().int().positive(),
  }),
  poster: z.strictObject({ file: z.literal('poster.jpg'), bytes: z.number().int().positive() }),
  /** The build's steps in video seconds, so the page can caption them without loading 3D. */
  steps: z.array(z.strictObject({ label: z.string().min(1), start: z.number().min(0), end: z.number().min(0) })),
  model: z
    .strictObject({
      file: z.literal('model.glb'),
      bytes: z.number().int().positive(),
      parts: z.number().int().positive(),
      triangles: z.number().int().positive(),
    })
    .nullable(),
});

export type CadMeta = z.output<typeof CadMetaSchema>;

export interface CadChapter {
  label: string;
  start: number;
  end: number;
  /** Groups the chapter focuses on, if any. */
  focus?: string[];
  /** Subsystem color of the first focused group, for legends. */
  color?: string;
}

export type CadBuildStep = CadChapter;

/** Everything a page hands to <CadShowcase>. Plain data, safe to serialize to the client. */
export interface CadPublic {
  slug: string;
  title: string;
  description: string;
  video: { src: string; width: number; height: number; seconds: number; fps: number };
  poster: string;
  model: { src: string; bytes: number } | null;
  project: CadProject;
  chapters: CadChapter[];
  /** Build steps in seconds, for the "3 Floors" caption. */
  steps: CadBuildStep[];
}
