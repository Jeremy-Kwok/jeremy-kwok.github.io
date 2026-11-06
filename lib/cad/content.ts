import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { CAD_LAB, CAD_PROJECTS } from '@/content/cad';
import { CadMetaSchema, CadProjectSchema, type CadMeta, type CadProject, type CadPublic } from '@/lib/cad/schema';
import { chapters, duration, timelineProblems } from '@/lib/cad/phases';

// The one place CAD showcase settings and renders are checked, like
// lib/aboutContent.ts for /about. Pages call it during `next build`,
// scripts/validate-content.ts in prebuild, and scripts/cad/build.ts before a
// render. Source STEP files are never read here: CI builds from the committed
// renders alone.

/** Bump when the renderer changes in a way that changes its output, so every render is redone. */
export const PIPELINE_VERSION = 5;
/** Output size; frames are drawn at `supersample` x and scaled down, which smooths the edge lines. */
export const VIDEO = { width: 1280, height: 800, fps: 30, supersample: 2 } as const;

// The code that decides what a render looks like. Its contents (and the
// versions of the libraries it leans on) are part of the render hash, so
// changing an easing or the camera without re-rendering fails the build
// instead of shipping a video that no longer matches the live 3D view.
const RENDER_SOURCES = [
  'lib/cad/phases.ts',
  'lib/cad/timeline.ts',
  'lib/cad/stage.ts',
  'lib/cad/match.ts',
  'scripts/cad/stepToGlb.ts',
  'scripts/cad/render-page.ts',
];
const RENDER_PACKAGES = ['three', 'occt-import-js', '@gltf-transform/core', '@gltf-transform/extensions', 'meshoptimizer'];

let codeFingerprint: string | null = null;
function renderCodeFingerprint(): string {
  if (codeFingerprint) return codeFingerprint;
  const h = crypto.createHash('sha256');
  for (const rel of RENDER_SOURCES) {
    h.update(rel);
    h.update(fs.readFileSync(path.join(process.cwd(), rel), 'utf-8').replace(/\r\n/g, '\n'));
  }
  for (const pkg of RENDER_PACKAGES) {
    const manifest = path.join(process.cwd(), 'node_modules', pkg, 'package.json');
    h.update(`${pkg}@${fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf-8')).version : 'missing'}`);
  }
  codeFingerprint = h.digest('hex');
  return codeFingerprint;
}

const publicDir = path.join(process.cwd(), 'public');

export interface CadEntry {
  project: CadProject;
  /** Lab models render to public/cad/lab/ (gitignored) and only show on the dev-only lab page. */
  lab: boolean;
  /** Absolute output folder. */
  dir: string;
  /** URL of the output folder, with a trailing slash. */
  urlBase: string;
  meta: CadMeta | null;
}

