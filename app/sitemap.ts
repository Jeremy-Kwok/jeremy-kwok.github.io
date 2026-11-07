import type { MetadataRoute } from 'next';
import { loadProjects } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

// Written to out/sitemap.xml at build time. Every indexable page; the old
// /projects/frc-mechanical/ redirect is noindex and stays out. No
// lastModified: a build date on every page would tell crawlers nothing.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/about/', '/resume/', ...loadProjects().map((p) => `/projects/${p.slug}/`), '/enport/'];
  return paths.map((p) => ({ url: new URL(p, SITE_URL).href }));
}
