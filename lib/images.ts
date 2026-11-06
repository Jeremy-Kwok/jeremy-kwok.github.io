import manifestJson from '@/content/images.json';

// Display-size copies of project images, made by `npm run images`
// (scripts/images.ts) and listed in content/images.json. Components ask for
// a responsive version of an image URL and fall back to the original when
// there is none, so a new image still shows before the script is re-run.

export const IMAGE_WIDTHS = [480, 960, 1600];
export const MANIFEST_PATH = 'content/images.json';

export interface ImageManifestEntry {
  sha256: string;
  width: number;
  height: number;
  variants: { w: number; src: string }[];
}
export type ImageManifest = Record<string, ImageManifestEntry>;

const manifest = manifestJson as ImageManifest;

export interface ResponsiveImage {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
}

/** A src/srcSet pair for an image URL, with its natural size for layout. */
export function responsiveImage(url: string): ResponsiveImage {
  const entry = manifest[url];
  if (!entry || entry.variants.length === 0) return { src: url };
  const largest = entry.variants[entry.variants.length - 1];
  return {
    src: largest.src,
    srcSet: entry.variants.map((v) => `${v.src} ${v.w}w`).join(', '),
    width: entry.width,
    height: entry.height,
  };
}

/** Width over height, when known. Very wide images (a pipeline strip) shouldn't be cropped into a card. */
export function aspectRatio(url: string): number | null {
  const entry = manifest[url];
  return entry && entry.height > 0 ? entry.width / entry.height : null;
}

export function imageManifest(): ImageManifest {
  return manifest;
}
