import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanContent } from "../packages/core/src/content/scan.ts";

test("scanContent: 规范化 categories/tags/aliases（去空格、去重、兼容 category）", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-scan-frontmatter-"));
  try {
    await fs.mkdir(path.join(dir, "docs"), { recursive: true });

    await fs.writeFile(
      path.join(dir, "docs", "index.md"),
      [
        "---",
        "title: Home",
        "category:  后端  ",
        "categories:",
        "  - 后端",
        "  - K8s",
        "tags: redis",
        "aliases:",
        "  - JWT",
        "  -  JWT  ",
        "---",
        "# Home"
      ].join("\n"),
      "utf8"
    );

    const config = {
      contentDir: dir,
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" }
    };

    const index = await scanContent(config, { includeDrafts: true });
    const entry = index.entriesByRoute.get("/");
    assert.ok(entry);

    assert.deepEqual(entry.tags, ["redis"]);
    assert.deepEqual(entry.aliases, ["JWT"]);
    assert.deepEqual(entry.categories, ["后端", "K8s"]);
    assert.equal(entry.category, "后端");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

