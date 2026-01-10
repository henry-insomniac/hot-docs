import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanContent } from "../packages/core/src/content/scan.ts";

test("scanContent: draft filtering", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-scan-"));
  try {
    await fs.mkdir(path.join(dir, "docs"), { recursive: true });
    await fs.mkdir(path.join(dir, "blog"), { recursive: true });

    await fs.writeFile(path.join(dir, "docs", "index.md"), "---\ntitle: Docs\n---\n# Docs\n", "utf8");
    await fs.writeFile(path.join(dir, "blog", "draft.md"), "---\ntitle: Draft\ndraft: true\n---\n# Draft\n", "utf8");
    await fs.writeFile(path.join(dir, "blog", "post.md"), "---\ntitle: Post\ndraft: false\n---\n# Post\n", "utf8");

    const config = {
      contentDir: dir,
      collections: {
        docs: { dir: "docs", routeBase: "/", type: "docs" },
        blog: { dir: "blog", routeBase: "/blog", type: "blog" }
      },
      site: { title: "t", base: "/" }
    };

    const indexNoDrafts = await scanContent(config, { includeDrafts: false });
    assert.equal(indexNoDrafts.entriesByRoute.has("/blog/draft"), false);
    assert.equal(indexNoDrafts.entriesByRoute.has("/blog/post"), true);

    const indexWithDrafts = await scanContent(config, { includeDrafts: true });
    assert.equal(indexWithDrafts.entriesByRoute.has("/blog/draft"), true);
    assert.equal(indexWithDrafts.entriesByRoute.has("/blog/post"), true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

