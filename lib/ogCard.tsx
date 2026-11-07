import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { imageManifest } from '@/lib/images';
import { SITE_URL } from '@/lib/site';

// The share card from Enport's app/api/og/[slug]/route.tsx, rendered at build
// time instead of per request: text on the left, the project's picture on the
// right. Satori takes inline styles only, and embeds PNG and JPEG but not WebP,
// so pictures are read from their original files in public/.

export const OG_SIZE = { width: 1200, height: 630 };

// The og:image entry for a card written by app/og/[image]/route.tsx.
// Relative, so it resolves against metadataBase (SITE_URL).
export function ogImage(name: string, alt: string) {
  return { url: `/og/${name}.png`, ...OG_SIZE, alt };
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

// The first sentence when it fits, else the text cut at a word.
function lead(text: string, max: number): string {
  const first = text.match(/^.+?[.!?](?=\s|$)/)?.[0];
  return first && first.length <= max ? first : clip(text, max);
}

const BORDER = 14;
const PANEL = { width: 660, height: OG_SIZE.height - BORDER, pad: 36 };
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

interface Picture {
  src: string;
  width: number;
  height: number;
}

// A public image as a data URI with its size, or null if it can't be embedded
// (a format Satori can't read, or no size on record yet: run npm run images).
function picture(url: string | null | undefined): Picture | null {
  if (!url?.startsWith('/')) return null;
  const mime = MIME[path.extname(url).toLowerCase()];
  const entry = imageManifest()[url];
  const file = path.join(process.cwd(), 'public', url);
  if (!mime || !entry || !fs.existsSync(file)) return null;
  return { src: `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`, width: entry.width, height: entry.height };
}

function OnePicture({ pic }: { pic: Picture }) {
  const boxW = PANEL.width - 2 * PANEL.pad;
  const boxH = PANEL.height - 2 * PANEL.pad;
  const scale = Math.min(boxW / pic.width, boxH / pic.height);
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" src={pic.src} width={Math.round(pic.width * scale)} height={Math.round(pic.height * scale)} style={{ border: '1px solid #d4d4d8' }} />;
}

// Four pictures cropped like the homepage cards.
function PictureGrid({ pics }: { pics: Picture[] }) {
  const gap = 16;
  const w = Math.floor((PANEL.width - 2 * PANEL.pad - gap) / 2);
  const h = Math.round(w / 1.92);
  const rows = [pics.slice(0, 2), pics.slice(2, 4)];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap }}>
          {row.map((pic, j) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={j} alt="" src={pic.src} width={w} height={h} style={{ objectFit: 'cover', border: '1px solid #d4d4d8' }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function renderOgCard({
  title,
  subtitle,
  byline,
  eyebrow,
  images = [],
}: {
  title: string;
  subtitle?: string;
  /** Parts of the line under the text, joined with a dot, or stacked when they won't fit on one line. */
  byline?: string[];
  /** Small line above the title; the site name on project cards. */
  eyebrow?: string;
  /** Public image URLs: one is shown whole, four as a grid. */
  images?: (string | null | undefined)[];
}): ImageResponse {
  const pics = images.map(picture).filter((p): p is Picture => p !== null);
  const shortTitle = clip(title, 80);
  const titleSize = shortTitle.length > 40 ? 46 : shortTitle.length > 20 ? 54 : 68;
  const domain = new URL(SITE_URL).host;
  const parts = (byline ?? []).filter(Boolean);
  const bylineLines = parts.join('  ·  ').length <= 38 ? [parts.join('  ·  ')].filter(Boolean) : parts;

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: 'flex',
          background: '#fafafa',
          borderBottom: `${BORDER}px solid #3b82f6`,
          fontFamily: 'sans-serif',
          color: '#18181b',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 40px 48px 72px',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: -0.5 }}>{eyebrow ?? ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: titleSize, lineHeight: 1.1, letterSpacing: -1.2 }}>{shortTitle}</div>
            {subtitle && (
              <div style={{ display: 'flex', marginTop: 18, fontSize: 23, lineHeight: 1.35, color: '#52525b' }}>
                {lead(subtitle, 170)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 21, color: '#71717a' }}>
            {bylineLines.map((line) => (
              <div key={line} style={{ display: 'flex' }}>{line}</div>
            ))}
            <div style={{ display: 'flex' }}>{domain}</div>
          </div>
        </div>
        {pics.length > 0 && (
          <div
            style={{
              width: PANEL.width,
              height: PANEL.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#eceef0',
            }}
          >
            {pics.length >= 4 ? <PictureGrid pics={pics} /> : <OnePicture pic={pics[0]} />}
          </div>
        )}
      </div>
    ),
    OG_SIZE
  );
}
