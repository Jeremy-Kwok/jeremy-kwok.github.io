// CAD showcase for BlockParty, the ME 2110 robot. Render with:
//   npm run cad -- blockparty            (STEP at cad-source/blockparty.step, gitignored)
// Any change here needs a re-render; the build says so if you forget.
// `npm run cad -- blockparty --list` prints every part's path.
//
// Coordinates are millimetres, Y up, as exported from Onshape. The STEP is
// saved with the robot deployed (carriage launched, right ore arm open), so
// every joint below is 0 in that pose, and `initial` puts it back in its
// start-of-match pose, the way the poster shows it. The robot is built in the
// start pose and then runs the match from arduino/ME2110-final/src/main.cpp.

import type { CadProjectInput } from '@/lib/cad/schema';

// Subsystem colors. Build steps that belong to the same subsystem share one.
const FRAME = '#c5c9cc';
const SLIDES = '#8e99a3';
const CARRIAGE = '#7891b4';
const DRIVE = '#62676d';
const ORE = '#d48a3a';
const PNEUMATICS = '#3f9488';
const BAG = '#8b6fc2';
const RELEASE = '#c23b22';
const ELECTRONICS = '#3d7a4b';

/** Everything that rides out on the carriage: past the front of the base, except the slides themselves. */
const ON_CARRIAGE = { within: [[-1000, -1000, -900], [1000, 1000, 1000]] as [[number, number, number], [number, number, number]], not: 'tch-520' };
/** One telescoping slide member (left and right) by where its center sits along the slide. */
const slideAt = (zMin: number, zMax: number) => ({
  match: 'tch-520',
  within: [[-200, 0, zMin], [200, 1000, zMax]] as [[number, number, number], [number, number, number]],
});

// The first group names the chapter's color in legends (the walkthrough's swatches).
/** Each ore arm's link 2 (outer arm, paddle and its brackets), by the region it fills in the saved pose. */
const LEFT_FOREARM = { within: [[-300, 40, -1500], [-100, 130, -1150]] as [[number, number, number], [number, number, number]] };
const RIGHT_FOREARM = { within: [[150, 40, -1760], [520, 130, -1580]] as [[number, number, number], [number, number, number]] };

const STEP_1 = ['Ground ore arms', 'Drawer slides', 'Carriage', 'Pneumatics', 'Belts and pulleys'];

