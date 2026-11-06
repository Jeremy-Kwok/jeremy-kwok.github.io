# jeremy-site

Personal portfolio. A static Next.js site that renders engineering projects in
Enport's claims → evidence → metrics → outcome format.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # validates content, scans for secrets, exports to out/
```

`out/` is plain static files. Any static host works.

## Content

- One file per project in `content/projects/<slug>.json`. The filename must
  equal the slug.
- The schema is `lib/schema.ts` (Zod, strict). `next build` fails on any invalid
  file: unknown keys, a missing `outcome`, an `evidenceRefs` id with no matching
  evidence, or a `/evidence/...` path whose file is missing from `public/`.
- Evidence files live in `public/evidence/<slug>/`. An evidence item with no
  `url` renders as "Not public", for artifacts you can describe but not release.
- `order` sets the homepage card order.

## Where to change things

| What | Where |
|---|---|
| Domain (canonical URLs, Open Graph) | `SITE_URL` in `lib/site.ts` |
| Intro, target roles, contact links | `lib/site.ts` |
| Resume | `public/Jeremy-Kwok-Resume.pdf` (`RESUME_PATH` in `lib/site.ts`) |
| Enport story | `app/enport/page.tsx` |
| About page copy (intro, Lately, How I work, Outside work) | `app/about/page.tsx` |
| About timeline (lanes, items, axis) | `content/about/timeline.ts` (checked by `lib/aboutContent.ts`) |
| About design walkthrough | `content/about/blockparty.ts`, images in `public/about/` |
| Colors, fonts, corner radius | Theme tokens in `app/globals.css`; Archivo is loaded in `app/layout.tsx` |
| CAD showcases (video + Explore in 3D) | Settings in `content/cad/<slug>.ts`, renders in `public/cad/<slug>/` (see below) |

## CAD showcases

A STEP file goes in; a looping video, a poster and a 3D model come out. The page plays the video, and
"Explore in 3D" opens the real model on the same frame (three.js loads only then).

1. Export ONE STEP of the whole assembly (SolidWorks: File > Save As > STEP; Onshape: right-click the
   Assembly tab > Export, with "Export unique parts as individual files" unchecked). Per-part files
   lose where each part sits. Save it as `cad-source/<slug>.step`: that folder is gitignored, so the
   model stays on your machine. The safety check fails the build on source CAD (`.step`, `.sldprt`,
   `.f3d`, …) anywhere else in the repo or in the built site.
2. Add `content/cad/<slug>.ts` (copy `blockparty.ts`) and register it in `content/cad/index.ts`.
3. `npm run cad -- <slug> --list` prints every part's path, for the `groups`, `accent`, `hide` and
   `joints` rules. (A STEP kept elsewhere: add `--step "/path/to/file.step"` once; it's remembered in
   `cad.local.json`, also gitignored.)
4. `npm run cad -- <slug>` renders to `public/cad/<slug>/`. Needs Node 22 (`nvm use`), Chrome and
   ffmpeg (`brew install ffmpeg`). Takes about half a minute for a small model.
5. Preview at `/lab/cad/` under `npm run dev` (that page never ships), then commit `public/cad/<slug>/`.

What a settings file can do (see `content/cad/blockparty.ts` for a full example):

- `groups`: build steps in order, each matched by part name, with an optional subsystem `color`.
  Parts no group names join the step of the part they sit closest to.
- `joints`: revolute or prismatic, with `initial` values for the start pose. `parts` takes name rules
  or `{ match, within, not }`, where `within` is a box around part centers in the STEP's saved pose,
  for parts that share a name (the left and right members of a drawer slide).
- `timeline`: `build`, `hold`, `move` (joint targets, `ease`), `explode`, `unbuild`. A `label` starts
  a chapter (a button in the 3D view); `focus` lists the groups to keep bright while the rest dims.
- On the About page, each walkthrough mechanism names the chapter it plays with `cadChapter` in
  `content/about/blockparty.ts`; the build fails if that chapter doesn't exist.

Changing a settings file without re-rendering fails the build, so the video and the 3D model can't
drift apart. Set `interactive: false` for work under NDA: the video ships, the model file doesn't.
Test models live in `content/cad/lab/` and render to `public/cad/lab/` (gitignored).

## Public-safety check

`npm run check:safety` runs before every build, and again on `out/` after it.
It fails on env files, credential patterns, Enport's storage host, internal repo
links, and retired metrics. Customer and site names that must never appear go in
`.denylist.local` (one per line, gitignored), so the list itself is never
committed.

## Provenance

Schema, page components, styles and the share-card design are adapted from the
Enport repo. Project text comes from the published Enport pages, with
corrections.
