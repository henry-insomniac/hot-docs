import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("plugin-search: 生成 /search/ 页面与 search-index.json", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-plugin-search-"));
  const contentDir = path.join(tmp, "content");
  const outDir = path.join(tmp, "dist");
  const repoCwd = process.cwd();

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(contentDir, "docs", "index.md"),
      "---\ntitle: Home\nsummary: hello\ncategories: [Guide]\n---\n# Home\n\n## Quick Start\n\nSearch plugin section index.\n",
      "utf8"
    );

    const config = {
      contentDir,
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      plugins: [{ name: "@hot-docs/plugin-search", options: { outFile: "search-index.json" } }]
    };

    await buildStaticSite(config, { cwd: repoCwd, outDir, includeDrafts: true, clean: true });

    await assertFile(path.join(outDir, "search", "index.html"));
    await assertFile(path.join(outDir, "search-index.json"));

    const json = JSON.parse(await fs.readFile(path.join(outDir, "search-index.json"), "utf8"));
    assert.equal(json.version, 2);
    assert.equal(Array.isArray(json.items), true);
    assert.equal(json.items.some((it) => it.routePath === "/" && it.title === "Home" && it.kind === "doc"), true);
    assert.equal(json.items.some((it) => it.routePath === "/" && it.kind === "section" && it.anchor === "#quick-start"), true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

async function assertFile(p) {
  const stat = await fs.stat(p);
  assert.equal(stat.isFile(), true, `missing file: ${p}`);
}
