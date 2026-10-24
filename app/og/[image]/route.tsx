import { getProject, loadProjects } from '@/lib/content';
import { renderOgCard } from '@/lib/ogCard';
import { INTRO } from '@/lib/site';

// Share cards written at build time as out/og/site.png and out/og/<slug>.png.
// A route handler rather than the opengraph-image convention because the
// convention exports files with no extension, which static hosts serve as
// application/octet-stream and some unfurlers then refuse.

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ image: 'site.png' }, ...loadProjects().map((p) => ({ image: `${p.slug}.png` }))];
}

export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  if (image === 'site.png') {
    return renderOgCard({ title: 'Engineering projects', subtitle: INTRO });
  }

  const project = getProject(image.replace(/\.png$/, ''))!;
  const byline = [
    project.timeframe,
    `${project.claims.length} key work item${project.claims.length === 1 ? '' : 's'}`,
    project.evidence.length > 0 ? `${project.evidence.length} evidence` : null,
  ].filter(Boolean).join('  ·  ');
  return renderOgCard({ title: project.title, subtitle: project.oneLiner, byline });
}
