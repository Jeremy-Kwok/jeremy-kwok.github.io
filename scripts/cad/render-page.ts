// Browser entry for the video renderer: scripts/cad/build.ts bundles this with
// esbuild, serves it with the GLB on localhost, and drives it from headless
// Chrome one frame at a time. It runs the same stage as the site's 3D view.

import type { CadProject } from '@/lib/cad/schema';
import { createStage } from '@/lib/cad/stage';

declare global {
  interface Window {
    __CAD_PROJECT__: CadProject;
    __CAD_SIZE__: { width: number; height: number };
    __cad?: {
      ready: boolean;
      error?: string;
      parts?: number;
      triangles?: number;
      steps?: { label: string; start: number; end: number }[];
      /** Draws second t and returns that exact frame as a PNG data URL. */
      frame?: (t: number) => string;
    };
  }
}

async function main() {
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const { width, height } = window.__CAD_SIZE__;
  const stage = await createStage({
    canvas,
    project: window.__CAD_PROJECT__,
    modelUrl: '/model.glb',
    width,
    height,
    pixelRatio: window.devicePixelRatio,
    preserveDrawingBuffer: true,
  });
  window.__cad = {
    ready: true,
    parts: stage.info.parts.length,
    triangles: stage.info.triangles,
    steps: stage.info.steps,
    frame(t: number) {
      stage.setTime(t);
      stage.cameraTo(t);
      stage.render();
      // Read the drawing buffer directly. A page screenshot can capture the
      // compositor's previous frame, which put the video a frame or two behind
      // its own timeline (invisible when still, a visible jump at the 3D handoff
      // mid-move). preserveDrawingBuffer keeps this frame readable here.
      return canvas.toDataURL('image/png');
    },
  };
}

main().catch((err: unknown) => {
  window.__cad = { ready: false, error: err instanceof Error ? (err.stack ?? err.message) : String(err) };
});
