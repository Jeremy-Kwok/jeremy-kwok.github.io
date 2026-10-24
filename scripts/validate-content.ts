import fs from "node:fs";
import path from "node:path";
import { loadProjects } from "../lib/content";
import { RESUME_PATH } from "../lib/site";

// Adapted from Enport's scripts/validate-projects.ts. Runs as `prebuild` for
// a readable error before Next starts; `next build` would fail on the same
// content anyway, because every page loads projects through lib/content.

try {
  const projects = loadProjects();
  console.log(`All ${projects.length} project JSON files are valid.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (!fs.existsSync(path.join(process.cwd(), "public", RESUME_PATH))) {
  console.warn(`Warning: public${RESUME_PATH} is missing; the resume links will 404 until it is added.`);
}
