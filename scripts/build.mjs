import fs from "node:fs/promises";
import path from "node:path";

import * as esbuild from "esbuild";

const pkg = process.argv[2];
if (!pkg) {
  console.error("Usage: node scripts/build.mjs <package-dir-name>");
  process.exit(1);
}

const pkgDir = path.join(process.cwd(), "packages", pkg);
const pkgJsonPath = path.join(pkgDir, "package.json");
await fs.access(pkgJsonPath);

const entry = path.join(pkgDir, "src", "index.ts");
const out = path.join(pkgDir, "dist", "index.js");
await fs.mkdir(path.dirname(out), { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  outfile: out,
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: true,
  target: "node20",
  external: ["esbuild"] // avoid bundling itself
});
