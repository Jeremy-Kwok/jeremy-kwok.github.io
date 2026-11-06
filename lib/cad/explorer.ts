import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CadProject } from '@/lib/cad/schema';
import { duration as timelineDuration } from '@/lib/cad/phases';
import { createStage } from '@/lib/cad/stage';

// The live 3D view behind "Explore in 3D". Imperative on purpose: the React
// component (components/cad/CadShowcase.tsx) owns the buttons and loads this
// module with a dynamic import, so three.js is only downloaded by someone who
// asks for the 3D view.

export interface ExplorerOptions {
  canvas: HTMLCanvasElement;
  project: CadProject;
  modelUrl: string;
  /** The video's current time; the 3D view opens on this exact frame. */
  startTime: number;
  onProgress?: (fraction: number) => void;
  onTime?: (t: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

export interface Explorer {
  readonly duration: number;
  setTime(t: number): void;
  play(): void;
  pause(): void;
  /** Plays from start to end, then pauses (a chapter). */
  playRange(start: number, end: number): void;
  /** Back to the video's camera at the current time. */
  resetView(): void;
  rotateBy(azimuthDeg: number, elevationDeg: number): void;
  zoomBy(factor: number): void;
  dispose(): void;
}

export async function createExplorer(opts: ExplorerOptions): Promise<Explorer> {
  const { canvas, project } = opts;
  const rect = canvas.getBoundingClientRect();
  const stage = await createStage({
    canvas,
    project,
    modelUrl: opts.modelUrl,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    onProgress: opts.onProgress,
  });
  const total = timelineDuration(project.timeline);
  const camera = stage.camera;
  const radius = stage.info.radius;

  let time = Math.min(Math.max(0, opts.startTime), total);
  stage.setTime(time);
  stage.cameraTo(time);
  const start = stage.cameraPoseAt(time);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.target.copy(start.target);
  controls.minDistance = radius * 0.2;
  controls.maxDistance = start.position.distanceTo(start.target) * 4;
  controls.update();

  let dirty = true;
  let playing = false;
  let rangeEnd: number | null = null;
  let last = performance.now();

  // The far plane follows the zoom, so zooming out never clips the model away.
  const fitClipping = () => {
    const d = camera.position.distanceTo(controls.target);
    camera.near = Math.max(d * 0.005, radius * 1e-4);
    camera.far = d * 4 + radius * 8;
    camera.updateProjectionMatrix();
  };
  controls.addEventListener('change', () => {
    fitClipping();
    dirty = true;
  });

  const setPlaying = (next: boolean) => {
    if (playing === next) return;
    playing = next;
    if (!next) rangeEnd = null;
    last = performance.now();
    opts.onPlayingChange?.(next);
  };

  const resize = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    stage.setSize(r.width, r.height);
    dirty = true;
  });
  resize.observe(canvas);

  let raf = requestAnimationFrame(function loop(now) {
    raf = requestAnimationFrame(loop);
    // A click can stamp `last` after this frame's timestamp, so clamp at 0 too.
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (playing) {
      time += dt;
      if (rangeEnd !== null && time >= rangeEnd) {
        time = rangeEnd;
        setPlaying(false);
      } else if (time >= total) {
        time -= total;
      }
      stage.setTime(time);
      opts.onTime?.(time);
      dirty = true;
    }
    // update() keeps damping going after the pointer lets go.
    if (controls.update()) dirty = true;
    if (dirty) {
      stage.render();
      dirty = false;
    }
  });

  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();

  return {
    duration: total,
    setTime(t) {
      time = Math.min(Math.max(0, t), total);
      stage.setTime(time);
      opts.onTime?.(time);
      dirty = true;
    },
    play() {
      if (time >= total - 1e-3) time = 0;
      rangeEnd = null;
      setPlaying(true);
    },
    pause() {
      setPlaying(false);
    },
    playRange(from, to) {
      time = from;
      stage.setTime(time);
      opts.onTime?.(time);
      setPlaying(true);
      rangeEnd = to;
      dirty = true;
    },
    resetView() {
      const pose = stage.cameraPoseAt(time);
      camera.position.copy(pose.position);
      controls.target.copy(pose.target);
      controls.update();
      fitClipping();
      dirty = true;
    },
    rotateBy(azimuthDeg, elevationDeg) {
      offset.copy(camera.position).sub(controls.target);
      spherical.setFromVector3(offset);
      spherical.theta += THREE.MathUtils.degToRad(azimuthDeg);
      spherical.phi = Math.min(Math.PI - 0.05, Math.max(0.05, spherical.phi - THREE.MathUtils.degToRad(elevationDeg)));
      offset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      dirty = true;
    },
    zoomBy(factor) {
      offset.copy(camera.position).sub(controls.target);
      const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor));
      offset.setLength(d);
      camera.position.copy(controls.target).add(offset);
      controls.update();
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(raf);
      resize.disconnect();
      controls.dispose();
      stage.dispose();
    },
  };
}
