import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadProjects } from '../lib/content';
import { detectFormatKind } from '../lib/evidenceRender';
import { IMAGE_WIDTHS, MANIFEST_PATH, type ImageManifest } from '../lib/images';
import { renderResume } from './resume-image';

// `npm run images`: display-size WebP copies of every project image (and the
// resume, rendered for /resume/: scripts/resume-image.ts), so a
// phone gets a 480px file instead of a 5400px PNG. Writes the copies next to
// each source (in a `_w/` folder) and records sizes and source hashes in
// content/images.json; the build fails if a source changes afterwards
// without a re-run. Sources are never modified, and "open full size" links
// keep pointing at them.

const root = process.cwd();
const publicDir = path.join(root, 'public');

function sourcesInUse(): string[] {
  const urls = new Set<string>();
  for (const p of loadProjects()) {
    if (p.heroImage?.startsWith('/')) urls.add(p.heroImage);
    if (p.cardImage?.startsWith('/')) urls.add(p.cardImage);
    for (const e of p.evidence) if (e.url?.startsWith('/') && detectFormatKind(e) === 'image') urls.add(e.url);
  }
  return [...urls].filter((u) => !/\.(svg|gif)$/i.test(u)).sort();
}

function variantPath(url: string, width: number): string {
  const dir = path.posix.dirname(url);
  const base = path.posix.basename(url).replace(/\.[^.]+$/, '');
  return `${dir}/_w/${base}-${width}.webp`;
}

async function main() {
  const previous: ImageManifest = fs.existsSync(path.join(root, MANIFEST_PATH))
    ? JSON.parse(fs.readFileSync(path.join(root, MANIFEST_PATH), 'utf-8'))
    : {};
  const manifest: ImageManifest = {};
  let made = 0;
  let saved = 0;

  for (const url of sourcesInUse()) {
    const file = path.join(publicDir, url);
    const buf = fs.readFileSync(file);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const meta = await sharp(buf).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    // Every standard width up to the source width, plus the source width itself if it falls between them.
    const widths = IMAGE_WIDTHS.filter((w) => w <= width);
    if (widths.length === 0 || width < IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]) widths.push(width);
    const variants = [...new Set(widths)].sort((a, b) => a - b).map((w) => ({ w, src: variantPath(url, w) }));

    const unchanged =
      previous[url]?.sha256 === sha256 &&
      previous[url].variants.length === variants.length &&
      variants.every((v) => fs.existsSync(path.join(publicDir, v.src)));
    if (!unchanged) {
      for (const v of variants) {
        const out = path.join(publicDir, v.src);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        await sharp(buf).resize({ width: v.w, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(out);
        made++;
      }
    }
    const smallest = fs.statSync(path.join(publicDir, variants[0].src)).size;
    saved += buf.length - smallest;
    manifest[url] = { sha256, width, height, variants };
    const sizes = variants.map((v) => `${v.w}w ${Math.round(fs.statSync(path.join(publicDir, v.src)).size / 1024)}KB`).join(', ');
    console.log(`${unchanged ? 'ok  ' : 'made'} ${url} (${width}×${height}, ${Math.round(buf.length / 1024)}KB) -> ${sizes}`);
  }

  // Drop copies whose source is gone.
  for (const url of Object.keys(previous)) {
    if (manifest[url]) continue;
    for (const v of previous[url].variants) fs.rmSync(path.join(publicDir, v.src), { force: true });
  }

  fs.writeFileSync(path.join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${Object.keys(manifest).length} images, ${made} copies written. Phones now get ~${Math.round(saved / 1024)}KB less in total.`);

  // The resume, shown as an image on /resume/.
  await renderResume();
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
