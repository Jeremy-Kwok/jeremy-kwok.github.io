// The resume as images for /resume/, made by `npm run images`
// (scripts/resume-image.ts) from public/Jeremy-Kwok-Resume.pdf and described
// in content/resume.json. Types and constants only, so both the script and
// the page can import them.

export const RESUME_IMAGE_PATH = 'content/resume.json';
export const RESUME_WIDTHS = [800, 1200, 1700];

/** A link in the PDF, placed as fractions of the page (top-left origin) so /resume/ can lay it over the image. */
export interface ResumeLink {
  url: string;
  /** The linked words, for screen readers. */
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ResumeImage {
  /** Hash of the PDF the images were made from; the build checks it still matches. */
  sha256: string;
  width: number;
  height: number;
  variants: { w: number; src: string }[];
  /** The PDF's text, for screen readers, search and copy-paste. */
  text: string;
  /** Page one's web links, so they still work on the image. */
  links: ResumeLink[];
}
