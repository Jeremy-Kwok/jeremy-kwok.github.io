import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import type { CadProject } from '@/lib/cad/schema';
import { stateAt, type ScalarState } from '@/lib/cad/phases';
import { CAD_FOV, analyzeModel, applyPose, cameraPose, fitDistance, type CameraPose, type ModelInfo } from '@/lib/cad/timeline';

// One scene, used twice: headless Chrome renders the video's frames from it
// (scripts/cad/render-page.ts) and the 3D view on the site drives it live
// (lib/cad/explorer.ts). Same file, same lights, same camera math, so the 3D
// view opens on exactly the frame the video was showing.
//
// Lighting and edge settings are Enport's (lib/cadScene.ts there), where they
// were measured against real STEP colors rather than eyeballed.

/** The page background (--color-paper), so the video and the canvas sit flush in the frame. */
export const PAPER = '#f1f2f1';
const INK = 0x141719;
const ENVIRONMENT_INTENSITY = 0.4;
const KEY_LIGHT_INTENSITY = 0.65;
const EDGE_ANGLE_DEG = 30;
const EDGE_TRIANGLE_BUDGET = 400_000;
// Enport stops at 60k segments, where a dense machined model turns solid black at
// thumbnail size. Laser-cut and printed parts are mostly outlines: BlockParty is
// 64k and reads cleanly at video size, so this allows twice that.
const EDGE_SEGMENT_BUDGET = 120_000;
/** Slightly translucent, so dense areas read as linework rather than a black mass. */
const EDGE_OPACITY = 0.75;

export interface StageOptions {
  canvas: HTMLCanvasElement;
  project: CadProject;
  modelUrl: string;
  width: number;
  height: number;
  pixelRatio: number;
  /** Needed when frames are read back from the canvas (the video renderer). */
  preserveDrawingBuffer?: boolean;
  onProgress?: (fraction: number) => void;
}

export interface Stage {
  readonly info: ModelInfo;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  /** Poses the parts for second t and returns the state used. */
  setTime(t: number): ScalarState;
  /** The video's camera at second t. */
  cameraPoseAt(t: number): CameraPose;
  /** Moves the camera to the video's camera at second t. */
  cameraTo(t: number): void;
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

// Feature edges, as in a CAD viewport. Skipped above the budgets, where the
// lines stop describing the model and start hiding it.
function addFeatureEdges(root: THREE.Object3D, material: THREE.Material): void {
  const meshes: THREE.Mesh[] = [];
  let triangles = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      meshes.push(mesh);
      const g = mesh.geometry;
      triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
  });
  if (triangles > EDGE_TRIANGLE_BUDGET) return;
  const built: { mesh: THREE.Mesh; edges: THREE.EdgesGeometry }[] = [];
  let segments = 0;
  for (const mesh of meshes) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, EDGE_ANGLE_DEG);
    segments += edges.attributes.position.count / 2;
    built.push({ mesh, edges });
  }
  if (segments > EDGE_SEGMENT_BUDGET) {
    for (const { edges } of built) edges.dispose();
    return;
  }
  for (const { mesh, edges } of built) mesh.add(new THREE.LineSegments(edges, material));
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const drawable = obj as THREE.Mesh | THREE.LineSegments;
    if ('geometry' in drawable && drawable.geometry) drawable.geometry.dispose();
    const material = (drawable as THREE.Mesh).material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}

export async function createStage(opts: StageOptions): Promise<Stage> {
  const { canvas, project } = opts;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(opts.pixelRatio);
  renderer.setSize(opts.width, opts.height, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAPER);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(CAD_FOV, opts.width / opts.height, 0.1, 1000);
  // Key light rides with the camera (light and target both parented), so the
  // model never turns into an unlit silhouette from any angle.
  const keyLight = new THREE.DirectionalLight(0xffffff, KEY_LIGHT_INTENSITY);
  keyLight.position.set(0.4, 0.8, 1);
  keyLight.target.position.set(0, 0, -1);
  camera.add(keyLight, keyLight.target);
  scene.add(camera);

  // If loading or analysis fails (a 404, offline, a bad file), free the GPU
  // context now: a visitor can retry, and each failed try would otherwise leak one.
  let gltf: Awaited<ReturnType<GLTFLoader['loadAsync']>>;
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    gltf = await loader.loadAsync(opts.modelUrl, (e) => {
      if (opts.onProgress && e.total > 0) opts.onProgress(Math.min(1, e.loaded / e.total));
    });
  } catch (err) {
    envTarget.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw err;
  }
  const model = gltf.scene;
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      // Pushes faces back a hair so the edge lines on the same plane don't z-fight.
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
    }
  });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: EDGE_OPACITY });
  addFeatureEdges(model, edgeMaterial);
  scene.add(model);

  let info: ReturnType<typeof analyzeModel>;
  try {
    info = analyzeModel(model, project);
  } catch (err) {
    disposeTree(model);
    edgeMaterial.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw err;
  }
  let fits = fitDistance(info, project, opts.width / opts.height);

  const stage: Stage = {
    info,
    camera,
    renderer,
    setTime(t) {
      const state = stateAt(project, t);
      applyPose(info, state);
      return state;
    },
    cameraPoseAt(t) {
      return cameraPose(info, project, fits, t, stateAt(project, t));
    },
    cameraTo(t) {
      const pose = stage.cameraPoseAt(t);
      camera.position.copy(pose.position);
      camera.near = pose.near;
      camera.far = pose.far;
      camera.lookAt(pose.target);
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    setSize(width, height) {
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      fits = fitDistance(info, project, width / height);
    },
    dispose() {
      disposeTree(model);
      edgeMaterial.dispose();
      envTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return stage;
}
