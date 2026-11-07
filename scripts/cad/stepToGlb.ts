import occtimportjs, { type OcctMesh, type OcctNode } from 'occt-import-js';
import { Document, NodeIO, type Material, type Node as GltfNode } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import type { CadProject } from '../../lib/cad/schema';
import { matchesAny } from '../../lib/cad/match';
import { readStepNative } from './nativeStep';

// STEP -> GLB for the CAD showcase. OpenCascade (occt-import-js, the same
// converter Enport uses) tessellates the B-rep; each STEP product with geometry
// becomes one "part" node, tagged in extras so the renderer and the 3D view
// can find and move it. Meshopt compression keeps the file small, and three.js
// ships the decoder. (@gltf-transform/functions is deliberately not used: it
// loads sharp for textures at import time, and a CAD mesh has no textures.)

const PART_GREY: [number, number, number] = [0xb3 / 255, 0xb8 / 255, 0xbd / 255];
const ACCENT: [number, number, number] = [0xc2 / 255, 0x3b / 255, 0x22 / 255];

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

// Enport's tessellation settings (lib/cadScene.ts there): fine enough that
// bores read round, coarser for big assemblies where memory matters more.
function tessellation(byteLength: number) {
  const mb = byteLength / (1024 * 1024);
  if (mb > 20) return { linearDeflectionType: 'bounding_box_ratio' as const, linearDeflection: 0.01, angularDeflection: 0.35 };
  if (mb > 5) return { linearDeflectionType: 'bounding_box_ratio' as const, linearDeflection: 0.005, angularDeflection: 0.2 };
  return { linearDeflectionType: 'bounding_box_ratio' as const, linearDeflection: 0.001, angularDeflection: 0.2 };
}

export interface GlbResult {
  glb: Uint8Array;
  parts: number;
  triangles: number;
  /** Every part's path, for writing joint and group rules. */
  partPaths: string[];
}

