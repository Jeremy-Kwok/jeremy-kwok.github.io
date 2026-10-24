import fs from "node:fs";
import path from "node:path";

// Fails the build if the repo (or, with an argument, a build output folder)
// contains anything that must never be public: env files, credential
// patterns, the Enport database host, internal repo links, or retired
// numbers. Names that are themselves sensitive (customers, sites) go in a
// gitignored .denylist.local, one per line, so the list is never committed.
//
// Usage: tsx scripts/check-public-safety.ts [dir]   (default: repo root)

const root = process.cwd();
const target = path.resolve(root, process.argv[2] ?? ".");
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out"]);
const SELF = path.join(root, "scripts", "check-public-safety.ts");
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".css", ".html",
  ".txt", ".yml", ".yaml", ".svg", ".xml", ".toml", ".rsc",
]);

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { name: "OpenAI-style secret key", pattern: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "JWT (e.g. a Supabase key)", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },
  { name: "GitHub token", pattern: /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Resend API key", pattern: /\bre_[A-Za-z0-9]{20,}/ },
  { name: "secret env var name", pattern: /SERVICE_ROLE|SUPABASE_[A-Z_]*KEY|RESEND_API_KEY|ANTHROPIC_API_KEY/ },
  { name: "Supabase host (Enport storage/database)", pattern: /supabase\.co\b/i },
  { name: "Mujin repository link", pattern: /(github|gitlab|bitbucket)\.[a-z.]+\/mujin|mujin[a-z0-9.-]*\/[a-z0-9_.-]+\.git\b|git\.mujin/i },
  { name: "retired AFM metric (use 0.813 Dice / 0.723 IoU)", pattern: /0\.889/ },
];

function loadDenylist(): string[] {
  const file = path.join(root, ".denylist.local");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Build outputs are skipped only when scanning the repo, not when one
      // is the explicit target.
      if (dir === root && SKIP_DIRS.has(entry.name)) continue;
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
}

const files: string[] = [];
walk(target, files);
const denylist = loadDenylist();
const problems: string[] = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const base = path.basename(file);
  if (base.startsWith(".env")) {
    problems.push(`${rel}: env files are not allowed in this repo`);
    continue;
  }
  if (file === SELF || base === ".denylist.local" || base === "package-lock.json") continue;
  if (!TEXT_EXT.has(path.extname(file).toLowerCase()) && base !== ".gitignore") continue;

  const lines = fs.readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) problems.push(`${rel}:${i + 1}: ${rule.name}`);
    }
    const lower = line.toLowerCase();
    for (const term of denylist) {
      if (lower.includes(term.toLowerCase())) problems.push(`${rel}:${i + 1}: denylisted name`);
    }
  });
}

if (problems.length > 0) {
  console.error(`Public-safety check failed (${problems.length}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(
  `Public-safety check passed: ${files.length} files under ${path.relative(root, target) || "."}` +
    (denylist.length ? `, ${denylist.length} denylisted names` : ", no .denylist.local")
);
