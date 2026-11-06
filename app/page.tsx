import type { Metadata } from "next";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import ContactLinks from "@/components/ContactLinks";
import { loadProjects } from "@/lib/content";
import { INTRO, TARGET_ROLES } from "@/lib/site";

// Title, description and link preview come from the root layout.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-6 border-t border-rule pt-3 font-display text-2xl leading-tight text-ink">{children}</h2>;
}

export default function HomePage() {
  const projects = loadProjects();

  return (
    // Padding outside, max width inside, like the header, so the left edges line up.
    <div className="px-4 sm:px-8 py-12 sm:py-16">
      <div className="mx-auto max-w-(--page-max)">
        <section>
          <h1 className="font-display text-[clamp(30px,6vw,44px)] leading-[1.05] text-ink">{INTRO}</h1>
          <p className="mt-4 max-w-[680px] text-[17px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Looking for:</span> {TARGET_ROLES}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link
              href="/resume/"
              className="border border-ink bg-ink px-5 py-2 font-label text-[15px] font-semibold text-paper transition-colors hover:bg-ink-2"
            >
              Resume
            </Link>
            <ContactLinks />
          </div>
        </section>

        <section id="projects" className="mt-16 scroll-mt-20">
          <SectionHeading>Projects</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {projects.map((project, i) => (
              <ProjectCard key={project.slug} project={project} priority={i === 0} />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading>Also built</SectionHeading>
          <p className="max-w-[680px] text-base text-zinc-600">
            <Link href="/enport/" className="text-link underline underline-offset-[3px]">Enport</Link>, a
            structured portfolio platform for engineering students. These project pages use its
            claims-and-evidence format.
          </p>
        </section>

        <section className="mt-16">
          <SectionHeading>Outside work</SectionHeading>
          <p className="max-w-[680px] text-base text-zinc-600">
            I&rsquo;m learning to fly, working toward my private pilot license a few times a week. I
            also wrote a small Python script to grab open lesson slots, because lining up my schedule,
            the planes and my instructor&rsquo;s is a lot of bookkeeping.{" "}
            <Link href="/about/#outside-work" className="text-link underline underline-offset-[3px]">
              More on the About page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
