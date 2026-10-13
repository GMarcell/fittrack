import path from "node:path";
import type { NextConfig } from "next";

/*
 * Turbopack infers the workspace root from the nearest lockfile. This machine
 * has stray lockfiles in the home directory, so Turbopack otherwise picks the
 * home directory and watches every sibling project, exhausting the OS
 * file-watch limit. Pin the root to this project instead.
 * Docs: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
