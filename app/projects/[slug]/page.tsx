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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: 'Project not found' };

  // Same 155-character clip Enport uses for share descriptions.
  const raw = project.oneLiner;
  const description = raw.length <= 155 ? raw : raw.slice(0, 155).replace(/\s+\S*$/, '') + '…';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <ProjectBody project={project} />
    </div>
  );
}
