// Design walkthrough data for the /about page (BlockParty, ME 2110).
// Images live in /public/about/. Types and validation: lib/aboutSchema.ts.

import type { Mechanism } from '@/lib/aboutSchema';

export const BLOCKPARTY_INTRO =
  'BlockParty, our ME 2110 competition robot, won the course’s Best Design Award. Select a mechanism to see how it works.';

export const BLOCKPARTY_TEAM_LINE =
  'Team project. Work passed between us in shifts, so these were team decisions. My part: prototyping and fabricating our first mechanism, laser-cutting parts for another, ideation and testing on the bag arm, and the code for our first sprint.';

export const MECHANISMS: Mechanism[] = [
  {
    id: 'ore',
    cadChapter: 'Launch and ore arms',
    name: 'Ground ore arms',
    image: '/about/blockparty_ore.jpg',
    alt: 'Underside render of the ground ore mechanism: piston, direction-reversing gear, belts and arm mounts',
    title: 'One piston, two arms',
    text: 'A single pneumatic piston, hinged on its back bolt, drives a pulley. An intermediate gear flips the rotation, so both arms swing open in opposite directions from one actuator.',
  },
  {
    id: 'bag',
    cadChapter: 'Bag arm',
    name: 'Bag arm',
    image: '/about/blockparty_bag.jpg',
    alt: 'Render of the two-link bag arm reaching the top of the end tower',
    title: 'Two-link bag arm',
    text: 'The end crystal gets knocked into a plastic bag, then a two-link arm lifts the bag to the top of the end tower. One motor drives it through a fishing-line pulley.',
    myPart: 'ideation and testing.',
  },
  {
    id: 'orient',
    cadChapter: 'Dog bone release',
    name: 'Dog bone release',
    image: '/about/blockparty_orient.jpg',
    alt: 'Close-up render of two toggle switches and a dial on the robot frame',
    title: 'A sling, timed by two switches and a dial',
    text: 'A rubber-banded sling holds the dog bone until a solenoid pin lets it go. Two switches and a dial encode which way the field is facing, so the code can work out when to fire and land the dog bone in the right zone.',
  },
  {
    id: 'fab',
    cadChapter: 'Build',
    name: 'Fabrication',
    image: '/about/blockparty_fab2.jpg',
    alt: 'Photo of the laser-cut frame assembled with interlocking tabs',
    title: 'A mostly glue-free frame',
    text: 'Everything was laser-cut or 3D-printed. Interlocking tabs let the frame go together mostly without glue, and we standardized on #10-32 and #6-32 machine screws.',
  },
];
