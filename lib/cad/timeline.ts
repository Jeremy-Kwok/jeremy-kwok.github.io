import * as THREE from 'three';
import type { CadJoint, CadProject, PartSelector } from '@/lib/cad/schema';
import { FASTENER_NAME, partMatcher } from '@/lib/cad/match';
import { duration, initialState, spans, stateAt, type ScalarState } from '@/lib/cad/phases';

// Turns the timeline's numbers into part transforms and a camera, for a model
// loaded from the GLB that `npm run cad` writes. The video renderer and the
// in-page 3D view both run this exact code on the exact same file, which is
// why the 3D view can pick up from any frame of the video without a jump.
//
// The build reads like assembly instructions: one step at a time, in the
// order of `groups`, each part sliding a short way in along the axis it
// mounts from (a wall drops onto the base, a gusset comes in from the side
// of its wall, a bearing slides along its own axis) and fading in as it goes.
//
// Only reached through stage.ts, which is only ever loaded by a dynamic
// import, so three.js stays out of every page's initial bundle.

export const CAD_FOV = 30;

interface ResolvedJoint {
  id: string;
  type: CadJoint['type'];
  axis: THREE.Vector3;
  pivot: THREE.Vector3;
}

export interface PartInfo {
  object: THREE.Object3D;
  name: string;
  path: string;
  /** World matrix at load time (the assembled pose). */
  base: THREE.Matrix4;
  /** Inverse of the parent's world matrix, to turn a world pose back into a local one. */
  parentInverse: THREE.Matrix4;
  /** Box and center in the start pose (joints at their initial values): where the part is built. */
  center: THREE.Vector3;
  box: THREE.Box3;
  /** Box and center as saved in the STEP; `within` selectors and pivots refer to this pose. */
  cadBox: THREE.Box3;
  cadCenter: THREE.Vector3;
  fastener: boolean;
  /** Label of the part's group, for focus. */
  groupLabel: string | null;
  /** Build step (index into ModelInfo.steps). */
  step: number;
  /** Arrival window within a build, as fractions of the build step. */
  window: [number, number];
  /** Unit axis the part slides in along, pointing from its seat toward where it starts. */
  approachDir: THREE.Vector3;
  approachDistance: number;
  /** This part's own materials (cloned at load) and their resting opacity, for the fade. */
  materials: { material: THREE.Material; opacity: number }[];
  explodeOffset: THREE.Vector3;
  joints: ResolvedJoint[];
}

export interface BuildStep {
  label: string;
  /** Fractions of the build step. */
  start: number;
  end: number;
}

export interface ModelInfo {
  parts: PartInfo[];
  steps: BuildStep[];
  /** Bounding box of everything placed once each step is done, for the camera to follow the build. */
  stepBoxes: THREE.Box3[];
  /** Second the first build ends. */
  buildEnd: number;
  /**
   * For every timeline step, the box the camera frames while it runs: what the
   * robot occupies across the whole move (so the camera has already made room
   * when a carriage launches). Builds use the finished start pose; explodes and
   * unbuilds keep the step before (the explode has its own pull-back).
   */
  spanBoxes: { start: number; end: number; box: THREE.Box3 }[];
  center: THREE.Vector3;
  box: THREE.Box3;
  radius: number;
  triangles: number;
}

const AXES = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1),
];

function namedAxis(axis: string): THREE.Vector3 {
  const v = new THREE.Vector3();
  const sign = axis.startsWith('-') ? -1 : 1;
  const k = axis.replace('-', '') as 'x' | 'y' | 'z';
  v[k] = sign;
  return v;
}

function unionBox(parts: PartInfo[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const p of parts) box.union(p.box);
  return box;
}

function boxVolume(b: THREE.Box3): number {
  if (b.isEmpty()) return 0;
  const s = b.getSize(new THREE.Vector3());
  return s.x * s.y * s.z;
}

