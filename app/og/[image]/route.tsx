import { getProject, loadProjects } from '@/lib/content';
import { projectThumbnail } from '@/lib/images';
import { renderOgCard } from '@/lib/ogCard';
import { INTRO, SITE_NAME } from '@/lib/site';

// Share cards written at build time as out/og/site.png and out/og/<slug>.png.
// A route handler rather than the opengraph-image convention because the
// convention exports files with no extension, which static hosts serve as
// application/octet-stream and some unfurlers then refuse.

export const dynamic = 'force-static';
export const dynamicParams = false;

// The site card's 2x2 grid: projects whose pictures read at thumbnail size
// (hardware, a render, a micrograph), not diagrams.
const SITE_CARD_PROJECTS = [
  'iris-integrated-reliability-imaging-system',
  'medlock',
  'mechanical-builds',
  'afm-cell-segmentation',
];

export function generateStaticParams() {
  return [{ image: 'site.png' }, ...loadProjects().map((p) => ({ image: `${p.slug}.png` }))];
}

export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  if (image === 'site.png') {
    const images = SITE_CARD_PROJECTS.map((slug) => {
      const project = getProject(slug);
      if (!project) throw new Error(`app/og/[image]/route.tsx: SITE_CARD_PROJECTS names "${slug}", which isn't a project`);
      return projectThumbnail(project);
    });
    return renderOgCard({ title: SITE_NAME, subtitle: INTRO, images });
  }

  const project = getProject(image.replace(/\.png$/, ''))!;
  const byline = [project.organization, project.timeframe].filter((s): s is string => !!s);
  return renderOgCard({
    eyebrow: SITE_NAME,
    title: project.title,
    subtitle: project.oneLiner,
    byline,
    images: [projectThumbnail(project)],
  });
}
