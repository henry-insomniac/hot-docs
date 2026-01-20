import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { scanContent } from "../packages/core/src/content/scan.ts";
import { listBlogVirtualPages } from "../packages/core/src/blog/virtual-pages.ts";

test("blog virtual pages: cover src rewrite + unsafe url filtering", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-blog-cover-"));
  const contentDir = path.join(cwd, "content");

  try {
    await fs.mkdir(path.join(contentDir, "docs"), { recursive: true });
    await fs.mkdir(path.join(contentDir, "blog", "assets"), { recursive: true });

    await fs.writeFile(path.join(contentDir, "docs", "index.md"), "---\ntitle: Home\n---\n# Home\n", "utf8");

    await fs.writeFile(path.join(contentDir, "blog", "assets", "cover.svg"), "<svg />", "utf8");

    await fs.writeFile(
      path.join(contentDir, "blog", "relative.md"),
      "---\n" +
        "title: Relative\n" +
        "date: 2026-01-10\n" +
        "cover: ./assets/cover.svg\n" +
        "coverAlt: Relative cover\n" +
        "summary: s\n" +
        "---\n" +
        "# Relative\n",
      "utf8"
    );

    await fs.writeFile(
      path.join(contentDir, "blog", "absolute.md"),
      "---\n" +
        "title: Absolute\n" +
        "date: 2026-01-09\n" +
        "cover: /static/cover.png\n" +
        "---\n" +
        "# Absolute\n",
      "utf8"
    );

    await fs.writeFile(
      path.join(contentDir, "blog", "already-based.md"),
      "---\n" +
        "title: Already Based\n" +
        "date: 2026-01-08\n" +
        "cover: /docs/static/already.png\n" +
        "---\n" +
        "# Already Based\n",
      "utf8"
    );

    await fs.writeFile(
      path.join(contentDir, "blog", "unsafe.md"),
      "---\n" +
        "title: Unsafe\n" +
        "date: 2026-01-07\n" +
        "cover: javascript:alert(1)\n" +
        "---\n" +
        "# Unsafe\n",
      "utf8"
    );

    await fs.writeFile(
      path.join(contentDir, "blog", "traversal.md"),
      "---\n" +
        "title: Traversal\n" +
        "date: 2026-01-06\n" +
        "cover: ../secret.png\n" +
        "---\n" +
        "# Traversal\n",
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

    const index = await scanContent(config, { includeDrafts: true });
    const pages = listBlogVirtualPages(config, index, { pageSize: 10 });
    const blogIndex = pages.find((p) => p.routePath === "/blog");
    assert.ok(blogIndex, "missing /blog page");

    const html = blogIndex.html;
    assert.ok(html.includes('src="/docs/blog/assets/cover.svg"'));
    assert.ok(html.includes('alt="Relative cover"'));
    assert.ok(html.includes('src="/docs/static/cover.png"'));
    assert.ok(html.includes('src="/docs/static/already.png"'));
    assert.equal(html.includes('src="/docs/docs/static/already.png"'), false);
    assert.equal(html.includes("javascript:alert(1)"), false);
    assert.equal(html.includes("../secret.png"), false);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

