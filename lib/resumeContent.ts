import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { RESUME_PATH } from '@/lib/site';
import { RESUME_IMAGE_PATH, type ResumeImage } from '@/lib/resume';

// Loads the rendered resume for /resume/ and checks it still matches the PDF.
// Null when it hasn't been rendered yet (the page then shows the PDF buttons
// alone); throws when the PDF changed since, so a stale image can't ship.

export function loadResumeImage(): ResumeImage | null {
  const root = process.cwd();
  const manifestFile = path.join(root, RESUME_IMAGE_PATH);
  const pdfFile = path.join(root, 'public', RESUME_PATH);
  if (!fs.existsSync(manifestFile) || !fs.existsSync(pdfFile)) return null;
  const image = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as ResumeImage;
  const sha = crypto.createHash('sha256').update(fs.readFileSync(pdfFile)).digest('hex');
  const problems: string[] = [];
  if (sha !== image.sha256) problems.push(`public${RESUME_PATH} changed since its image was made. Run: npm run images`);
  if (!Array.isArray(image.links)) problems.push(`${RESUME_IMAGE_PATH} has no links (made by an older script). Run: npm run images`);
  for (const v of image.variants) {
    if (!fs.existsSync(path.join(root, 'public', v.src))) problems.push(`public${v.src}: missing. Run: npm run images`);
  }
  if (problems.length) throw new Error(`Resume image is out of date:\n  ${problems.join('\n  ')}`);
  return image;
}
