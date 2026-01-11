import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("buildStaticSite: 插件 virtual pages（routes.pages）会输出到 dist", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-plugin-pages-"));
  const contentDir = path.join(cwd, "content");
  const outDir = path.join(cwd, "dist");

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(contentDir, "docs", "index.md"), "---\ntitle: Home\n---\n# Home\n", "utf8");

    await fs.mkdir(path.join(cwd, "plugins"), { recursive: true });
    const pluginPath = path.join(cwd, "plugins", "virtual-pages.mjs");
    await fs.writeFile(
      pluginPath,
      `export default {\n` +
        `  name: "test-virtual-pages",\n` +
        `  apiVersion: 1,\n` +
        `  routes: {\n` +
        `    pages: () => [\n` +
        `      { routePath: "/extra", title: "Extra", html: "<h1>Extra</h1><p>from plugin</p>" }\n` +
        `    ]\n` +
        `  }\n` +
        `};\n`,
      "utf8"
    );

    const config = {
      contentDir,
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      plugins: [{ path: "./plugins/virtual-pages.mjs" }]
    };

    const result = await buildStaticSite(config, { cwd, outDir, includeDrafts: true, clean: true });
    assert.equal(result.pages >= 2, true);

    const html = await fs.readFile(path.join(outDir, "extra", "index.html"), "utf8");
    assert.ok(html.includes("<h1>Extra</h1>"));
    assert.ok(html.includes("from plugin"));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