/** Gap between two boxes; 0 when they touch or overlap. */
function boxGap(a: THREE.Box3, b: THREE.Box3): number {
  const dx = Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x);
  const dy = Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y);
  const dz = Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z);
  return Math.hypot(dx, dy, dz);
}

/**
 * Snap a direction to the nearest of ±X, ±Y, ±Z. Coming up from below is
 * discounted a little: very little on a robot goes on from underneath.
 */
function snapToAxis(v: THREE.Vector3): THREE.Vector3 {
  const comps = [v.x, v.y, v.z];
  let best = 1;
  let bestScore = -Infinity;
  comps.forEach((c, k) => {
    const score = Math.abs(c) * (k === 1 && c < 0 ? 0.75 : 1);
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  });
  return AXES[best].clone().multiplyScalar(comps[best] < 0 ? -1 : 1);
}

function resolveJoint(joint: CadJoint, parts: PartInfo[]): ResolvedJoint {
  const find = (rule: string): PartInfo[] => {
    const hit = parts.filter((p) => partMatcher(rule)(p.path));
    if (hit.length === 0) throw new Error(`joint "${joint.id}": no part matches "${rule}"`);
    return hit;
  };
  const savedBox = (hit: PartInfo[]) => {
    const box = new THREE.Box3();
    for (const p of hit) box.union(p.cadBox);
    return box;
  };
  let axis: THREE.Vector3;
  if (typeof joint.axis === 'string') axis = namedAxis(joint.axis);
  else if (Array.isArray(joint.axis)) axis = new THREE.Vector3(...joint.axis);
  else {
    // The long side of a shaft or rail's bounding box.
    const size = savedBox(find(joint.axis.alongPart)).getSize(new THREE.Vector3());
    axis = size.x >= size.y && size.x >= size.z ? namedAxis('x') : size.y >= size.z ? namedAxis('y') : namedAxis('z');
  }
  if (axis.lengthSq() === 0) throw new Error(`joint "${joint.id}": axis has zero length`);
  axis.normalize();
  let pivot = new THREE.Vector3();
  if (Array.isArray(joint.pivot)) pivot = new THREE.Vector3(...joint.pivot);
  else if (joint.pivot) pivot = savedBox(find(joint.pivot.centerOf)).getCenter(new THREE.Vector3());
  return { id: joint.id, type: joint.type, axis, pivot };
}

function selects(sel: PartSelector, p: PartInfo): boolean {
  if (typeof sel === 'string') return partMatcher(sel)(p.path);
  if (sel.match !== undefined && !partMatcher(sel.match)(p.path)) return false;
  if (sel.not !== undefined && partMatcher(sel.not)(p.path)) return false;
  if (sel.within) {
    const [lo, hi] = sel.within;
    const c = p.cadCenter;
    if (c.x < lo[0] || c.y < lo[1] || c.z < lo[2] || c.x > hi[0] || c.y > hi[1] || c.z > hi[2]) return false;
  }
  return true;
}

const _jt = new THREE.Matrix4();
const _jr = new THREE.Matrix4();

/** The part's joint transform for a set of joint values: M = J1 · J2 · … · Jn (parents first). */
function jointMatrix(p: PartInfo, values: Record<string, number>, out: THREE.Matrix4): THREE.Matrix4 {
  out.identity();
  for (const j of p.joints) {
    const value = values[j.id] ?? 0;
    if (j.type === 'revolute') {
      out.multiply(_jt.makeTranslation(j.pivot.x, j.pivot.y, j.pivot.z));
      out.multiply(_jr.makeRotationAxis(j.axis, THREE.MathUtils.degToRad(value)));
      out.multiply(_jt.makeTranslation(-j.pivot.x, -j.pivot.y, -j.pivot.z));
    } else {
      out.multiply(_jt.makeTranslation(j.axis.x * value, j.axis.y * value, j.axis.z * value));
    }
  }
  return out;
}