function zodProblems(label: string, schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((i) => `${label}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Hash of everything that changes the rendered output: the settings (title and
 * description are text only, so they're left out), the pipeline's own code, and
 * the versions of the 3D libraries.
 */
export function renderHash(project: CadProject): string {
  const { title: _title, description: _description, ...rendered } = project;
  void _title;
  void _description;
  return crypto
    .createHash('sha256')
    .update(stableStringify({ pipeline: PIPELINE_VERSION, video: VIDEO, code: renderCodeFingerprint(), project: rendered }))
    .digest('hex');
}

/** Parses and cross-checks every settings file; throws with every problem listed. */
export function parseCadProjects(): { project: CadProject; lab: boolean }[] {
  const problems: string[] = [];
  const out: { project: CadProject; lab: boolean }[] = [];
  const seen = new Set<string>();
  const all = [
    ...CAD_PROJECTS.map((p) => ({ input: p, lab: false })),
    ...CAD_LAB.map((p) => ({ input: p, lab: true })),
  ];
  for (const { input, lab } of all) {
    const label = `content/cad/${lab ? 'lab/' : ''}${input.slug ?? '(no slug)'}`;
    const issues = zodProblems(label, CadProjectSchema, input);
    if (issues.length) {
      problems.push(...issues);
      continue;
    }
    const project = CadProjectSchema.parse(input);
    if (seen.has(project.slug)) problems.push(`${label}: slug "${project.slug}" is used twice`);
    seen.add(project.slug);
    problems.push(...timelineProblems(project).errors.map((e) => `${label}: ${e}`));
    out.push({ project, lab });
  }
  if (problems.length) throw new Error(`CAD settings are invalid (${problems.length}):\n  ${problems.join('\n  ')}`);
  return out;
}

export function entryLocation(project: CadProject, lab: boolean): { dir: string; urlBase: string } {
  const rel = lab ? `cad/lab/${project.slug}` : `cad/${project.slug}`;
  return { dir: path.join(publicDir, rel), urlBase: `/${rel}/` };
}

let cache: CadEntry[] | null = null;

/**
 * Every showcase with its render, if it has one. Throws when a render is
 * stale (settings changed since) or its files don't match meta.json, so a
 * page can never show a video that disagrees with its 3D model.
 */
export function loadCadEntries(): CadEntry[] {
  // The dev server keeps modules alive across renders, so only cache in production builds.
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const problems: string[] = [];
  const entries: CadEntry[] = parseCadProjects().map(({ project, lab }) => {
    const { dir, urlBase } = entryLocation(project, lab);
    const metaFile = path.join(dir, 'meta.json');
    const label = `public${urlBase}meta.json`;
    if (!fs.existsSync(metaFile)) return { project, lab, dir, urlBase, meta: null };
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
    } catch (err) {
      problems.push(`${label}: not valid JSON (${err instanceof Error ? err.message : String(err)})`);
      return { project, lab, dir, urlBase, meta: null };
    }
    const issues = zodProblems(label, CadMetaSchema, raw);
    if (issues.length) {
      problems.push(...issues);
      return { project, lab, dir, urlBase, meta: null };
    }
    const meta = CadMetaSchema.parse(raw);
    if (meta.renderHash !== renderHash(project)) {
      problems.push(
        `${label}: content/cad/${lab ? 'lab/' : ''}${project.slug}.ts changed since the last render. Run: npm run cad -- ${project.slug}`
      );
    }
    const files: [string, number][] = [
      [meta.video.file, meta.video.bytes],
      [meta.poster.file, meta.poster.bytes],
      ...(meta.model ? ([[meta.model.file, meta.model.bytes]] as [string, number][]) : []),
    ];
    for (const [file, bytes] of files) {
      const full = path.join(dir, file);
      if (!fs.existsSync(full)) problems.push(`public${urlBase}${file}: missing (listed in meta.json)`);
      else if (fs.statSync(full).size !== bytes) problems.push(`public${urlBase}${file}: size doesn't match meta.json; re-render`);
    }
    if (!project.interactive && (meta.model || fs.existsSync(path.join(dir, 'model.glb')))) {
      problems.push(`public${urlBase}model.glb: ${project.slug} is video-only (interactive: false), so its model must not be published`);
    }
    if (project.interactive && !meta.model) {
      problems.push(`${label}: ${project.slug} is interactive but its render has no model. Run: npm run cad -- ${project.slug}`);
    }
    return { project, lab, dir, urlBase, meta };
  });
  if (problems.length) throw new Error(`CAD renders are out of date (${problems.length}):\n  ${problems.join('\n  ')}`);
  cache = entries;
  return entries;
}

export function toPublic(entry: CadEntry): CadPublic | null {
  const { project, meta, urlBase } = entry;
  if (!meta) return null;
  // The hash busts browser and CDN caches whenever a render is replaced under the same file name.
  const v = `?v=${meta.renderHash.slice(0, 10)}${meta.sourceSha256.slice(0, 6)}`;
  return {
    slug: project.slug,
    title: project.title,
    description: project.description,
    video: {
      src: `${urlBase}${meta.video.file}${v}`,
      width: meta.video.width,
      height: meta.video.height,
      seconds: meta.video.seconds,
      fps: meta.video.fps,
    },
    poster: `${urlBase}${meta.poster.file}${v}`,
    model: meta.model ? { src: `${urlBase}${meta.model.file}${v}`, bytes: meta.model.bytes } : null,
    project,
    chapters: chapters(project).map((c) => {
      // A focused chapter takes its first group's color; the build takes the first group's (the base).
      const isBuild = project.timeline[0]?.kind === 'build' && c.start === 0;
      const color = c.focus
        ? project.groups.find((g) => g.label === c.focus![0])?.color
        : isBuild
          ? project.groups[0]?.color
          : undefined;
      return color ? { ...c, color } : c;
    }),
    steps: meta.steps,
  };
}

/** A site showcase ready for <CadShowcase>, or null until it has been rendered. */
export function cadPublic(slug: string): CadPublic | null {
  const entry = loadCadEntries().find((e) => !e.lab && e.project.slug === slug);
  return entry ? toPublic(entry) : null;
}

export function cadDuration(project: CadProject): number {
  return duration(project.timeline);
}
