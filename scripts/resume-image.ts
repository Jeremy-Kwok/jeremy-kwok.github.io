import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { RESUME_PATH } from '../lib/site';
import { RESUME_IMAGE_PATH, RESUME_WIDTHS, type ResumeImage } from '../lib/resume';

// Renders page one of the resume PDF to images for /resume/, so a phone shows
// the resume right away instead of handing off to a PDF viewer (Android
// Chrome has none; iOS shows one page). pdf.js draws it in headless Chrome;
// sharp writes display-size PNG copies. The text comes from the same PDF, for
// screen readers, search and copy-paste. Run as part of `npm run images`; the
// build fails if the PDF changes without a re-run.

const root = process.cwd();
const pdfFile = path.join(root, 'public', RESUME_PATH);
const pdfjsDir = path.join(root, 'node_modules', 'pdfjs-dist');
const RENDER_WIDTH = RESUME_WIDTHS[RESUME_WIDTHS.length - 1];

function findChrome(): string {
  const found = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p): p is string => !!p && fs.existsSync(p));
  if (!found) throw new Error('No Chrome found to render the resume. Install Google Chrome or set CHROME_PATH.');
  return found;
}

async function extractText(pdf: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
  let text = '';
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    for (const item of content.items) if ('str' in item) text += item.str + (item.hasEOL ? '\n' : '');
    text += '\n';
  }
  // pdf.js keeps the PDF's own spacing; tidy runs of spaces and blank lines.
  return text.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * The part of a text run that sits inside a link's box. pdf.js often hands back
 * a whole line as one run, so a link on a few words in the middle of it takes
 * the share of the characters under the box, widened or narrowed to the
 * nearest word break.
 */
export function wordsInBox(str: string, x: number, width: number, left: number, right: number): string {
  const from = Math.max(x, left);
  const to = Math.min(x + width, right);
  if (width <= 0 || to <= from) return '';
  if ((to - from) / width >= 0.8) return str.trim();
  const breaks = [0, str.length];
  for (let i = 1; i < str.length; i++) if (str[i] === ' ' || str[i - 1] === ' ') breaks.push(i);
  const snap = (at: number) => breaks.reduce((best, b) => (Math.abs(b - at) < Math.abs(best - at) ? b : best));
  return str.slice(snap(((from - x) / width) * str.length), snap(((to - x) / width) * str.length)).trim();
}

// Page one's web links, with the words under each one. /resume/ lays them over
// the image, which would otherwise only open the PDF as a whole.
export async function extractLinks(pdf: Buffer): Promise<ResumeImage['links']> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const words = (await page.getTextContent()).items.filter((it) => 'str' in it && it.str.trim() !== '');
  const round = (n: number) => Math.round(n * 1e5) / 1e5;
  const links: ResumeImage['links'] = [];
  for (const a of await page.getAnnotations()) {
    if (a.subtype !== 'Link' || typeof a.url !== 'string' || !/^(https?:|mailto:)/i.test(a.url)) continue;
    const [rx1, ry1, rx2, ry2] = a.rect as number[];
    // Runs on the link's line, cut to the words under its box.
    const text = words
      .map((it) => {
        if (!('str' in it)) return '';
        const base = it.transform[5];
        if (base < ry1 - 2 || base > ry2 + 2) return '';
        return wordsInBox(it.str, it.transform[4], it.width, rx1, rx2);
      })
      .filter((t) => t !== '')
      .join(' ');
    const [x1, y1] = viewport.convertToViewportPoint(rx1, ry1);
    const [x2, y2] = viewport.convertToViewportPoint(rx2, ry2);
    links.push({
      url: a.url,
      text: text || a.url.replace(/^(https?:\/\/|mailto:)/i, '').replace(/\/$/, ''),
      x: round(Math.min(x1, x2) / viewport.width),
      y: round(Math.min(y1, y2) / viewport.height),
      w: round(Math.abs(x2 - x1) / viewport.width),
      h: round(Math.abs(y2 - y1) / viewport.height),
    });
  }
  return links;
}

const PAGE = `<!doctype html><html><body style="margin:0;background:#fff"><script type="module">
import * as pdfjs from '/pdfjs/build/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/build/pdf.worker.mjs';
try {
  const pdf = await pdfjs.getDocument({ url: '/resume.pdf', standardFontDataUrl: '/pdfjs/standard_fonts/', cMapUrl: '/pdfjs/cmaps/', cMapPacked: true }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: ${RENDER_WIDTH} / page.getViewport({ scale: 1 }).width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  window.__resume = { png: canvas.toDataURL('image/png'), pages: pdf.numPages };
} catch (err) {
  window.__resume = { error: String(err && err.stack || err) };
}
</script></body></html>`;

export async function renderResume(): Promise<void> {
  if (!fs.existsSync(pdfFile)) {
    console.warn(`No resume at public${RESUME_PATH}; skipping the resume image.`);
    return;
  }
  const pdf = fs.readFileSync(pdfFile);
  const sha256 = crypto.createHash('sha256').update(pdf).digest('hex');
  const manifestFile = path.join(root, RESUME_IMAGE_PATH);
  const previous: ResumeImage | null = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) : null;
  if (previous?.sha256 === sha256 && Array.isArray(previous.links) && previous.variants.every((v) => fs.existsSync(path.join(root, 'public', v.src)))) {
    console.log(`ok   ${RESUME_PATH} (unchanged)`);
    return;
  }

  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (url === '/') return void res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE);
    if (url === '/resume.pdf') return void res.writeHead(200, { 'content-type': 'application/pdf' }).end(pdf);
    if (url.startsWith('/pdfjs/')) {
      const file = path.join(pdfjsDir, url.slice('/pdfjs/'.length));
      if (file.startsWith(pdfjsDir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const type = file.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream';
        return void res.writeHead(200, { 'content-type': type }).end(fs.readFileSync(file));
      }
    }
    res.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => (window as unknown as { __resume?: unknown }).__resume, { timeout: 60_000 });
    const result = await page.evaluate(() => (window as unknown as { __resume: { png?: string; pages?: number; error?: string } }).__resume);
    if (!result.png) throw new Error(`pdf.js couldn't render the resume:\n${result.error}`);
    if ((result.pages ?? 1) > 1) console.warn(`The resume has ${result.pages} pages; /resume/ shows page one (the PDF links have all of them).`);

    const png = Buffer.from(result.png.slice(result.png.indexOf(',') + 1), 'base64');
    const meta = await sharp(png).metadata();
    const outDir = path.join(root, 'public', 'resume');
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    const variants: ResumeImage['variants'] = [];
    // A page of black text on white: a 16-color palette PNG is about half the
    // size of lossy WebP here and keeps every edge crisp.
    for (const w of RESUME_WIDTHS) {
      const src = `/resume/resume-${w}.png`;
      await sharp(png)
        .resize({ width: w })
        .png({ palette: true, colors: 16, compressionLevel: 9, effort: 10 })
        .toFile(path.join(root, 'public', src));
      variants.push({ w, src });
    }
    const manifest: ResumeImage = {
      sha256,
      width: meta.width ?? RENDER_WIDTH,
      height: meta.height ?? Math.round(RENDER_WIDTH * 1.294),
      variants,
      text: await extractText(pdf),
      links: await extractLinks(pdf),
    };
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`made ${RESUME_PATH} -> ${variants.map((v) => `${v.w}w ${Math.round(fs.statSync(path.join(root, 'public', v.src)).size / 1024)}KB`).join(', ')}, ${manifest.links.length} links`);
  } finally {
    await browser.close();
    server.close();
  }
}
