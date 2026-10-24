import type { EvidenceItem } from '@/lib/schema';

const IMAGE_TYPES = new Set(['photo', 'screenshot', 'drawing', 'diagram']);

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i;
const PDF_EXT = /\.pdf(\?|$)/i;
const VIDEO_EXT = /\.(mp4|mov|webm)(\?|$)/i;
const CAD_EXT = /\.(glb|gltf|stl|obj|step|stp|iges|igs)(\?|$)/i;

export type FormatKind = 'image' | 'pdf' | 'video' | 'cad';

// What the file actually is: stored MIME first, then URL extension. The
// user-selected `type` label is semantic and deliberately never consulted
// here — a photo labeled "cad" must still render as an image (ratified:
// mimeType drives thumbnail rendering, type is semantic only). Unrecognized
// MIMEs (e.g. application/octet-stream from iOS CAD uploads) fall through to
// the extension check rather than vetoing. Returns null when there is no
// format signal at all; only then may callers fall back to `type`.
export function detectFormatKind(item: EvidenceItem): FormatKind | null {
  const mime = item.mimeType ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('model/')) return 'cad';
  const url = item.url ?? '';
  if (IMAGE_EXT.test(url)) return 'image';
  if (PDF_EXT.test(url)) return 'pdf';
  if (VIDEO_EXT.test(url)) return 'video';
  if (CAD_EXT.test(url)) return 'cad';
  return null;
}

export function isVideoItem(item: EvidenceItem): boolean {
  const kind = detectFormatKind(item);
  if (kind) return kind === 'video';
  return item.type === 'video';
}

export function isCadItem(item: EvidenceItem): boolean {
  const kind = detectFormatKind(item);
  if (kind) return kind === 'cad';
  return item.type === 'cad';
}

export function isGridItem(item: EvidenceItem): boolean {
  if (typeof item.url !== 'string' || item.url.trim() === '') return false;
  const kind = detectFormatKind(item);
  // PDFs belong in the document list, not the thumbnail grid.
  if (kind) return kind !== 'pdf';
  // No format signal (link-only evidence): the type label picks a placeholder
  // tile, same as before.
  if (item.type === 'video' || item.type === 'cad') return true;
  if (
    !item.mimeType &&
    item.url.includes('drive.google.com/thumbnail') &&
    IMAGE_TYPES.has(item.type)
  ) {
    return true;
  }
  return false;
}
