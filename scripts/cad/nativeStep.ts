import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { OcctMesh, OcctNode, OcctResult } from 'occt-import-js';

// Reads a STEP with native OpenCascade (scripts/cad/occt_native.py) for showcases
// with `mesher: 'native'`, and hands back the same shape occt-import-js returns.
// Needs a Python with the cadquery-ocp wheel: .cad-venv/ in this repo
// (gitignored), or CAD_PYTHON pointing at one.

export const NATIVE_SETUP = 'python3 -m venv .cad-venv && .cad-venv/bin/pip install cadquery-ocp==8.0.1.1.0';

/** Native OpenCascade has no WebAssembly memory ceiling, so it can afford a finer mesh than occt-import-js. */
export const NATIVE_TESSELLATION = { linearRatio: 0.002, angular: 0.3 } as const;

function findPython(): string {
  const candidates = [process.env.CAD_PYTHON, path.join(process.cwd(), '.cad-venv', 'bin', 'python')];
  const found = candidates.find((p): p is string => !!p && fs.existsSync(p));
  if (!found) {
    throw new Error(
      `This showcase uses mesher: 'native', which needs Python with native OpenCascade. Set it up once:\n  ${NATIVE_SETUP}\n` +
        `or set CAD_PYTHON to a Python that has cadquery-ocp installed.`
    );
  }
  return found;
}

interface NativeMesh {
  name: string;
  color: [number, number, number] | null;
  position: [number, number];
  normal: [number, number];
  index: [number, number];
}

export function readStepNative(stepPath: string): OcctResult {
  const python = findPython();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cad-native-'));
  try {
    const script = path.join(process.cwd(), 'scripts', 'cad', 'occt_native.py');
    const run = spawnSync(
      python,
      ['-I', script, stepPath, out, String(NATIVE_TESSELLATION.linearRatio), String(NATIVE_TESSELLATION.angular)],
      { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
    );
    if (run.status !== 0) {
      const err = run.stderr.toString().trim().split('\n').slice(-8).join('\n');
      throw new Error(`Native OpenCascade failed on ${path.basename(stepPath)}:\n${err || run.error?.message || 'no output'}`);
    }
    const parsed = JSON.parse(fs.readFileSync(path.join(out, 'mesh.json'), 'utf-8')) as { root: OcctNode; meshes: NativeMesh[] };
    const bin = fs.readFileSync(path.join(out, 'mesh.bin'));
    // Copy into an aligned buffer so the typed arrays below can view it directly.
    const buffer = new ArrayBuffer(bin.byteLength);
    new Uint8Array(buffer).set(bin);
    const meshes: OcctMesh[] = parsed.meshes.map((m) => ({
      name: m.name,
      color: m.color ?? undefined,
      attributes: {
        position: { array: new Float32Array(buffer, m.position[0], m.position[1]) },
        normal: { array: new Float32Array(buffer, m.normal[0], m.normal[1]) },
      },
      index: { array: new Uint32Array(buffer, m.index[0], m.index[1]) },
    }));
    return { success: true, root: parsed.root, meshes };
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}
