// Lab model for testing the CAD pipeline: a vendor mini toggle switch STEP
// (8 bodies, Z-up, from FreeCAD). Shows on the dev-only /lab/cad/ page; its
// renders go to public/cad/lab/ and are gitignored.
//   npm run cad -- toggle-switch --step "<ME2110 repo>/cad/external/toggle-switch/5mm SPST Mini Toggle Switch.step"

import type { CadProjectInput } from '@/lib/cad/schema';

export const TOGGLE_SWITCH_CAD: CadProjectInput = {
  slug: 'toggle-switch',
  title: 'Mini toggle switch',
  description: 'A vendor mini toggle switch assembling itself, flipping its lever, and spreading into an exploded view.',
  up: 'z',
  colors: 'mono',
  // Body005 is the lever shaft and Body008 its cap; Body is the base.
  accent: ['/Body008$/'],
  joints: [
    {
      id: 'lever',
      label: 'Lever',
      parts: ['/Body00[58]$/'],
      type: 'revolute',
      axis: 'x',
      // Inside the bushing, just above the nut (model coordinates after the Z-up turn).
      pivot: [0, 9, 0],
    },
  ],
  camera: { azimuth: 40, elevation: 20, sway: 22 },
  timeline: [
    { kind: 'build', seconds: 3.4 },
    { kind: 'hold', seconds: 0.5 },
    { kind: 'move', seconds: 0.45, joints: { lever: -22 }, label: 'Lever' },
    { kind: 'hold', seconds: 0.6 },
    { kind: 'move', seconds: 0.45, joints: { lever: 0 } },
    { kind: 'hold', seconds: 0.4 },
    { kind: 'explode', seconds: 1, amount: 1 },
    { kind: 'hold', seconds: 1 },
    { kind: 'explode', seconds: 0.9, amount: 0 },
    { kind: 'hold', seconds: 0.4 },
    { kind: 'unbuild', seconds: 1.1 },
  ],
};
