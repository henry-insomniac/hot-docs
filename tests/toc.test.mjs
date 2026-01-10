import assert from "node:assert/strict";
import test from "node:test";

import { renderMarkdownToPage } from "../packages/core/src/render/markdown.ts";

test("renderMarkdownToPage: 生成 TOC（忽略 h1）", async () => {
  const md = `---\ntitle: T\n---\n# T\n\n## A\n\n### B\n\n#### C\n`;
  const result = await renderMarkdownToPage(md);

  assert.equal(typeof result.html, "string");
  assert.equal(Array.isArray(result.toc), true);
  assert.deepEqual(
    result.toc.map((i) => i.level),
    [2, 3, 4]
  );
  assert.equal(result.toc[0].title, "A");
});

