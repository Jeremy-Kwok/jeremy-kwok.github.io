import { z } from 'zod';

// Adapted from Enport's lib/schema.ts. Database and editor-only fields
// (claimId, sortOrder, status, publishedAt, hero/thumbnail crop boxes,
// renderUrl, localPath, contributor and collaborator names) are dropped:
// this site renders static JSON, and teammate names are third-party data.
// Every object is strict, so an unexpected key fails the build instead of
// quietly shipping.

 // Enums for evidence and interface types
export const EvidenceType = z.enum([
  'drawing',
  'cad',
  'video',
  'report',
  'repo',
  'photo',
  'test_data',
  'minutes',
  'other',
  'screenshot',
  'diagram',
  'spec'
]);
export const InterfaceType = z.enum([
  'mechanical',
  'electrical',
  'software',
  'data',
  'process',
  'api',
  'ui'
]);

// An evidence link is either an absolute http(s) URL or a file this site
// serves from public/evidence/. lib/content.ts checks that local files exist.
const EvidenceUrl = z
  .string()
  .refine(
    (v) => /^https?:\/\//.test(v) || /^\/evidence\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(v),
    { message: 'must be an http(s) URL or a /evidence/<slug>/<file> path' }
  );

const NonBlank = z.string().trim().min(1);

// Zod schemas
export const EvidenceItemSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, 'evidence ids are kebab-case strings'),
  label: NonBlank,
  type: EvidenceType,
  // Absent = described but not publicly released; rendered as such.
  url: EvidenceUrl.optional(),
  note: z.string().optional(),
  mimeType: z.string().optional(),
});

export const InterfaceSchema = z.strictObject({
  from: NonBlank,
  to: NonBlank,
  type: InterfaceType,
  notes: z.string(),
});

export const ClaimSchema = z.strictObject({
  title: NonBlank,
  ownedScope: z.string(),
  requirementOrConstraint: z.string(),
  method: NonBlank,
  resultMetric: NonBlank,
  evidenceRefs: z.array(z.string()),
  limitations: z.string(),
  interfacesTouched: z.array(z.string()).optional(),
});

export const LessonSchema = z.strictObject({
  text: NonBlank,
});
export type Lesson = z.infer<typeof LessonSchema>;

export const TopMetricSchema = z.strictObject({
  label: NonBlank,
  value: NonBlank,
  unit: z.string().optional(),
});

export const WorkType = z.enum([
  'internship',
  'research',
  'coursework',
  'extracurricular',
  'personal',
]);
export type WorkType = z.infer<typeof WorkType>;

export const ProjectSchema = z
  .strictObject({
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be kebab-case'),
    // Homepage card order, ascending.
    order: z.number().int(),
    title: NonBlank,
    oneLiner: NonBlank,
    timeframe: z.string().optional(),
    role: NonBlank,
    organization: z.string().optional(),
    teamSize: z.number().int().positive().nullable().optional(),
    heroImage: EvidenceUrl.optional(),
    tags: z.array(NonBlank),
    whatIOwnedSummary: NonBlank,
    topMetrics: z.array(TopMetricSchema).min(1),
    claims: z.array(ClaimSchema).min(1),
    // What happened in the end: the one-paragraph answer to "so did it work?"
    outcome: NonBlank,
    interfaces: z.array(InterfaceSchema).optional(),
    // May be empty while a project's files are still being gathered; the
    // Evidence section is hidden until there is something in it.
    evidence: z.array(EvidenceItemSchema),
    projectRisks: z.array(NonBlank).optional(),
    lessons: z.array(LessonSchema).optional(),
    workType: WorkType.optional(),
  })
  .superRefine((project, ctx) => {
    const ids = new Set<string>();
    project.evidence.forEach((item, i) => {
      if (ids.has(item.id)) {
        ctx.addIssue({ code: 'custom', path: ['evidence', i, 'id'], message: `duplicate evidence id "${item.id}"` });
      }
      ids.add(item.id);
    });
    project.claims.forEach((claim, i) => {
      claim.evidenceRefs.forEach((ref, j) => {
        if (!ids.has(ref)) {
          ctx.addIssue({ code: 'custom', path: ['claims', i, 'evidenceRefs', j], message: `no evidence with id "${ref}"` });
        }
      });
    });
  });

// TypeScript types
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type Interface = z.infer<typeof InterfaceSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type TopMetric = z.infer<typeof TopMetricSchema>;
