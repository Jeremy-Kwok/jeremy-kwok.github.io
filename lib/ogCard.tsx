import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_URL } from '@/lib/site';

// The share card from Enport's app/api/og/[slug]/route.tsx, rendered at build
// time instead of per request. Satori takes inline styles only.

export const OG_SIZE = { width: 1200, height: 630 };

// The og:image entry for a card written by app/og/[image]/route.tsx.
// Relative, so it resolves against metadataBase (SITE_URL).
export function ogImage(name: string, alt: string) {
  return { url: `/og/${name}.png`, ...OG_SIZE, alt };
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function renderOgCard({
  title,
  subtitle,
  byline,
}: {
  title: string;
  subtitle?: string;
  byline?: string;
}): ImageResponse {
  const shortTitle = clip(title, 90);
  const titleSize = shortTitle.length > 60 ? 56 : shortTitle.length > 36 ? 64 : 76;
  const domain = new URL(SITE_URL).host;

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 88px 56px',
          background: '#fafafa',
          borderBottom: '14px solid #3b82f6',
          fontFamily: 'sans-serif',
          color: '#18181b',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, color: '#18181b', letterSpacing: -0.5 }}>{SITE_NAME}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: titleSize, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 1024 }}>
            {shortTitle}
          </div>
          {subtitle && (
            <div style={{ display: 'flex', marginTop: 20, fontSize: 28, lineHeight: 1.35, color: '#52525b', maxWidth: 960 }}>
              {clip(subtitle, 140)}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 24,
            color: '#71717a',
          }}
        >
          <div style={{ display: 'flex', maxWidth: 900 }}>{byline ?? ''}</div>
          <div style={{ display: 'flex' }}>{domain}</div>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
