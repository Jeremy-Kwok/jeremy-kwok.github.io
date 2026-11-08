import type { Metadata } from "next";
import Link from "next/link";
import Headshot from "@/components/Headshot";
import Timeline, { TimelineLinkAnchor } from "@/components/Timeline";
import DesignWalkthrough, { Balloon } from "@/components/DesignWalkthrough";
import TitleBlock from "@/components/TitleBlock";
import { loadAbout } from "@/lib/aboutContent";
import { cadPublic } from "@/lib/cad/content";
import { fractionalMonth } from "@/lib/timelineLayout";
import { CONTACT, SITE_NAME } from "@/lib/site";
import { safeExternalUrl } from "@/lib/externalUrl";
import { ogImage } from "@/lib/ogCard";

// /about: intro, the non-linear path as a timeline, one design walkthrough,
// what I'm doing now, how I work, outside work, contact, and a title block.
// Copy follows docs/about/ABOUT_PAGE_SPEC.md, with Jeremy's own words in the
// spots the spec left for him.

const LEAD =
  "I’m a mechanical engineering student at Georgia Tech (CS minor), graduating in December 2026. I’m in Atlanta through December, then New York.";

const INTRO =
  "This year has been hardware: at Mujin I wrote the plan to qualify a replacement vacuum cup for a robot gripper, ran the bench tests and managed the field trial, and at Bloom Energy I designed and built a five-camera inspection station for returned fuel cell columns. Before that, I built robots on my high school robotics team and in a Georgia Tech design course, led student software teams for nonprofits, consulted for a semester, and started research in a bio lab, which I still do. What I like most is taking a problem the whole way through: ideation, evaluating possible solutions, prototyping and fabrication, then verifying and validating it once it’s built.";

const LATELY: { lead: string; text: string; link?: { text: string; href: string } }[] = [
  {
    lead: "Capstone.",
    text: "MedLock, a tabletop station that guides IVF patients through preparing an injection at home and checks the syringe before they inject. I do all of the CAD and run our customer discovery, interviewing clinicians and surveying clinics and patients as the prototype develops.",
    link: { text: "Read about MedLock", href: "/projects/medlock/" },
  },
  {
    lead: "Research.",
    text: "I own the damage analysis and built the imaging pipeline for an atomic force microscopy (AFM) study of T cells in the Sulchek Lab.",
    link: { text: "Read about the research", href: "/projects/afm-research/" },
  },
  {
    lead: "Looking for.",
    text: "Full-time mechanical, mechatronics or test engineering work in robotics or medical devices after I graduate in December, especially a role where I own a system from the first requirement to how it holds up in the field. Open to relocating for the right role, ideally to a city like New York or Boston.",
  },
];

// Planned follow-up: link each line to the project that proves it.
const HOW_I_WORK = [
  "A test plan is only as good as the decision it lets you make.",
  "If I do something by hand three times, I write a script.",
  "Dashboards don’t fix anything. Decisions do.",
  "I write the acceptance criteria before I open CAD.",
];

const OUTSIDE_WORK =
  "Recently I’ve been learning to fly. I’m a student pilot with the Yellow Jacket Flying Club out of DeKalb-Peachtree Airport (PDK), training in a Cessna 172 toward my private pilot license, and right now I’m working through slow flight and stalls. It’s genuinely hard to learn, with the maneuvers, navigation planning and radio calls all at once, but it’s a lot of fun. Every time something new clicks, like a maneuver or a landing, the sense of accomplishment is hugely gratifying.";

export const metadata: Metadata = {
  title: "About",
  description: LEAD,
  alternates: { canonical: "/about/" },
  openGraph: {
    title: `About — ${SITE_NAME}`,
    description: LEAD,
    url: "/about/",
    siteName: SITE_NAME,
    type: "profile",
    images: [ogImage("site", SITE_NAME)],
  },
};

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="border-t border-rule pt-3 font-display text-[clamp(30px,6vw,44px)] leading-none text-ink">
      {children}
    </h2>
  );
}