export const BLOCKPARTY_CAD: CadProjectInput = {
  slug: 'blockparty',
  title: 'BlockParty',
  description:
    'BlockParty, our ME 2110 competition robot, going together in build order and then running its match: the carriage launches, the ore arms swing open, the dog bone drops, and the bag arm lifts the end crystal.',
  // Exported from Onshape with "Export models oriented Y axis up", so Y is up.
  up: 'y',
  colors: 'mono',
  // Build steps, in the order the robot goes together. This STEP came through
  // Onshape's SolidWorks import, which put nearly every body under one node, so
  // steps match the part name (the last path segment). Anything no step names
  // (bearings, spacers, unnamed "Boss-Extrude" bodies) joins the step of the
  // part it sits closest to.
  groups: [
    { label: 'Base plate', match: '/bottom-base[^/]*$/', color: FRAME },
    { label: 'Walls', match: '/(forward-wall|rear-wall|back-wall)[^/]*$/', color: FRAME },
    { label: 'Floors', match: '/(lower-floor|upper-floor)[^/]*$/', color: FRAME },
    { label: 'Gussets', match: '/bases-gusset[^/]*$/', color: FRAME },
    { label: 'Slide mounts', match: '/(drawer-slide-mount|over-rail-base|spool-mount)[^/]*$/', color: FRAME },
    { label: 'Drawer slides', match: '/tch-520[^/]*$/', color: SLIDES },
    // The carriage rides at the far end of the drawer slides, so it goes on after them.
    { label: 'Carriage', match: '/(carriage|spacer layer|launch-gusset|support-gusset)[^/]*$/', color: CARRIAGE },
    { label: 'Belts and pulleys', match: '/(htd|common-pulley|pulley-reverse)[^/]*$/', color: DRIVE },
    { label: 'Ground ore arms', match: '/(ground_ore_collector|ore-collector-upper-base|wire-spool|small-motor-spool)[^/]*$/', color: ORE },
    { label: 'Pneumatics', match: '/(piston|coupler nut|160234|186096|348166|3583 |359874|8030308)[^/]*$/', color: PNEUMATICS },
    { label: 'Bag arm', match: '/(bag-arm|end-crystal-arm|end-effector)[^/]*$/', color: BAG },
    { label: 'Dog bone release', match: '/(solenoid|release|mdfmount|swingarm|\/pin-)[^/]*$/', color: RELEASE },
    { label: 'Arduino', match: '/arduino[^/]*$/', color: ELECTRONICS },
  ],
  // Not the robot: the competition field, a mob game piece, and the end crystal on its stand.
  hide: ['02-field', 'field-elements', '/\\/mob-[^/]*$/', 'end-crystal-mount'],

  joints: [
    // Two drawer slides in series, each outer / intermediate / inner member.
    // Retracted, every member nests inside its outer one (offsets measured from the STEP).
    { id: 'slide-a-mid', label: 'Drawer slides', type: 'prismatic', axis: 'z', initial: -253, parts: [slideAt(-1100, -1000)] },
    {
      id: 'slide-a-inner',
      label: 'Drawer slides',
      type: 'prismatic',
      axis: 'z',
      initial: -380,
      // Slide A's inner member carries slide B's outer member, and everything beyond.
      parts: [slideAt(-950, -900), slideAt(-800, -740), slideAt(-650, -580), ON_CARRIAGE],
    },
    { id: 'slide-b-mid', label: 'Drawer slides', type: 'prismatic', axis: 'z', initial: -160, parts: [slideAt(-800, -740)] },
    { id: 'slide-b-inner', label: 'Drawer slides', type: 'prismatic', axis: 'z', initial: -388, parts: [slideAt(-650, -580), ON_CARRIAGE] },

    // The launch piston (top rear) and the ore piston (underneath), each a short stroke.
    { id: 'launch-rod', label: 'Launch piston', type: 'prismatic', axis: 'z', parts: [{ match: 'piston rod', within: [[-100, 300, -2000], [0, 420, -1300]] }, 'coupler nut'] },
    { id: 'ore-rod', label: 'Ore piston', type: 'prismatic', axis: [0.22, 0, 0.975], parts: [{ match: 'piston rod', within: [[0, 50, -1300], [100, 150, -1000]] }, 'piston-butt'] },

    // Ground ore arms, two links per side. Link 1 (the side bar) hinges at its
    // spool on the front corner of the base and starts folded back along the side;
    // link 2 (the outer arm) hinges at link 1's end. They swing out, then the
    // elbows swing link 2 forward: a U in front of the robot that hugs ore in.
    // Saved with the left link 2 folded and the right one open.
    {
      id: 'ore-out-left',
      label: 'Ground ore arms',
      type: 'revolute',
      axis: 'y',
      pivot: [-95, 107, -1050],
      parts: [
        { match: '/ground_ore_collector_arm-/', within: [[-90, 40, -1600], [-60, 130, -1000]] },
        { match: '/ground_ore_collector_spool/', within: [[-130, 40, -1100], [-60, 160, -1000]] },
        { match: 'boss-extrude', within: [[-95, 60, -1585], [-60, 125, -1545]] },
        LEFT_FOREARM,
      ],
    },
    { id: 'ore-elbow-left', label: 'Ground ore arms', type: 'revolute', axis: 'y', pivot: [-80, 97, -1565], parts: [LEFT_FOREARM] },
    {
      id: 'ore-out-right',
      label: 'Ground ore arms',
      type: 'revolute',
      axis: 'y',
      pivot: [95, 107, -1050],
      parts: [
        { match: '/ground_ore_collector_arm-/', within: [[60, 40, -1600], [90, 130, -1000]] },
        { match: '/ground_ore_collector_spool/', within: [[60, 40, -1100], [130, 160, -1000]] },
        { match: 'boss-extrude', within: [[75, 60, -1585], [100, 125, -1545]] },
        RIGHT_FOREARM,
      ],
    },
    { id: 'ore-elbow-right', label: 'Ground ore arms', type: 'revolute', axis: 'y', pivot: [80, 97, -1565], initial: -88, parts: [RIGHT_FOREARM] },

    // Dog bone release: a rubber-banded arm (the red swing arm and its latch tab)
    // pivots on the front pin; the solenoid pin passes through the tab. When it
    // pulls back, the band snaps the arm around and flings the dog bone.
    { id: 'release-pin', label: 'Dog bone release', type: 'prismatic', axis: 'z', parts: ['solenoidpin'] },
    {
      id: 'sling',
      label: 'Dog bone release',
      type: 'revolute',
      axis: 'x',
      pivot: [-41, 304, -399],
      parts: ['swingarm', 'release arm', { match: '/\/pin-/', within: [[-70, 300, -490], [-10, 330, -465]] }],
    },

    // Bag arm, two links: the arm pivots on the bearing at the carriage, and the
    // hoop hangs folded under it from the elbow bearings. Positive hoop angles
    // swing it away from the arm (negative would pass through it).
    {
      id: 'bag-lift',
      label: 'Bag arm',
      type: 'revolute',
      axis: 'x',
      pivot: [0, 384, -463],
      parts: [
        '/\/bag-arm-[^/]*$/',
        'secondary-bag-arm',
        'bag-arm-pulley',
        { match: '/skateboard-bearing|bearing-spacer/', within: [[-50, 350, -870], [50, 450, -820]] },
      ],
    },
    { id: 'bag-hoop', label: 'Bag arm', type: 'revolute', axis: 'x', pivot: [0, 402, -844], parts: ['secondary-bag-arm'] },
  ],

  // First play starts at the match, on the assembled robot the poster shows, not
  // on a bare base plate; the loop then runs explode, rebuild and back around.
  playFrom: 'Launch and ore arms',

  // The robot is long front to back (Z), so look from the side to let it fill the 16:10 frame.
  camera: { azimuth: 64, elevation: 22, sway: 12, zoom: 1.12 },

  timeline: [
    { kind: 'build', seconds: 9.5 },
    { kind: 'hold', seconds: 0.9 },

    // Match step 1 (on_start): the ore piston fires, and 50 ms later the launch
    // piston fires the carriage out along the slides. The ore arms' elbows open
    // (each forearm swings out from against its inner arm), then the whole arm
    // swings in around its spool, sweeping from the back of the robot to the
    // front so the forearms hug in toward the carriage. They stop just short of
    // the platform mount's front wall (contact at 154 degrees, solved from the
    // mesh), with the tips about 110 mm either side of the centerline.
    {
      kind: 'move',
      seconds: 1.2,
      label: 'Launch and ore arms',
      focus: STEP_1,
      ease: 'out',
      joints: {
        'ore-rod': { to: 35, seconds: 0.2 },
        'launch-rod': { to: 45, delay: 0.05, seconds: 0.2 },
        'slide-a-mid': { to: 0, delay: 0.1, seconds: 0.85 },
        'slide-a-inner': { to: 0, delay: 0.1, seconds: 0.85 },
        'slide-b-mid': { to: 0, delay: 0.1, seconds: 0.85 },
        'slide-b-inner': { to: 0, delay: 0.1, seconds: 0.85 },
        'ore-elbow-left': { to: -88, seconds: 0.35, ease: 'inOut' },
        'ore-elbow-right': { to: 0, seconds: 0.35, ease: 'inOut' },
        'ore-out-left': { to: 147, delay: 0.35, seconds: 0.85, ease: 'inOut' },
        'ore-out-right': { to: -147, delay: 0.35, seconds: 0.85, ease: 'inOut' },
      },
    },
    { kind: 'hold', seconds: 0.9, focus: STEP_1 },

    // Step 2 (register_dog_bone_timer): the lock lets go, the solenoid pin pulls
    // back, and the band snaps the sling around, with a small bounce.
    { kind: 'move', seconds: 0.15, joints: { 'release-pin': 22 }, label: 'Dog bone release', focus: ['Dog bone release'] },
    { kind: 'move', seconds: 0.22, joints: { sling: -160 }, ease: 'out', focus: ['Dog bone release'] },
    { kind: 'move', seconds: 0.14, joints: { sling: -142 }, focus: ['Dog bone release'] },
    { kind: 'move', seconds: 0.14, joints: { sling: -150 }, focus: ['Dog bone release'] },
    { kind: 'hold', seconds: 0.7, focus: ['Dog bone release'] },

    // Step 3 (animate_bag, at 20 s): a short tug, a jitter to settle the bag,
    // then the flip: the whole arm swings up with the hoop still folded under
    // it, then the hoop swings counter-clockwise (seen from the camera side),
    // away from the arm and over the top, to reach the top of the tower.
    { kind: 'move', seconds: 0.3, joints: { 'bag-lift': 14 }, ease: 'out', label: 'Bag arm', focus: ['Bag arm'] },
    { kind: 'move', seconds: 0.18, joints: { 'bag-lift': 8 }, focus: ['Bag arm'] },
    { kind: 'move', seconds: 0.18, joints: { 'bag-lift': 17 }, focus: ['Bag arm'] },
    { kind: 'move', seconds: 0.18, joints: { 'bag-lift': 9 }, focus: ['Bag arm'] },
    { kind: 'move', seconds: 1, joints: { 'bag-lift': 150 }, focus: ['Bag arm'] },
    { kind: 'move', seconds: 0.85, joints: { 'bag-hoop': 180 }, focus: ['Bag arm'] },
    { kind: 'hold', seconds: 1, focus: ['Bag arm'] },
    { kind: 'hold', seconds: 0.5 },

    { kind: 'explode', seconds: 1.3, amount: 1 },
    { kind: 'hold', seconds: 1.2 },
    { kind: 'explode', seconds: 1.1, amount: 0 },
    { kind: 'hold', seconds: 0.5 },
    { kind: 'unbuild', seconds: 1.6 },
  ],
};
