import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ContactLinks from "@/components/ContactLinks";
import { loadProjects } from "@/lib/content";
import { INTRO, TARGET_ROLES } from "@/lib/site";

export default function HomePage() {
  const projects = loadProjects();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <section>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight">{INTRO}</h1>
        <p className="mt-4 text-base text-zinc-500">
          <span className="font-medium text-zinc-700">Looking for:</span> {TARGET_ROLES}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link
            href="/resume/"
            className="font-medium text-white bg-zinc-900 hover:bg-zinc-700 px-5 py-2 rounded-lg transition-colors"
          >
            Resume
          </Link>
          <ContactLinks />
        </div>
      </section>

      <section id="projects" className="mt-16 scroll-mt-20">
        <h2 className="text-xl font-semibold text-zinc-900 mb-6">Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Also built</h2>
        <p className="text-sm sm:text-base text-zinc-600">
          <Link href="/enport/" className="text-blue-600 hover:underline">Enport</Link>, a structured
          portfolio platform for engineering students. These project pages use its
          claims-and-evidence format.
        </p>
      </section>
    </div>
  );
}