export default function AboutPage() {
  const { axis, lanes, items, defaultSelected, blockparty } = loadAbout();
  // Takes over the walkthrough's frame once `npm run cad -- blockparty` has rendered it.
  const blockpartyCad = cadPublic("blockparty");
  if (blockpartyCad) {
    const labels = new Set(blockpartyCad.chapters.map((c) => c.label));
    const missing = blockparty.mechanisms.filter((m) => m.cadChapter && !labels.has(m.cadChapter));
    if (missing.length) {
      throw new Error(
        `content/about/blockparty.ts: cadChapter must be one of ${[...labels].join(", ")}; got ${missing.map((m) => `"${m.cadChapter}"`).join(", ")}`
      );
    }
  }
  const built = new Date();
  // YYYY-MM-DD in Jeremy's time zone, stamped at build.
  const buildDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(built);
  const laneName = new Map(lanes.map((l) => [l.id, l.name]));
  const email = CONTACT.email.trim();
  const contactLinks = [
    { label: "Resume", href: "/resume/" },
    { label: "LinkedIn", href: safeExternalUrl(CONTACT.linkedin) },
    { label: "GitHub", href: safeExternalUrl(CONTACT.github) },
  ].filter((l): l is { label: string; href: string } => !!l.href);

  return (
    <div data-page-width="wide" className="px-4 sm:px-8 pt-10 pb-16 sm:pt-14 sm:pb-20 text-[17px] leading-[1.5] text-ink">
      <div className="mx-auto max-w-[1120px]">
        {/* 2. Intro */}
        <section aria-labelledby="about-title" className="grid gap-8 md:grid-cols-[minmax(0,1fr)_300px] md:gap-14 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="max-w-[640px]">
            <h1 id="about-title" className="font-display text-[clamp(48px,11vw,84px)] leading-[0.95] text-ink">
              About
            </h1>
            <p className="mt-6 text-[20px] sm:text-[22px] leading-snug text-ink">{LEAD}</p>
            <p className="mt-4 text-ink">{INTRO}</p>
          </div>
          <div className="w-full max-w-[240px] sm:max-w-[300px] md:max-w-none">
            <Headshot />
          </div>
        </section>

        {/* 3. Timeline */}
        <section aria-labelledby="timeline" className="mt-18">
          <SectionHeading id="timeline">Timeline</SectionHeading>
          <div className="mt-6">
            <Timeline
              axis={axis}
              lanes={lanes}
              items={items}
              defaultSelected={defaultSelected}
              buildNow={fractionalMonth(built)}
            />
          </div>
          <details className="mt-6">
            <summary className="-my-[5px] cursor-pointer py-[5px] font-label text-sm font-semibold text-ink-2">
              The timeline as a list
            </summary>
            <ul className="mt-6 flex flex-col gap-5">
              {items.map((it) => (
                <li key={it.id} className="border-t border-hairline pt-3">
                  <p className="font-label text-[13px] font-bold text-ink-2">
                    {laneName.get(it.lane)} · <span className="tabular-nums">{it.dates}</span>
                  </p>
                  <p className="font-display text-xl text-ink">{it.title}</p>
                  <p className="mt-1">{it.description}</p>
                  {it.quote && (
                    <p className="mt-2 italic">
                      {it.quote.text} <span className="not-italic text-ink-2">({it.quote.by})</span>
                    </p>
                  )}
                  {it.links?.map((l) => (
                    <p key={l.href} className="mt-1">
                      <TimelineLinkAnchor href={l.href} text={l.text} />
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          </details>
        </section>

        {/* 4. Design walkthrough */}
        <section aria-labelledby="walkthrough" className="mt-18">
          <SectionHeading id="walkthrough">Design walkthrough</SectionHeading>
          <p className="mt-4 max-w-[720px] text-ink">{blockparty.intro}</p>
          <div className="mt-6">
            <DesignWalkthrough
              mechanisms={blockparty.mechanisms}
              teamLine={blockparty.teamLine}
              imageSizes={blockparty.imageSizes}
              cad={blockpartyCad}
            />
          </div>
          <details className="mt-6">
            <summary className="-my-[5px] cursor-pointer py-[5px] font-label text-sm font-semibold text-ink-2">
              All four mechanisms as a list
            </summary>
            <ol className="mt-6 grid gap-6 sm:grid-cols-2">
              {blockparty.mechanisms.map((m, i) => (
                <li key={m.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.image}
                    alt={m.alt}
                    width={blockparty.imageSizes[m.image]?.width}
                    height={blockparty.imageSizes[m.image]?.height}
                    loading="lazy"
                    className="w-full h-auto border border-rule bg-panel"
                  />
                  <p className="mt-2 flex items-center gap-2 font-label text-[13px] font-bold text-ink-2">
                    <Balloon n={i + 1} filled /> {m.name}
                  </p>
                  <p className="font-display text-lg text-ink">{m.title}</p>
                  <p className="mt-1">{m.text}</p>
                  {m.myPart && (
                    <p className="mt-1">
                      <span className="font-semibold">My part:</span> {m.myPart}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </section>

        {/* 5. Lately and How I work */}
        <div className="mt-18 grid gap-14 md:grid-cols-2 md:gap-12">
          <section aria-labelledby="lately">
            <SectionHeading id="lately">Lately</SectionHeading>
            <ul className="mt-5 flex flex-col gap-3">
              {LATELY.map((l) => (
                <li key={l.lead}>
                  <span className="font-bold">{l.lead}</span> {l.text}
                  {l.link && (
                    <>
                      {" "}
                      <TimelineLinkAnchor href={l.link.href} text={l.link.text} />
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="how-i-work">
            <SectionHeading id="how-i-work">How I work</SectionHeading>
            <ol className="mt-5 flex flex-col gap-3">
              {HOW_I_WORK.map((line, i) => (
                <li key={line} className="grid grid-cols-[2rem_1fr] items-baseline">
                  <span aria-hidden="true" className="font-label text-[15px] font-bold tabular-nums text-ink-2">
                    {i + 1}.
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* 6. Outside work */}
        <section aria-labelledby="outside-work" className="mt-18">
          <SectionHeading id="outside-work">Outside work</SectionHeading>
          {/* A photo from a lesson goes beside this once there is one. */}
          <p className="mt-5 max-w-[640px]">{OUTSIDE_WORK}</p>
        </section>

        {/* 7. Contact */}
        <section aria-labelledby="contact" className="mt-18">
          <SectionHeading id="contact">Contact</SectionHeading>
          {email && (
            <p className="mt-5 text-[20px] leading-snug">
              Email is the fastest way to reach me:{" "}
              <a href={`mailto:${email}`} className="font-semibold text-link underline underline-offset-[3px] [overflow-wrap:anywhere]">
                {email}
              </a>
            </p>
          )}
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-label text-[16px] font-semibold">
            {contactLinks.map((l) => (
              <li key={l.label}>
                {l.href.startsWith("/") ? (
                  <Link href={l.href} className="-my-[5px] inline-block py-[5px] text-link underline-offset-[3px] hover:underline">
                    {l.label}
                  </Link>
                ) : (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="-my-[5px] inline-block py-[5px] text-link underline-offset-[3px] hover:underline">
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* 8. Title block */}
        <div className="mt-18">
          <TitleBlock title="Jeremy Kwok, About" drawn="J. Kwok" rev="C" date={buildDate} sheet="1 of 1" />
        </div>
      </div>
    </div>
  );
}