/** Finds the parts in a loaded model and precomputes everything the animation needs. */
export function analyzeModel(root: THREE.Object3D, project: CadProject): ModelInfo {
  root.updateMatrixWorld(true);
  const parts: PartInfo[] = [];
  let triangles = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const g = mesh.geometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
    if (!obj.userData.cadPart) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    // Each part gets its own materials so it can fade on its own.
    const materials: PartInfo['materials'] = [];
    obj.traverse((child) => {
      const drawable = child as THREE.Mesh;
      if (!(drawable.isMesh || (child as THREE.LineSegments).isLineSegments)) return;
      const own = (Array.isArray(drawable.material) ? drawable.material : [drawable.material]).map((m) => {
        const c = m.clone();
        c.transparent = true;
        materials.push({ material: c, opacity: m.opacity });
        return c;
      });
      drawable.material = Array.isArray(drawable.material) ? own : own[0];
    });
    parts.push({
      object: obj,
      name: String(obj.userData.cadName ?? obj.name),
      path: String(obj.userData.cadPath ?? obj.name),
      base: obj.matrixWorld.clone(),
      parentInverse: obj.parent ? obj.parent.matrixWorld.clone().invert() : new THREE.Matrix4(),
      center: box.getCenter(new THREE.Vector3()),
      box,
      cadBox: box.clone(),
      cadCenter: box.getCenter(new THREE.Vector3()),
      fastener: false,
      groupLabel: null,
      step: 0,
      window: [0, 1],
      approachDir: new THREE.Vector3(0, 1, 0),
      approachDistance: 0,
      materials,
      explodeOffset: new THREE.Vector3(),
      joints: [],
    });
    obj.matrixAutoUpdate = false;
  });
  if (parts.length === 0) throw new Error('the model has no parts');

  // Joints, in config order (parents first). Selectors and pivots use the saved pose.
  for (const joint of project.joints) {
    const resolved = resolveJoint(joint, parts);
    const moved = parts.filter((p) => joint.parts.some((sel) => selects(sel, p)));
    if (moved.length === 0) throw new Error(`joint "${joint.id}": no part matches ${JSON.stringify(joint.parts)}`);
    for (const p of moved) p.joints.push(resolved);
  }

  // The robot is built in its start pose: every joint at its initial value. From
  // here on, `box` and `center` are that pose (ordering, approach, camera follow).
  const start = initialState(project);
  const m = new THREE.Matrix4();
  for (const p of parts) {
    if (p.joints.length === 0) continue;
    p.box = p.cadBox.clone().applyMatrix4(jointMatrix(p, start.joints, m));
    p.center = p.box.getCenter(new THREE.Vector3());
  }

  const startBox = unionBox(parts);
  const diag = startBox.getSize(new THREE.Vector3()).length() || 1;

  for (const p of parts) {
    const pdiag = p.box.getSize(new THREE.Vector3()).length();
    p.fastener = FASTENER_NAME.test(p.name) || pdiag < diag * 0.04;
  }

  // Build steps. A part matched by no rule joins the step of the nearest part
  // that was matched, so an unnamed spacer arrives with whatever it bolts to.
  const rules = project.groups.map((g) => partMatcher(g.match));
  const direct = parts.map((p) => rules.findIndex((m) => m(p.path)));
  const groupOf = new Map<PartInfo, number>();
  parts.forEach((p, i) => {
    if (direct[i] !== -1) {
      groupOf.set(p, direct[i]);
      return;
    }
    let best = -1;
    let bestGap = Infinity;
    parts.forEach((q, j) => {
      if (direct[j] === -1) return;
      const gap = boxGap(p.box, q.box) + 1e-6 * p.center.distanceTo(q.center);
      if (gap < bestGap) {
        bestGap = gap;
        best = direct[j];
      }
    });
    groupOf.set(p, best === -1 ? project.groups.length : best);
  });

  // Subsystem colors and focus labels come from the group.
  for (const p of parts) {
    const group = project.groups[groupOf.get(p)!];
    p.groupLabel = group?.label ?? null;
    if (!group?.color) continue;
    for (const { material } of p.materials) {
      if ((material as THREE.LineBasicMaterial).isLineBasicMaterial) continue;
      (material as THREE.MeshStandardMaterial).color?.set(group.color);
    }
  }

  // Order: by step, hardware last within a step, then bottom-up, bigger first.
  const volume = (p: PartInfo) => boxVolume(p.box);
  const ordered = parts
    .map((p, i) => ({ p, i, g: groupOf.get(p)! }))
    .sort((a, b) =>
      a.g - b.g ||
      Number(a.p.fastener) - Number(b.p.fastener) ||
      a.p.box.min.y - b.p.box.min.y ||
      volume(b.p) - volume(a.p) ||
      a.i - b.i
    );

  // Timing. Each step gets a slice of the build that grows (slowly) with its
  // part count; its parts land one after another inside the slice, and the
  // last bit of each slice is a beat before the next step starts.
  const buildSeconds = project.timeline.find((s) => s.kind === 'build')?.seconds ?? 4;
  const usedGroups = [...new Set(ordered.map((o) => o.g))];
  const weight = (n: number) => Math.min(3, 1 + 0.12 * (n - 1));
  const counts = usedGroups.map((g) => ordered.filter((o) => o.g === g).length);
  const totalWeight = counts.reduce((s, n) => s + weight(n), 0);
  const steps: BuildStep[] = [];
  let cursor = 0;
  usedGroups.forEach((g, k) => {
    const span = weight(counts[k]) / totalWeight;
    const active = span * 0.88;
    const members = ordered.filter((o) => o.g === g).map((o) => o.p);
    const flight = Math.min(0.55 / buildSeconds, active * 0.8);
    members.forEach((p, i) => {
      const start = cursor + (members.length > 1 ? (active - flight) * (i / (members.length - 1)) : 0);
      p.window = [start, Math.min(1, start + flight)];
      p.step = k;
    });
    steps.push({ label: project.groups[g]?.label ?? `Step ${k + 1}`, start: cursor, end: cursor + active });
    cursor += span;
  });

  // Approach: away from what the part rests on. For each part, find the
  // already-placed parts it touches, take the middle of the contact, and slide
  // in from the opposite side along the nearest axis. A small round part (a
  // bearing, a pulley, a spacer) slides along its own axis instead.
  const margin = diag * 0.006;
  const placed: PartInfo[] = [];
  for (const { p } of ordered) {
    const reach = p.box.clone().expandByScalar(margin);
    const contact = new THREE.Vector3();
    let total = 0;
    for (const q of placed) {
      if (!reach.intersectsBox(q.box)) continue;
      const overlap = reach.clone().intersect(q.box.clone().expandByScalar(margin));
      const w = boxVolume(overlap) + 1e-9;
      contact.addScaledVector(overlap.getCenter(new THREE.Vector3()), w);
      total += w;
    }
    const size = p.box.getSize(new THREE.Vector3());
    const pdiag = size.length();
    const away = total > 0 ? p.center.clone().sub(contact.divideScalar(total)) : new THREE.Vector3(0, 1, 0);
    const dims = [size.x, size.y, size.z];
    const sorted = [...dims].sort((a, b) => a - b);
    const round = pdiag < diag * 0.08 && sorted[0] < 0.5 * sorted[1] && sorted[1] > 0.75 * sorted[2];
    let dir: THREE.Vector3;
    if (round) {
      const k = dims.indexOf(sorted[0]);
      dir = AXES[k].clone();
      const along = away.dot(dir);
      // Centered in its hole (no clear side): a flat-lying part comes down from above.
      if (Math.abs(along) < pdiag * 0.02) {
        if (k === 1) dir.set(0, 1, 0);
      } else if (along < 0) {
        dir.negate();
      }
    } else if (away.length() > pdiag * 0.08) {
      dir = snapToAxis(away);
    } else {
      dir = new THREE.Vector3(0, 1, 0);
    }
    p.approachDir = dir;
    const sizeAlong = Math.abs(size.dot(dir));
    p.approachDistance = THREE.MathUtils.clamp(sizeAlong * 1.2 + diag * 0.05, diag * 0.04, diag * 0.25);
    placed.push(p);
  }

  const posedBox = (p: PartInfo, values: Record<string, number>) =>
    p.joints.length ? p.cadBox.clone().applyMatrix4(jointMatrix(p, values, m)) : p.cadBox.clone();

  // Exploded view: build steps move apart as units, their parts spread a little.
  // Offsets come from the pose the robot is in when the explode starts.
  const explodeSpan = spans(project.timeline).find((sp) => sp.step.kind === 'explode' && sp.step.amount > 0);
  const explodeJoints = explodeSpan ? stateAt(project, explodeSpan.start).joints : start.joints;
  const explodeBoxes = new Map(parts.map((p) => [p, posedBox(p, explodeJoints)]));
  const explodeCenter = new THREE.Box3();
  for (const b of explodeBoxes.values()) explodeCenter.union(b);
  const mc = explodeCenter.getCenter(new THREE.Vector3());
  const stepCenters = new Map<number, THREE.Vector3>();
  for (let k = 0; k < steps.length; k++) {
    const box = new THREE.Box3();
    for (const p of parts) if (p.step === k) box.union(explodeBoxes.get(p)!);
    if (!box.isEmpty()) stepCenters.set(k, box.getCenter(new THREE.Vector3()));
  }
  for (const p of parts) {
    const pc = explodeBoxes.get(p)!.getCenter(new THREE.Vector3());
    const gc = project.groups.length ? stepCenters.get(p.step) : undefined;
    p.explodeOffset = gc
      ? gc.clone().sub(mc).multiplyScalar(0.9).add(pc.clone().sub(gc).multiplyScalar(0.45))
      : pc.clone().sub(mc).multiplyScalar(0.8);
  }

  const stepBoxes = steps.map((_, k) => unionBox(parts.filter((p) => p.step <= k)));

  // The camera's full view covers everything the robot does: sample the
  // timeline and take the union of every pose (joints only; explode and flights
  // have their own camera handling).
  const envelope = startBox.clone();
  const total = duration(project.timeline);
  if (project.joints.length > 0) {
    for (let t = 0; t <= total; t += 0.1) {
      const values = stateAt(project, t).joints;
      for (const p of parts) if (p.joints.length) envelope.union(posedBox(p, values));
    }
  }
  const box = envelope;
  const center = box.getCenter(new THREE.Vector3());
  const radius = (box.getSize(new THREE.Vector3()).length() || 1) / 2;
  const timelineSpans = spans(project.timeline);
  const buildSpan = timelineSpans.find((sp) => sp.step.kind === 'build');
  const builtBox = stepBoxes.length ? stepBoxes[stepBoxes.length - 1] : startBox;
  const spanBoxes: ModelInfo['spanBoxes'] = [];
  timelineSpans.forEach((sp, i) => {
    let b: THREE.Box3;
    if (sp.step.kind === 'build') b = builtBox.clone();
    else if (sp.step.kind === 'explode' || sp.step.kind === 'unbuild') b = (i > 0 ? spanBoxes[i - 1].box : builtBox).clone();
    else {
      b = new THREE.Box3();
      const n = Math.max(2, Math.ceil(sp.step.seconds / 0.1));
      for (let k = 0; k <= n; k++) {
        const values = stateAt(project, sp.start + ((sp.end - sp.start) * k) / n).joints;
        for (const p of parts) b.union(posedBox(p, values));
      }
    }
    spanBoxes.push({ start: sp.start, end: sp.end, box: b });
  });

  // Without groups the whole build is one step, which isn't worth a caption (or a camera move).
  const grouped = project.groups.length > 0;
  return {
    parts,
    steps: grouped ? steps : [],
    stepBoxes: grouped ? stepBoxes : [],
    buildEnd: buildSpan ? buildSpan.end : 0,
    spanBoxes,
    center,
    box,
    radius,
    triangles: Math.round(triangles),
  };
}

