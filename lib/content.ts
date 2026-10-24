import fs from 'node:fs';
import path from 'node:path';
import { ProjectSchema, type Project } from '@/lib/schema';

// The one place project JSON is read. Every page that lists or renders a
// project goes through loadProjects(), and generateStaticParams runs it
// during `next build`, so a single invalid file fails the build. All files
// are checked before throwing so one run reports every problem.

const projectsDir = path.join(process.cwd(), 'content', 'projects');
const publicDir = path.join(process.cwd(), 'public');

function localFileProblems(project: Project): string[] {
  const urls = [
    project.heroImage,
    ...project.evidence.map((e) => e.url),
  ].filter((u): u is string => !!u && u.startsWith('/'));
  return urls
    .filter((u) => !fs.existsSync(path.join(publicDir, u)))
    .map((u) => `${u}: file not found in public/`);
}

let cache: Project[] | null = null;

export function loadProjects(): Project[] {
  if (cache) return cache;

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
    projects.push(project);
  }

  if (filenames.length === 0) errors.push('content/projects has no .json files');
  if (errors.length > 0) {
    throw new Error(`Invalid project content:\n  ${errors.join('\n  ')}`);
  }

  cache = projects.sort((a, b) => a.order - b.order);
  return cache;
}

export function getProject(slug: string): Project | undefined {
  return loadProjects().find((p) => p.slug === slug);
}
