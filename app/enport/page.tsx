import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { SITE_NAME } from "@/lib/site";
import { ogImage } from "@/lib/ogCard";

const description =
  "Enport: a structured portfolio platform for engineering students, built around one question: what did you specifically do, and how do you prove it?";

export const metadata: Metadata = {
  title: "Enport",
  description,
  alternates: { canonical: "/enport/" },
  openGraph: {
    title: `Enport — ${SITE_NAME}`,
    description,
    url: "/enport/",
    siteName: SITE_NAME,
    type: "article",
    images: [ogImage("site", SITE_NAME)],
  },
};

// The section stays hidden while this is empty.
const WHY_I_STOPPED =
  "Enport wasn't gaining enough traction to justify more of my time, and the harder problem turned out to be distribution, not the product. Students rarely pay for tools, and selling to schools means long, budget-driven buying cycles. I also realized I wanted to put my time into a different problem, one closer to robotics. The biggest lesson I took away: figure out who pays versus who uses, and how you'll reach them before building far. Enport's claims-and-evidence format lives on in this site.";

// Drafted from the Enport README for Jeremy to edit. Facts only: what the
// product was, how it was built, and what the build taught.
const BUILT = [
  "A project format with four parts: the specific contributions you owned, the evidence behind each one (CAD, drawings, test data, code, reports), the interfaces between your subsystem and the rest of the system, and an explicit line between your work and your team's.",
  "Project pages a recruiter can scan in about a minute, with every claim linked to the artifact that backs it.",
  "In-browser evidence viewing, including a three.js CAD viewer for GLB, STL, OBJ and STEP files, so a reviewer can inspect a model without installing anything.",
  "Attribution for team projects: contributors named on the work they did, and teammates able to verify their own entries.",
];

const STACK = [
  "Next.js (App Router), React, TypeScript, Tailwind CSS",
  "Zod schema as the single source of truth for a project",
  "Supabase Postgres, Auth and Storage, with every schema change in a versioned migration",
  "three.js for CAD rendering, Resend for email, Vercel and Cloudflare for hosting and DNS",
];

const LEARNED = [
  "Design around the question the reader actually asks. Resumes, LinkedIn and personal sites all fail the same question (what did you do, and how do you prove it?), and building the format backwards from that question is what made it work.",
  "On team projects, attribution is the hard part. Deciding who gets credit for shared work took more design rounds than any rendering or storage problem.",
  "A shared link is a contract. Once a URL is on a resume or in a recruiter email, renaming it breaks every copy. That's why the project pages on this site keep their Enport slugs.",
  "Scope is a design input when you build alone. A locked stack, a written spec for each slice of work, and a build that must pass before anything ships kept a one-person product shippable.",
];

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="text-sm sm:text-base text-zinc-700 leading-relaxed">• {item}</li>
      ))}
    </ul>
  );
}

export default function EnportPage() {
  return (
    <PageShell
      title="Enport"
      subtitle="A portfolio platform for engineering students, where every claim links to its evidence."
    >
      <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
        Engineering students do complex team work (Formula SAE, robotics, rocketry, capstone,
        research labs), but resumes, LinkedIn and personal sites can&rsquo;t answer the question
        recruiters actually ask: <em>what did you specifically do, and how do you prove it?</em> I
        built <a href="https://enport.dev" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Enport</a> to
        answer it. The <Link href="/#projects" className="text-blue-600 hover:underline">project pages on this site</Link> use
        its format.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">What I built</h2>
        <List items={BUILT} />
        <h3 className="text-sm font-semibold text-zinc-900 mt-8 mb-3 uppercase tracking-wider">Stack</h3>
        <List items={STACK} />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-900 mb-4">What I learned</h2>
        <List items={LEARNED} />
      </section>

      {WHY_I_STOPPED.trim() !== "" && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Why I stopped</h2>
          <p className="text-sm sm:text-base text-zinc-700 leading-relaxed whitespace-pre-line">{WHY_I_STOPPED}</p>
        </section>
      )}
    </PageShell>
  );
}