/** The build step on screen for a state, for the "03 Floors" caption; null outside a build. */
export function buildStepAt(info: ModelInfo, state: ScalarState): { index: number; total: number; label: string } | null {
  if (state.leaving || state.assembly <= 0 || state.assembly >= 1 || info.steps.length === 0) return null;
  let index = 0;
  for (let k = 0; k < info.steps.length; k++) if (info.steps[k].start <= state.assembly) index = k;
  return { index, total: info.steps.length, label: info.steps[index].label };
}

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
function easeOutCubic(u: number): number {
  return 1 - Math.pow(1 - u, 3);
}
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _v = new THREE.Vector3();
/** Fraction of an unbuild left empty at the end, so the loop point shows nothing. */
const LEAVE_EARLY = 0.08;
/** How far parts outside the focus fade (0.72 leaves them at 28%: present, but quiet). */
const FOCUS_DIM = 0.72;

/** Poses every part for a state from stateAt(). */
export function applyPose(info: ModelInfo, state: ScalarState): void {
  const focus = state.focus;
  for (const p of info.parts) {
    // 1. Joints, parents first: M = J1 · J2 · … · Jn.
    const m = jointMatrix(p, state.joints, _m);
    // 2. Exploded offset.
    if (state.explode !== 0) {
      _v.copy(p.explodeOffset).multiplyScalar(state.explode);
      m.premultiply(_t.makeTranslation(_v.x, _v.y, _v.z));
    }
    // 3. Sliding in (or out) during a build, fading as it goes.
    const [s, e] = p.window;
    // Leaving runs on a slightly compressed clock so the last part is fully gone
    // a few frames before the loop point, not popping out between two frames.
    const assembly = state.leaving ? Math.max(0, (state.assembly - LEAVE_EARLY) / (1 - LEAVE_EARLY)) : state.assembly;
    const u = Math.min(1, Math.max(0, (assembly - s) / (e - s)));
    p.object.visible = u > 0;
    let fade = 1;
    if (u > 0 && u < 1) {
      const travel = state.leaving ? (1 - u) * (1 - u) : 1 - easeOutCubic(u);
      _v.copy(p.approachDir).multiplyScalar(p.approachDistance * travel);
      m.premultiply(_t.makeTranslation(_v.x, _v.y, _v.z));
      // Arriving parts are solid early; leaving parts fade the whole way out.
      fade = state.leaving ? smoothstep(0, 1, u) : smoothstep(0, 0.4, u);
    }
    // 4. Focus: everything outside the mechanism being shown steps back.
    if (focus && !(p.groupLabel && focus.groups.includes(p.groupLabel))) fade *= 1 - FOCUS_DIM * focus.amount;
    for (const { material, opacity } of p.materials) material.opacity = opacity * fade;
    // world = M · base; local = parent⁻¹ · world
    p.object.matrix.copy(p.parentInverse).multiply(m).multiply(p.base);
    p.object.matrixWorldNeedsUpdate = true;
  }
}

