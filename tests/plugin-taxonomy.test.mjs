import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("plugin-taxonomy: 生成分类索引页与分类详情页", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-plugin-taxonomy-"));
  const contentDir = path.join(tmp, "content");
  const outDir = path.join(tmp, "dist");
  const repoCwd = process.cwd();

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.mkdir(path.join(contentDir, "blog"), { recursive: true });

    await fs.writeFile(
      path.join(contentDir, "docs", "index.md"),
      "---\ntitle: Home\nsummary: docs home\ncategories: [Guide]\n---\n# Home\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(contentDir, "docs", "api.md"),
      "---\ntitle: API Doc\ncategory: API\n---\n# API\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(contentDir, "blog", "post.md"),
      "---\ntitle: Blog Post\ndate: 2026-02-01\ncategories: [Guide]\n---\n# Post\n",
      "utf8"
    );

    const config = {
      contentDir,
      collections: {
        docs: { dir: "docs", routeBase: "/", type: "docs" },
        blog: { dir: "blog", routeBase: "/blog", type: "blog" }
      },
      site: { title: "t", base: "/" },
      plugins: [{ name: "@hot-docs/plugin-taxonomy", options: { routeBase: "/categories", includeCollections: ["docs", "blog"] } }]
    };

    await buildStaticSite(config, { cwd: repoCwd, outDir, includeDrafts: true, clean: true });

    await assertFile(path.join(outDir, "categories", "index.html"));
    await assertFile(path.join(outDir, "categories", "guide", "index.html"));
    await assertFile(path.join(outDir, "categories", "api", "index.html"));

    const indexHtml = await fs.readFile(path.join(outDir, "categories", "index.html"), "utf8");
    assert.ok(indexHtml.includes("Guide"));
    assert.ok(indexHtml.includes("API"));
    assert.ok(indexHtml.includes("(2)"));

    const homeHtml = await fs.readFile(path.join(outDir, "index.html"), "utf8");
    assert.ok(homeHtml.includes('href="/categories/"'));
    assert.ok(!homeHtml.includes('href="/search/"'));

    const guideHtml = await fs.readFile(path.join(outDir, "categories", "guide", "index.html"), "utf8");
    assert.ok(guideHtml.includes('href="/blog/post/"'));
    assert.ok(guideHtml.includes('href="/"'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

async function assertFile(p) {
  const stat = await fs.stat(p);
  assert.equal(stat.isFile(), true, `missing file: ${p}`);
}
