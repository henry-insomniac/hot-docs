import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("buildStaticSite: output paths + base", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-build-"));
  const contentDir = path.join(cwd, "content");
  try {
    await fs.mkdir(path.join(contentDir, "docs", "guide"), { recursive: true });
    await fs.mkdir(path.join(contentDir, "blog"), { recursive: true });

    await fs.writeFile(path.join(contentDir, "docs", "index.md"), "---\ntitle: Home\n---\n# Home\n", "utf8");
    await fs.writeFile(path.join(contentDir, "docs", "guide", "intro.md"), "---\ntitle: Intro\n---\n# Intro\n", "utf8");
    await fs.writeFile(path.join(contentDir, "docs", "guide", "asset.txt"), "hello", "utf8");

    await fs.writeFile(
      path.join(contentDir, "blog", "post.md"),
      "---\ntitle: Post\ndate: 2026-01-10\ndraft: false\n---\n# Post\n",
      "utf8"
    );

    const config = {
      contentDir,
      collections: {
        docs: { dir: "docs", routeBase: "/", type: "docs" },
        blog: { dir: "blog", routeBase: "/blog", type: "blog" }
      },
      site: { title: "t", base: "/docs/" }
    };

    const result = await buildStaticSite(config, { cwd, outDir: "dist", includeDrafts: false, clean: true });
    assert.equal(result.outDir, path.join(cwd, "dist"));
    assert.equal(result.pages >= 4, true);
    assert.equal(result.assets >= 1, true);

    await assertFile(path.join(cwd, "dist", "index.html"));
    await assertFile(path.join(cwd, "dist", "guide", "intro", "index.html"));
    await assertFile(path.join(cwd, "dist", "assets", "theme.css"));
    await assertFile(path.join(cwd, "dist", "guide", "asset.txt"));
    await assertFile(path.join(cwd, "dist", "blog", "index.html"));

    const html = await fs.readFile(path.join(cwd, "dist", "index.html"), "utf8");
    assert.ok(html.includes('href="/docs/assets/theme.css"'));
    assert.ok(html.includes('id="hd-help-toggle"'));
    assert.ok(html.includes('id="hd-theme-toggle"'));
    assert.ok(html.includes('id="hd-shortcuts-modal"'));
    assert.ok(html.includes('id="hd-runtime-config"'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

async function assertFile(p) {
  const stat = await fs.stat(p);
  assert.equal(stat.isFile(), true, `missing file: ${p}`);
}