/**
 * Camera distance that keeps the assembled model in frame from every angle the
 * camera sways through, so the framing stays steady while it moves.
 */
function fitBox(box: THREE.Box3, project: CadProject, aspect: number): number {
  const { azimuth, elevation, sway } = project.camera;
  const vFov = THREE.MathUtils.degToRad(CAD_FOV);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const center = box.getCenter(new THREE.Vector3());
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).sub(center));
  let dist = 0;
  for (let i = 0; i <= 8; i++) {
    const az = azimuth + sway * (i / 4 - 1);
    const dir = viewDirection(az, elevation);
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    for (const c of corners) {
      const depth = c.dot(dir);
      dist = Math.max(dist, depth + Math.abs(c.dot(up)) / Math.tan(vFov / 2), depth + Math.abs(c.dot(right)) / Math.tan(hFov / 2));
    }
  }
  return (dist || box.getSize(new THREE.Vector3()).length() * 1.5) * 1.1;
}

export interface Fits {
  /** Everything the robot ever occupies. */
  full: number;
  /** The robot as of the end of each build step. */
  steps: number[];
  /** Each timeline step's camera box (ModelInfo.spanBoxes). */
  spans: number[];
}

/** Camera distances for the model, each build stage and each timeline step, at one aspect ratio. */
export function fitDistance(info: ModelInfo, project: CadProject, aspect: number): Fits {
  return {
    full: fitBox(info.box, project, aspect),
    steps: info.stepBoxes.map((b) => fitBox(b, project, aspect)),
    spans: info.spanBoxes.map((s) => fitBox(s.box, project, aspect)),
  };
}

