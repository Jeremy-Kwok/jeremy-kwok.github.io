import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { build as esbuild } from 'esbuild';
import puppeteer from 'puppeteer-core';
import { PIPELINE_VERSION, VIDEO, entryLocation, parseCadProjects, renderHash } from '../../lib/cad/content';
import { duration, posterTime, spans, timelineProblems } from '../../lib/cad/phases';
import type { CadMeta } from '../../lib/cad/schema';
import { stepToGlb } from './stepToGlb';

// `npm run cad -- <slug>`: one STEP file in, a showcase out.
//
//   STEP --(OpenCascade)--> model.glb --(headless Chrome, the site's own 3D
//   stage)--> frames --(ffmpeg)--> loop.mp4 + poster.jpg, plus meta.json.
//
// Runs on your machine, never in CI: it needs the STEP (which stays out of
// this repo), Chrome and ffmpeg. Commit what it writes to public/cad/<slug>/.

const USAGE = `Usage: npm run cad -- <slug> [--step <file.step>] [--list] [--chrome <path>]

  <slug>           a showcase in content/cad/ or content/cad/lab/
  --step <file>    the STEP export to render; remembered in cad.local.json (gitignored)
  --list           convert only, and print every part's path (for writing groups and joints)
  --chrome <path>  Chrome or Chromium to render with (or set CHROME_PATH)
  --still <s>      render one frame at <s> seconds to cad-still.png (nothing else is written)
  --view <az,el[,zoom]>  with --still: look from this azimuth/elevation (degrees) instead of the timeline camera`;

/** Gitignored drop folder for source CAD: cad-source/<slug>.step needs no --step. */
const CAD_SOURCE_DIR = 'cad-source';

const root = process.cwd();
const localFile = path.join(root, 'cad.local.json');

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const out: { slug?: string; step?: string; list: boolean; chrome?: string; still?: number; view?: number[] } = { list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--step') out.step = argv[++i];
    else if (a === '--chrome') out.chrome = argv[++i];
    else if (a === '--list') out.list = true;
    else if (a === '--still') out.still = Number(argv[++i]);
    else if (a === '--view') out.view = argv[++i].split(',').map(Number);
    else if (a === '--help' || a === '-h') fail(USAGE);
    else if (a.startsWith('--')) fail(`Unknown option ${a}\n\n${USAGE}`);
    else if (!out.slug) out.slug = a;
    else fail(`Unexpected argument ${a}\n\n${USAGE}`);
  }
  return out;
}

function expandHome(p: string): string {
  return p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : p;
}

function readLocal(): Record<string, string> {
  if (!fs.existsSync(localFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(localFile, 'utf-8'));
  } catch {
    fail('cad.local.json is not valid JSON. Fix or delete it.');
  }
}

function findChrome(flag?: string): string {
  const candidates = [
    flag,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((p): p is string => Boolean(p));
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) fail('No Chrome found to render with. Install Google Chrome, or pass --chrome <path> (or set CHROME_PATH).');
  return found;
}

