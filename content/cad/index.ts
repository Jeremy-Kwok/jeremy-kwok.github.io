import type { CadProjectInput } from '@/lib/cad/schema';
import { BLOCKPARTY_CAD } from './blockparty';
import { TOGGLE_SWITCH_CAD } from './lab/toggle-switch';

/** Showcases that can appear on the site. Their renders in public/cad/<slug>/ are committed. */
export const CAD_PROJECTS: CadProjectInput[] = [BLOCKPARTY_CAD];

/** Test models for the dev-only /lab/cad/ page. Renders go to public/cad/lab/<slug>/ (gitignored). */
export const CAD_LAB: CadProjectInput[] = [TOGGLE_SWITCH_CAD];
