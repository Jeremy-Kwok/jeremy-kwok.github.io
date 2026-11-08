import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProjectBody from '@/components/ProjectBody';
import { getProject, loadProjects } from '@/lib/content';
import { SITE_NAME } from '@/lib/site';
import { ogImage } from '@/lib/ogCard';

// Only slugs with a JSON file exist; anything else is the static 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return loadProjects().map((p) => ({ slug: p.slug }));
}

// Search results and link previews show about 155 characters. Keep whole
// sentences that fit, so a description never stops halfway through a figure
// like "0.813 Dice / 0.7…"; only a first sentence longer than that is cut, at a
// word boundary.
const DESCRIPTION_MAX = 155;

function shareDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;
  // A sentence ends at . ! or ? followed by a space, so "0.813" stays whole.
  let kept = '';
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    const next = kept ? `${kept} ${s}` : s;
    if (next.length > DESCRIPTION_MAX) break;
    kept = next;
  }
  if (kept) return kept;
  return text.slice(0, DESCRIPTION_MAX - 1).replace(/\s+\S*$/, '').replace(/[,;:]$/, '') + '…';
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: 'Project not found' };

  const description = project.metaDescription ?? shareDescription(project.oneLiner);
  const url = `/projects/${slug}/`;
  const image = ogImage(slug, project.title);

  return {
    title: project.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: project.title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'article',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description,
      images: [image],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <div className="px-4 sm:px-8 py-10 sm:py-12">
      <div className="mx-auto max-w-(--page-max)">
        <ProjectBody project={project} />
      </div>
    </div>
  );
}