/** ffmpeg on PATH, or Homebrew's usual locations (a GUI-launched shell often lacks /opt/homebrew/bin). */
function findFfmpeg(): string {
  for (const candidate of [process.env.FFMPEG_PATH, 'ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) {
    if (!candidate) continue;
    const r = spawnSync(candidate, ['-hide_banner', '-version'], { encoding: 'utf-8' });
    if (!r.error && r.status === 0) return candidate;
  }
  fail('ffmpeg is needed to encode the video. Install it with: brew install ffmpeg (or set FFMPEG_PATH)');
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) fail(USAGE);

  let projects;
  try {
    projects = parseCadProjects();
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  const found = projects.find((p) => p.project.slug === args.slug);
  if (!found) fail(`No showcase "${args.slug}". Available: ${projects.map((p) => p.project.slug).join(', ')}`);
  const { project, lab } = found;
  for (const w of timelineProblems(project).warnings) console.warn(`Warning: ${w}`);

  // The STEP: --step, else remembered from last time, else cad-source/<slug>.step
  // (a gitignored folder in this repo that never reaches git or the site).
  const local = readLocal();
  const inSourceFolder = ['step', 'stp', 'STEP', 'STP']
    .map((ext) => path.join(root, CAD_SOURCE_DIR, `${project.slug}.${ext}`))
    .find((p) => fs.existsSync(p));
  const chosen = args.step ?? local[project.slug] ?? inSourceFolder;
  if (!chosen) {
    fail(
      `Where is the STEP for "${project.slug}"? Either:\n` +
        `  put it at ${CAD_SOURCE_DIR}/${project.slug}.step and run: npm run cad -- ${project.slug}\n` +
        `  or pass it once (remembered after): npm run cad -- ${project.slug} --step "/path/to/file.step"`
    );
  }
  const stepPath = path.resolve(expandHome(chosen));
  if (fs.existsSync(stepPath) && fs.statSync(stepPath).isDirectory()) {
    fail(
      `${stepPath} is a folder. The animation needs ONE STEP file of the whole assembly: per-part files lose\n` +
        `where each part sits on the robot. In Onshape, export the Assembly tab with "Export unique parts as\n` +
        `individual files" unchecked; in SolidWorks, File > Save As > STEP.`
    );
  }
  if (!fs.existsSync(stepPath)) fail(`STEP file not found: ${stepPath}`);
  if (!/\.(step|stp)$/i.test(stepPath)) fail(`Expected a .step or .stp file, got ${path.basename(stepPath)}`);
  if (args.step && local[project.slug] !== stepPath) {
    fs.writeFileSync(localFile, `${JSON.stringify({ ...local, [project.slug]: stepPath }, null, 2)}\n`);
    console.log(`Remembered the STEP for ${project.slug} in cad.local.json.`);
  }

  const stepBytes = fs.readFileSync(stepPath);
  const sourceSha256 = crypto.createHash('sha256').update(stepBytes).digest('hex');
  console.log(`Converting ${path.basename(stepPath)} (${mb(stepBytes.length)})…`);
  let t0 = performance.now();
  const model = await stepToGlb(new Uint8Array(stepBytes), project);
  console.log(
    `  ${model.parts} parts, ${model.triangles.toLocaleString()} triangles, model ${mb(model.glb.byteLength)} (${((performance.now() - t0) / 1000).toFixed(1)}s)`
  );

  if (args.list) {
    console.log(`\nPart paths (match these in groups, accent, hide and joints):`);
    for (const p of model.partPaths) console.log(`  ${p}`);
    return;
  }

  const ffmpegBin = findFfmpeg();
  const chrome = findChrome(args.chrome);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `cad-${project.slug}-`));
  const onInterrupt = () => {
    console.error('\nInterrupted; cleaning up.');
    chrome$.browser?.process()?.kill('SIGKILL');
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(130);
  };
  process.once('SIGINT', onInterrupt);
  const server = http.createServer();
  // A holder, because the render closure below replaces the browser on a retry.
  const chrome$: { browser: Awaited<ReturnType<typeof puppeteer.launch>> | null } = { browser: null };

  try {
    fs.writeFileSync(path.join(tmp, 'model.glb'), model.glb);

    const bundle = await esbuild({
      entryPoints: [path.join(root, 'scripts/cad/render-page.ts')],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      tsconfig: path.join(root, 'tsconfig.json'),
      logLevel: 'error',
    });
    const js = bundle.outputFiles[0].text;
    // A --view still looks from a fixed angle; it writes nothing else, so the render hash is untouched.
    const pageProject =
      args.still !== undefined && args.view
        ? { ...project, camera: { azimuth: args.view[0], elevation: args.view[1], sway: 0, zoom: args.view[2] ?? project.camera.zoom } }
        : project;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#f1f2f1;overflow:hidden}canvas{display:block;width:${VIDEO.width}px;height:${VIDEO.height}px}</style></head>
<body><canvas id="stage"></canvas><script>window.__CAD_PROJECT__=${JSON.stringify(pageProject).replace(/</g, '\\u003c')};window.__CAD_SIZE__=${JSON.stringify({ width: VIDEO.width, height: VIDEO.height })};</script><script type="module" src="/render.js"></script></body></html>`;

    server.on('request', (req, res) => {
      const url = (req.url ?? '/').split('?')[0];
      if (url === '/') res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
      else if (url === '/render.js') res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(js);
      else if (url === '/model.glb') res.writeHead(200, { 'content-type': 'model/gltf-binary' }).end(model.glb);
      else if (url === '/favicon.ico') res.writeHead(204).end();
      else res.writeHead(404).end();
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = (server.address() as { port: number }).port;

    const seconds = duration(project.timeline);
    const videoFile = path.join(tmp, 'loop.mp4');
    const posterFile = path.join(tmp, 'poster.jpg');

    let stepTimes: CadMeta['steps'] = [];

    // One full pass: launch Chrome, draw every frame into ffmpeg, then the poster.
    const renderOnce = async () => {
      const browser = await puppeteer.launch({
        executablePath: chrome,
        headless: true,
        // We clean up on Ctrl-C ourselves (below); puppeteer's own handler exits before `finally` runs.
        handleSIGINT: false,
        // CAD_DEBUG=1 prints Chrome's own log, for when a render dies.
        dumpio: process.env.CAD_DEBUG === '1',
        args: [
          '--force-color-profile=srgb',
          '--hide-scrollbars',
          '--no-first-run',
          '--no-default-browser-check',
          '--ignore-gpu-blocklist',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
        ],
        defaultViewport: { width: VIDEO.width, height: VIDEO.height, deviceScaleFactor: VIDEO.supersample },
      });
      chrome$.browser = browser;
      const page = await browser.newPage();
      page.on('pageerror', (err) => console.error(`  page error: ${err instanceof Error ? err.message : String(err)}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.error(`  page console: ${msg.text()}`);
      });
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__cad && (window.__cad.ready || window.__cad.error), { timeout: 180_000 });
      const status = await page.evaluate(() => ({ ready: window.__cad!.ready, error: window.__cad!.error, steps: window.__cad!.steps ?? [] }));
      if (!status.ready) throw new Error(`The renderer failed in Chrome:\n${status.error}`);
      // Build steps arrive as fractions of the first build step; the page wants video seconds.
      const build = spans(project.timeline).find((s) => s.step.kind === 'build');
      stepTimes = build
        ? status.steps.map((st, k, all) => ({
            label: st.label,
            start: Number((build.start + st.start * build.step.seconds).toFixed(3)),
            end: Number((build.start + (k + 1 < all.length ? all[k + 1].start : 1) * build.step.seconds).toFixed(3)),
          }))
        : [];

      const shoot = async (t: number) => {
        const dataUrl = await page.evaluate((s) => window.__cad!.frame!(s), t);
        return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      };

      if (args.still !== undefined) {
        const stillFile = path.join(root, 'cad-still.png');
        fs.writeFileSync(stillFile, await shoot(args.still));
        console.log(`Wrote ${path.relative(root, stillFile)} (t = ${args.still}s)`);
        await browser.close();
        chrome$.browser = null;
        return;
      }

      // Video. The frame at t = duration equals t = 0 on a looping timeline, so it's left out.
      const frames = Math.round(seconds * VIDEO.fps);
      const scale = `scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos:out_color_matrix=bt709:out_range=tv`;
      const ffmpeg = spawn(
        ffmpegBin,
        [
          '-y', '-hide_banner', '-loglevel', 'error',
          '-f', 'image2pipe', '-framerate', String(VIDEO.fps), '-c:v', 'png', '-i', '-',
          '-vf', `${scale},format=yuv420p`,
          '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high',
          '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
          '-movflags', '+faststart', '-an', videoFile,
        ],
        { stdio: ['pipe', 'inherit', 'inherit'] }
      );
      const ffmpegDone = once(ffmpeg, 'close');
      t0 = performance.now();
      try {
        for (let i = 0; i < frames; i++) {
          const png = await shoot(i / VIDEO.fps);
          if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
          if (i % 15 === 0 || i === frames - 1) process.stdout.write(`\r  Rendering frame ${i + 1}/${frames}`);
        }
      } catch (err) {
        // Don't leave this pass's encoder waiting for frames: it would keep the command from exiting.
        ffmpeg.stdin.destroy();
        ffmpeg.kill('SIGKILL');
        throw err;
      }
      ffmpeg.stdin.end();
      const [code] = (await ffmpegDone) as [number];
      if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
      console.log(` (${((performance.now() - t0) / 1000).toFixed(1)}s)`);

      // Poster: the assembled model, for reduced-motion visitors and before playback starts.
      const posterPng = await shoot(posterTime(project));
      const poster = spawnSync(
        ffmpegBin,
        ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'png_pipe', '-i', '-', '-vf', `scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos`, '-q:v', '3', posterFile],
        { input: posterPng }
      );
      if (poster.status !== 0) throw new Error(`ffmpeg could not write the poster: ${poster.stderr?.toString()}`);
      await browser.close();
      chrome$.browser = null;
    };

    // Headless Chrome occasionally loses its GPU process on a cold first launch;
    // one retry gets past that. A bug in the page itself fails the same way twice.
    try {
      await renderOnce();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Only Chrome itself dropping out is worth a retry; anything else (a bug in
      // the page, ffmpeg missing a codec) would fail the same way again.
      if (!/target closed|session closed|protocol error|browser has disconnected|navigation failed/i.test(message)) throw err;
      console.warn(`\n  Chrome dropped out (${message.split('\n')[0]}); retrying once…`);
      await chrome$.browser?.close().catch(() => {});
      chrome$.browser = null;
      await renderOnce();
    }
    if (args.still !== undefined) return;

    const meta: CadMeta = {
      pipeline: PIPELINE_VERSION,
      renderHash: renderHash(project),
      sourceSha256,
      generated: new Date().toISOString(),
      video: { file: 'loop.mp4', width: VIDEO.width, height: VIDEO.height, fps: VIDEO.fps, seconds, bytes: fs.statSync(videoFile).size },
      poster: { file: 'poster.jpg', bytes: fs.statSync(posterFile).size },
      steps: stepTimes,
      model: project.interactive
        ? { file: 'model.glb', bytes: model.glb.byteLength, parts: model.parts, triangles: model.triangles }
        : null,
    };

    // Swap the new render in only once everything succeeded: build it beside the
    // old one, then rename, so an interrupted run never leaves a half-written folder.
    const { dir, urlBase } = entryLocation(project, lab);
    const next = `${dir}.next-${process.pid}`;
    const prev = `${dir}.prev-${process.pid}`;
    fs.rmSync(next, { recursive: true, force: true });
    fs.mkdirSync(next, { recursive: true });
    fs.copyFileSync(videoFile, path.join(next, 'loop.mp4'));
    fs.copyFileSync(posterFile, path.join(next, 'poster.jpg'));
    if (project.interactive) fs.copyFileSync(path.join(tmp, 'model.glb'), path.join(next, 'model.glb'));
    fs.writeFileSync(path.join(next, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
    if (fs.existsSync(dir)) fs.renameSync(dir, prev);
    fs.renameSync(next, dir);
    fs.rmSync(prev, { recursive: true, force: true });

    console.log(`\nWrote public${urlBase}`);
    console.log(`  loop.mp4    ${mb(meta.video.bytes)}  (${seconds.toFixed(1)}s at ${VIDEO.width}x${VIDEO.height})`);
    console.log(`  poster.jpg  ${mb(meta.poster.bytes)}`);
    if (meta.model) console.log(`  model.glb   ${mb(meta.model.bytes)}  (${meta.model.parts} parts)`);
    else console.log(`  model.glb   not published (interactive: false)`);
    if (meta.video.bytes > 4 * 1024 * 1024) console.warn('Warning: the video is over 4 MB; consider a shorter timeline.');
    if (meta.model && meta.model.bytes > 12 * 1024 * 1024) console.warn('Warning: the model is over 12 MB; hide small parts or the field to slim it.');
    console.log(lab ? `\nPreview: npm run dev, then open /lab/cad/` : `\nPreview: npm run dev. Commit public${urlBase} when it looks right.`);
  } finally {
    process.removeListener('SIGINT', onInterrupt);
    await chrome$.browser?.close().catch(() => {});
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => fail(err instanceof Error ? (err.stack ?? err.message) : String(err)));
