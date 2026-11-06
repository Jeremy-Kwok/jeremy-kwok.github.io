import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    output: "export",
    // Static hosts serve /projects/iris/index.html for /projects/iris/.
    trailingSlash: true,
    // No image optimization server in a static export.
    images: { unoptimized: true },
    // Pages named page.dev.tsx (the CAD lab at /lab/cad/) exist only under
    // `next dev`, so they never reach the static export.
    pageExtensions:
      phase === PHASE_DEVELOPMENT_SERVER ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  };
}
