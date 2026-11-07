// CAD showcase for MedLock, the CREATE-X capstone: a guided IVF medication
// preparation station. Render with:
//   npm run cad -- medlock            (STEP at cad-source/medlock.step, gitignored)
// Any change here needs a re-render; the build says so if you forget.
// `npm run cad -- medlock --list` prints every part's path.
//
// Coordinates are millimetres, Y up, as exported from Onshape. The station sits
// on a square plywood baseplate: the control unit (Pi, main PCB, display, knob)
// at the back right, the supply tray and bin on the left, and the imaging dock
// at the front right, where the syringe rests in its cradle inside a tunnel
// with the camera on the back wall and the backlight on the front wall. The
// lid lifts straight off the tunnel; nothing else on Rev0 moves.

import type { CadProjectInput } from '@/lib/cad/schema';

// Subsystem colors. Build steps that belong to the same subsystem share one.
const BASE = '#cdb38b';
const ELECTRONICS = '#3d7a4b';
const CONTROL = '#62676d';
const SUPPLIES = '#7891b4';
const DOCK = '#3f9488';
const CAMERA = '#8b6fc2';
const TUNNEL = '#8e99a3';
const LIGHT = '#d48a3a';
const SYRINGE = '#c23b22';
const LID = '#c5c9cc';

/** What the lid comes off to show: the imaging dock and the syringe in it. */
const IMAGING = ['Cradle and seat sensor', 'Camera', 'Backlight', 'Syringe', 'Lid'];

export const MEDLOCK_CAD: CadProjectInput = {
  slug: 'medlock',
  title: 'MedLock',
  description:
    'MedLock, a guided preparation station for IVF injections, going together in build order: the baseplate, the control unit, the supply tray, then the imaging dock. Then the lid lifts off the dock to show the syringe in its cradle between the camera and the backlight.',
  // Large (three detailed PCB exports): occt-import-js runs out of WebAssembly memory on it.
  mesher: 'native',
  up: 'y',
  colors: 'mono',
  // The PCB exports carry their copper, mask and silkscreen layers as zero-thickness
  // bodies: invisible at this scale, and hundreds of them.
  hide: ['/\\/(SILKSCREEN|PASTEMASK|SOLDERMASK)_(TOP|BOTTOM)[^/]*$/'],
  // Build steps, in the order the station goes together. The PCB components, the
  // camera module's pads and the like aren't named here: each joins the step of
  // the part it sits on.
  groups: [
    { label: 'Baseplate', match: '/\\/(Baseplate|Standoff_\\d)[^/]*$/', color: BASE },
    { label: 'Main PCB', match: '/\\/MedLock_PCB_REV_B_PCB$/', color: ELECTRONICS },
    { label: 'Raspberry Pi', match: '/\\/(Pi3B|GPIO_socket)[^/]*$/', color: ELECTRONICS },
    {
      label: 'Control unit',
      match: '/\\/(Enclosure|Knob|Cable_cover|2\\.8 LCD TFT|2\\.8in TFT)[^/]*$/',
      color: CONTROL,
    },
    { label: 'Supply tray', match: '/\\/(Tray|Bin_body)$/', color: SUPPLIES },
    { label: 'Cradle and seat sensor', match: '/\\/(Dock_base|MedLock_SeatSensor_PCB|OPT1_body|Cradle_3mL)[^/]*$/', color: DOCK },
    { label: 'Tunnel', match: '/\\/Tunnel$/', color: TUNNEL },
    { label: 'Camera', match: '/\\/(Dielectric|J1__C-1-84952|U4__TNBA1392|IMX708|FPC_1)[^/]*/', color: CAMERA },
    { label: 'Backlight', match: '/\\/(MedLock_Backlight_PCB_PCB|Backlight_cover|LED_D5\\.0mm)[^/]*$/', color: LIGHT },
    { label: 'Syringe', match: '/\\/Syringe_3mL_ref$/', color: SYRINGE },
    { label: 'Lid', match: '/\\/Lid$/', color: LID },
  ],

  joints: [
    // A lift-off lid: its rim registers inside the tunnel walls, and it comes straight up by the handle.
    { id: 'lid', label: 'Lid', type: 'prismatic', axis: 'y', parts: ['/\\/Lid$/'] },
  ],

  // First play starts on the assembled station, with the lid about to come off.
  playFrom: 'Lid off',

  // From the user's side: the display faces the supply tray, with the imaging dock to the right.
  camera: { azimuth: -40, elevation: 38, sway: 12, zoom: 1 },

  timeline: [
    { kind: 'build', seconds: 10 },
    { kind: 'hold', seconds: 0.8 },
    { kind: 'move', seconds: 1.1, joints: { lid: 70 }, label: 'Lid off', focus: IMAGING },
    { kind: 'hold', seconds: 2.2, focus: IMAGING },
    { kind: 'move', seconds: 0.9, joints: { lid: 0 }, focus: IMAGING },
    { kind: 'hold', seconds: 0.6 },
    { kind: 'explode', seconds: 1.3, amount: 1 },
    { kind: 'hold', seconds: 1.2 },
    { kind: 'explode', seconds: 1.1, amount: 0 },
    { kind: 'hold', seconds: 0.5 },
    { kind: 'unbuild', seconds: 1.6 },
  ],
};
