import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static hosts serve /projects/iris/index.html for /projects/iris/.
  trailingSlash: true,
  // No image optimization server in a static export.
  images: { unoptimized: true },
};

export default nextConfig;
