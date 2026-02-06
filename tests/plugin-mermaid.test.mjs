import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildStaticSite } from "../packages/core/src/build/build.ts";

test("plugin-mermaid: 转换 mermaid 代码块并注入运行时脚本", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-plugin-mermaid-"));
  const contentDir = path.join(tmp, "content");
  const outDir = path.join(tmp, "dist");
  const repoCwd = process.cwd();

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(contentDir, "docs", "index.md"),
      "---\ntitle: Mermaid\n---\n# Mermaid\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```js\nconsole.log('ok')\n```\n",
      "utf8"
    );

    const config = {
      contentDir,
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      plugins: [{ name: "@hot-docs/plugin-mermaid" }]
    };

    await buildStaticSite(config, { cwd: repoCwd, outDir, includeDrafts: true, clean: true });

    const html = await fs.readFile(path.join(outDir, "index.html"), "utf8");
    assert.ok(html.includes('class="hd-mermaid"'));
    assert.ok(html.includes('class="mermaid"'));
    assert.ok(html.includes('class="hd-mermaid-fallback" hidden'));
    assert.ok(html.includes('data-hot-docs-mermaid="1"'));
    assert.ok(html.includes("mermaid.esm.min.mjs"));
    assert.ok(html.includes('class="language-js"'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
