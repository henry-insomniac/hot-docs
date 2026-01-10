import assert from "node:assert/strict";
import test from "node:test";

import { buildDocsNavTree } from "../packages/core/src/content/scan.ts";

test("docs nav tree: order + nesting", () => {
  const nav = buildDocsNavTree("/", [
    mkEntry("/guide/intro", "Intro", 2),
    mkEntry("/guide/config", "Config", 1),
    mkEntry("/", "Home", 0),
    mkEntry("/examples/markdown", "Markdown", 3)
  ]);

  assert.equal(nav.type, "dir");
  assert.equal(Array.isArray(nav.children), true);

  const pages = flatten(nav).filter((n) => n.type === "page");
  const titles = pages.map((p) => p.title);
  assert.deepEqual(titles, ["Home", "Config", "Intro", "Markdown"]);
});

function mkEntry(routePath, title, order) {
  return {
    id: `docs:${routePath}`,
    collection: "docs",
    relativePath: routePath === "/" ? "index.md" : `${routePath.replace(/^\//, "")}.md`,
    routePath,
    title,
    order,
    mtimeMs: Date.now(),
    hash: "deadbeef"
  };
}

function flatten(node) {
  const out = [node];
  for (const c of node.children ?? []) out.push(...flatten(c));
  return out;
}

