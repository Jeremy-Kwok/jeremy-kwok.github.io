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
| Resume | `public/resume.pdf` |
| Enport story | `app/enport/page.tsx` |

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