export async function stepToGlb(step: Uint8Array, project: CadProject, stepPath: string): Promise<GlbResult> {
  await MeshoptEncoder.ready;
  let result;
  if (project.mesher === 'native') {
    result = readStepNative(stepPath);
  } else {
    const occt = await occtimportjs();
    result = occt.ReadStepFile(step, tessellation(step.byteLength));
    if (!result.success) throw new Error('OpenCascade could not read this STEP file.');
    // Past WebAssembly's memory ceiling, occt-import-js reads every part but meshes none of them.
    if (result.meshes.length > 0 && result.meshes.every((m) => m.attributes.position.array.length === 0)) {
      throw new Error(
        `occt-import-js read ${result.meshes.length} parts but meshed none of them: the assembly is too large for\n` +
          `its WebAssembly memory. Add mesher: 'native' to content/cad/${project.slug}.ts to read it with native OpenCascade.`
      );
    }
  }

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('cad');
  const root = doc.createNode('model');
  scene.addChild(root);

  const materials = new Map<string, Material>();
  const material = (srgb: [number, number, number]) => {
    const key = srgb.map((c) => c.toFixed(3)).join(',');
    let m = materials.get(key);
    if (!m) {
      m = doc
        .createMaterial(key)
        .setBaseColorFactor([srgbToLinear(srgb[0]), srgbToLinear(srgb[1]), srgbToLinear(srgb[2]), 1])
        .setMetallicFactor(0.1)
        .setRoughnessFactor(0.6);
      materials.set(key, m);
    }
    return m;
  };

  // Y-up is glTF's convention; a Z-up file turns -90 degrees about X: (x, y, z) -> (x, z, -y).
  const turn = (src: ArrayLike<number>) => {
    const out = new Float32Array(src.length);
    for (let i = 0; i < src.length; i += 3) {
      out[i] = src[i];
      if (project.up === 'z') {
        out[i + 1] = src[i + 2];
        out[i + 2] = -src[i + 1];
      } else {
        out[i + 1] = src[i + 1];
        out[i + 2] = src[i + 2];
      }
    }
    return out;
  };

  let parts = 0;
  let triangles = 0;
  const partPaths: string[] = [];
  const usedPaths = new Map<string, number>();

  const addPrimitive = (mesh: OcctMesh, srgb: [number, number, number]) => {
    let positions = turn(mesh.attributes.position.array);
    let normals = mesh.attributes.normal ? turn(mesh.attributes.normal.array) : null;
    const vertexCount = positions.length / 3;
    const indices = mesh.index ? new Uint32Array(mesh.index.array) : Uint32Array.from({ length: vertexCount }, (_, i) => i);
    // Reorder for the GPU's vertex cache and for a smaller compressed file.
    const [remap, unique] = MeshoptEncoder.reorderMesh(indices, true, true);
    const remapAttr = (src: Float32Array) => {
      const out = new Float32Array(unique * 3);
      for (let i = 0; i < vertexCount; i++) {
        const j = remap[i];
        if (j === 0xffffffff) continue;
        out[j * 3] = src[i * 3];
        out[j * 3 + 1] = src[i * 3 + 1];
        out[j * 3 + 2] = src[i * 3 + 2];
      }
      return out;
    };
    positions = remapAttr(positions);
    if (normals) normals = remapAttr(normals);
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer))
      .setMaterial(material(srgb));
    if (normals) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer));
    triangles += indices.length / 3;
    return prim;
  };

  const visit = (n: OcctNode, parent: GltfNode, parentPath: string) => {
    const name = (n.name || '').trim() || 'part';
    let nodePath = parentPath ? `${parentPath}/${name}` : name;
    // Repeated instances (four of the same bracket) get distinct paths.
    const seen = usedPaths.get(nodePath) ?? 0;
    usedPaths.set(nodePath, seen + 1);
    if (seen > 0) nodePath = `${nodePath}#${seen + 1}`;

    const group = doc.createNode(name);
    parent.addChild(group);

    // Which bodies make up one part. Usually a STEP product owns one body. But an
    // assembly that went through Onshape's SolidWorks import can come out as one
    // product holding a hundred named bodies, each really its own part: split
    // those by body name. Unnamed bodies stay together (one part, several colors).
    const bodies = n.meshes.map((i) => result.meshes[i]).filter((m) => m && m.attributes.position.array.length > 0);
    const named = bodies.length > 1 && bodies.every((m) => (m.name || '').trim() !== '');
    const partsHere: { partName: string; partPath: string; meshes: OcctMesh[] }[] = named
      ? bodies.map((m) => {
          const partName = m.name.trim();
          let partPath = `${nodePath}/${partName}`;
          const k = usedPaths.get(partPath) ?? 0;
          usedPaths.set(partPath, k + 1);
          if (k > 0) partPath = `${partPath}#${k + 1}`;
          return { partName, partPath, meshes: [m] };
        })
      : bodies.length > 0
        ? [{ partName: name, partPath: nodePath, meshes: bodies }]
        : [];

    for (const { partName, partPath, meshes } of partsHere) {
      if (matchesAny(project.hide, partPath)) continue;
      const accent = matchesAny(project.accent, partPath);
      const mesh = doc.createMesh(partName);
      for (const m of meshes) {
        const color = accent ? ACCENT : project.colors === 'cad' && m.color ? m.color : PART_GREY;
        mesh.addPrimitive(addPrimitive(m, color));
      }
      // A separate child, so moving a part never drags a subassembly's other children along.
      group.addChild(doc.createNode(partName).setMesh(mesh).setExtras({ cadPart: true, cadName: partName, cadPath: partPath }));
      parts++;
      partPaths.push(partPath);
    }
    for (const child of n.children ?? []) visit(child, group, nodePath);
  };

  // The root is usually an unnamed wrapper; start the paths at its children.
  if (result.root.meshes.length > 0) visit({ ...result.root, children: [] }, root, '');
  for (const child of result.root.children ?? []) visit(child, root, '');
  if (parts === 0) throw new Error('The STEP file has no visible geometry (or every part is hidden by `hide`).');

  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  const glb = await io.writeBinary(doc);
  return { glb, parts, triangles: Math.round(triangles), partPaths };
}
