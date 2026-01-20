import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("plugin-raw-md: 输出 __raw__/... 并注入下载链接", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-plugin-raw-md-"));
  const contentDir = path.join(tmp, "content");
  const outDir = path.join(tmp, "dist");
  const repoCwd = process.cwd();

  const sourceMd = "---\ntitle: Home\n---\n# Home\n";

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.writeFile(path.join(contentDir, "docs", "index.md"), sourceMd, "utf8");

    const config = {
      contentDir,
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      plugins: ["@hot-docs/plugin-raw-md"]
    };

    await buildStaticSite(config, { cwd: repoCwd, outDir, includeDrafts: true, clean: true });

    const rawPath = path.join(outDir, "__raw__", "docs", "index.md");
    const raw = await fs.readFile(rawPath, "utf8");
    assert.equal(raw, sourceMd);

    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");
    assert.equal(html.includes("hd-raw-md"), true);
    assert.equal(html.includes('/__raw__/docs/index.md'), true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

