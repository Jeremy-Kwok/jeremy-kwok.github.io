import fs from "node:fs";
import path from "node:path";
import { loadProjects } from "../lib/content";
import { loadAbout } from "../lib/aboutContent";
import { cadPublic, loadCadEntries } from "../lib/cad/content";
import { timelineProblems } from "../lib/cad/phases";
import { RESUME_PATH } from "../lib/site";

// Adapted from Enport's scripts/validate-projects.ts. Runs as `prebuild` for
// a readable error before Next starts; `next build` would fail on the same
// content anyway, because every page loads projects through lib/content.

let failed = false;
try {
  const projects = loadProjects();
  console.log(`All ${projects.length} project JSON files are valid.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  failed = true;
}
try {
  const about = loadAbout();
  console.log(`About page data is valid: ${about.items.length} timeline items, ${about.blockparty.mechanisms.length} mechanisms.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  failed = true;
}
try {
  const entries = loadCadEntries();
  const site = entries.filter((e) => !e.lab);
  for (const e of entries) {
    for (const w of timelineProblems(e.project).warnings) console.warn(`Warning: content/cad/${e.lab ? "lab/" : ""}${e.project.slug}: ${w}`);
  }
  for (const e of site.filter((s) => !s.meta)) {
    console.log(`CAD showcase "${e.project.slug}" isn't rendered yet, so it stays hidden (npm run cad -- ${e.project.slug}).`);
  }
  console.log(`CAD data is valid: ${site.length} showcase${site.length === 1 ? "" : "s"}, ${site.filter((s) => s.meta).length} rendered.`);
  // Walkthrough rows that play a CAD chapter must name one that exists.
  const blockparty = cadPublic("blockparty");
  if (blockparty) {
    const labels = new Set(blockparty.chapters.map((c) => c.label));
    for (const m of loadAbout().blockparty.mechanisms) {
      if (m.cadChapter && !labels.has(m.cadChapter)) {
        console.error(`content/about/blockparty.ts: mechanism "${m.id}" plays CAD chapter "${m.cadChapter}", which doesn't exist (have: ${[...labels].join(", ")})`);
        failed = true;
      }
    }
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  failed = true;
}
if (failed) process.exit(1);

if (!fs.existsSync(path.join(process.cwd(), "public", RESUME_PATH))) {
  console.warn(`Warning: public${RESUME_PATH} is missing; the resume links will 404 until it is added.`);
}