function viewDirection(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}

/** Seconds the camera leads the timeline by after a build. */
const CAMERA_LEAD = 0.35;

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  near: number;
  far: number;
}

/** Where the video's camera is at second t. */
export function cameraPose(info: ModelInfo, project: CadProject, fits: Fits, t: number, state: ScalarState): CameraPose {
  const total = duration(project.timeline);
  const { azimuth, elevation, sway, zoom } = project.camera;
  const az = azimuth + sway * Math.sin((2 * Math.PI * t) / total);

  // During a build the camera follows what's been placed: close on the base
  // plate at first, easing back as each step adds parts. Never closer than 40%
  // of the finished robot's fit, so the first parts don't fill the frame.
  // After the build it eases from each step's box to the next over the step.
  let target = info.center.clone();
  let fit = fits.full;
  const builtFit = fits.steps.length ? fits.steps[fits.steps.length - 1] : fits.full;
  if (!state.leaving && state.assembly < 1 && info.steps.length > 0) {
    let k = 0;
    for (let i = 0; i < info.steps.length; i++) if (info.steps[i].start <= state.assembly) k = i;
    const step = info.steps[k];
    const e = easeInOutCubic(Math.min(1, Math.max(0, (state.assembly - step.start) / Math.max(1e-6, step.end - step.start))));
    const from = info.stepBoxes[Math.max(0, k - 1)];
    const to = info.stepBoxes[k];
    target = from.getCenter(new THREE.Vector3()).lerp(to.getCenter(new THREE.Vector3()), e);
    fit = THREE.MathUtils.lerp(fits.steps[Math.max(0, k - 1)], fits.steps[k], e);
    fit = Math.max(fit, builtFit * 0.4);
  } else if (info.spanBoxes.length > 0) {
    // The camera runs a little ahead of the motion, so it's already making room
    // when something fast (a launch) starts, instead of chasing it.
    const tc = Math.min(t + CAMERA_LEAD, info.spanBoxes[info.spanBoxes.length - 1].end - 1e-6);
    let i = info.spanBoxes.findIndex((sp) => tc >= sp.start && tc < sp.end);
    if (i === -1) i = info.spanBoxes.length - 1;
    const sp = info.spanBoxes[i];
    const prev = Math.max(0, i - 1);
    // Ease over the step's own length: a step that ended before its ease did
    // would leave the next one starting from somewhere the camera never reached.
    const e = easeInOutCubic(Math.min(1, Math.max(0, (tc - sp.start) / Math.max(1e-6, sp.end - sp.start))));
    target = info.spanBoxes[prev].box.getCenter(new THREE.Vector3()).lerp(sp.box.getCenter(new THREE.Vector3()), e);
    fit = THREE.MathUtils.lerp(fits.spans[prev], fits.spans[i], e);
  }
  const dist = (fit * (1 + 0.45 * Math.max(0, state.explode))) / zoom;
  const position = viewDirection(az, elevation).multiplyScalar(dist).add(target);
  return {
    position,
    target,
    near: Math.max(dist * 0.01, info.radius * 1e-3),
    far: dist * 4 + info.radius * 8,
  };
}
