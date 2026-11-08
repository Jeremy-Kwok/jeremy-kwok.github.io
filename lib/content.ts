import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ProjectSchema, type Project } from '@/lib/schema';
import { imageManifest } from '@/lib/images';

// The one place project JSON is read. Every page that lists or renders a
// project goes through loadProjects(), and generateStaticParams runs it
// during `next build`, so a single invalid file fails the build. All files
// are checked before throwing so one run reports every problem.

const projectsDir = path.join(process.cwd(), 'content', 'projects');
const publicDir = path.join(process.cwd(), 'public');

// An image that has display-size copies must still match them: a re-exported
// poster with stale copies would show the old version to every phone.
function staleImageProblems(project: Project): string[] {
  const manifest = imageManifest();
  const urls = [project.heroImage, project.cardImage, ...project.evidence.map((e) => e.url)].filter(
    (u): u is string => !!u && u.startsWith('/') && !!manifest[u]
  );
  const problems: string[] = [];
  for (const u of urls) {
    const file = path.join(publicDir, u);
    if (!fs.existsSync(file)) continue;
    const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (sha !== manifest[u].sha256) problems.push(`${u}: changed since its display copies were made. Run: npm run images`);
    for (const v of manifest[u].variants) {
      if (!fs.existsSync(path.join(publicDir, v.src))) problems.push(`${v.src}: missing. Run: npm run images`);
    }
  }
  return problems;
}

function localFileProblems(project: Project): string[] {
  const urls = [
    project.heroImage,
    project.cardImage,
    ...project.evidence.map((e) => e.url),
    ...project.evidence.map((e) => e.poster),
  ].filter((u): u is string => !!u && u.startsWith('/'));
  return urls
    .filter((u) => !fs.existsSync(path.join(publicDir, u)))
    .map((u) => `${u}: file not found in public/`);
}

let cache: Project[] | null = null;

// `skipImageCheck` is for scripts/images.ts only: it is the command that refreshes
// stale display copies, so the staleness check must not stop it from running.
export function loadProjects({ skipImageCheck = false }: { skipImageCheck?: boolean } = {}): Project[] {
  // The dev server keeps modules alive across requests, so only cache in production
  // builds; otherwise a new or edited project JSON doesn't show until a restart.
  if (cache && !skipImageCheck && process.env.NODE_ENV === 'production') return cache;

  const filenames = fs
    .readdirSync(projectsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const errors: string[] = [];
  const projects: Project[] = [];

  for (const filename of filenames) {
    let json: unknown;
    try {
      json = JSON.parse(fs.readFileSync(path.join(projectsDir, filename), 'utf-8'));
    } catch (err) {
      errors.push(`${filename}: invalid JSON (${err instanceof Error ? err.message : String(err)})`);
      continue;
    }

    const result = ProjectSchema.safeParse(json);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${filename}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      continue;
    }

    const project = result.data;
    if (`${project.slug}.json` !== filename) {
      errors.push(`${filename}: slug "${project.slug}" does not match the filename`);
    }
    errors.push(...localFileProblems(project).map((p) => `${filename}: ${p}`));
    if (!skipImageCheck) errors.push(...staleImageProblems(project).map((p) => `${filename}: ${p}`));
    projects.push(project);
  }

  if (filenames.length === 0) errors.push('content/projects has no .json files');
  if (errors.length > 0) {
    throw new Error(`Invalid project content:\n  ${errors.join('\n  ')}`);
  }

  const sorted = projects.sort((a, b) => a.order - b.order);
  if (!skipImageCheck) cache = sorted;
  return sorted;
}

export function getProject(slug: string): Project | undefined {
  return loadProjects().find((p) => p.slug === slug);
}
