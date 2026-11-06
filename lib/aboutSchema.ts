import { z } from 'zod';

// Schemas for the /about page data in content/about/. Same approach as
// lib/schema.ts: every object is strict, so a typo'd key fails the build
// instead of quietly not rendering. Cross-field checks (lane ids exist, image
// files exist, rows don't overlap) live in lib/aboutContent.ts.

const NonBlank = z.string().trim().min(1);
const Kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'ids are kebab-case');
const Hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'colors are #RRGGBB');

/** 'YYYY-MM'. */
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'months are YYYY-MM');

// Internal links are root-relative (/projects/x/) so they survive a domain
// change; external links are absolute http(s).
const Href = z
  .string()
  .refine((v) => /^https:\/\/\S+$/.test(v) || /^\/[a-z0-9/-]*$/.test(v), {
    message: 'must be an https URL or a root-relative path like /projects/x/',
  });

export const LaneIdSchema = z.enum(['school', 'work', 'nonprofit', 'research', 'building']);
export type LaneId = z.infer<typeof LaneIdSchema>;

export const LaneSchema = z.strictObject({
  id: LaneIdSchema,
  name: NonBlank,
  color: Hex,
});
export type Lane = z.infer<typeof LaneSchema>;

export const TimelineLinkSchema = z.strictObject({
  // The spec's convention: every link starts with "Read".
  text: NonBlank.refine((t) => t.startsWith('Read'), { message: 'link text starts with "Read"' }),
  href: Href,
});
export type TimelineLink = z.infer<typeof TimelineLinkSchema>;

export const TimelineItemSchema = z.strictObject({
  id: Kebab,
  lane: LaneIdSchema,
  /** One or more [start, end] month ranges, both inclusive. Several = semesters-only work. */
  segments: z.array(z.tuple([MonthSchema, MonthSchema])).min(1),
  /** Force a row inside the lane (0 = top). Omit to take the first free row by start date. */
  track: z.number().int().min(0).optional(),
  /** Draw a graduation diamond at the end of the bar. */
  milestone: z.boolean().optional(),
  /** Short text shown above the bar. */
  label: NonBlank,
  /** Detail card heading. */
  title: NonBlank,
  /** Detail card date line, written for humans. */
  dates: NonBlank,
  description: NonBlank,
  quote: z.strictObject({ text: NonBlank, by: NonBlank }).optional(),
  links: z.array(TimelineLinkSchema).min(1).optional(),
});
export type TimelineItem = z.infer<typeof TimelineItemSchema>;

export const AxisSchema = z.strictObject({ start: MonthSchema, end: MonthSchema });
export type Axis = z.infer<typeof AxisSchema>;

export const MechanismSchema = z.strictObject({
  id: Kebab,
  name: NonBlank,
  image: z.string().regex(/^\/about\/[A-Za-z0-9._-]+$/, 'images live in /public/about/'),
  alt: NonBlank,
  title: NonBlank,
  text: NonBlank,
  /** Jeremy's own contribution to this mechanism, if it was clearly his. */
  myPart: NonBlank.optional(),
  /** The CAD showcase chapter this mechanism plays (content/cad/blockparty.ts), once the CAD is rendered. */
  cadChapter: NonBlank.optional(),
});
export type Mechanism = z.infer<typeof MechanismSchema>;
