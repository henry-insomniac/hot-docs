import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBase, stripBase, toPageHref, withBase } from "../packages/core/src/utils/base.ts";

test("base utils: withBase/stripBase/toPageHref", () => {
  assert.equal(normalizeBase(""), "/");
  assert.equal(normalizeBase("/docs"), "/docs/");
  assert.equal(withBase("/", "/assets/theme.css"), "/assets/theme.css");
  assert.equal(withBase("/docs/", "/assets/theme.css"), "/docs/assets/theme.css");
  assert.equal(withBase("/docs/", "/"), "/docs/");

  assert.equal(stripBase("/", "/guide/intro/"), "/guide/intro/");
  assert.equal(stripBase("/docs/", "/docs"), "/");
  assert.equal(stripBase("/docs/", "/docs/guide/intro/"), "/guide/intro/");

  assert.equal(toPageHref("/", "/"), "/");
  assert.equal(toPageHref("/", "/guide/intro"), "/guide/intro/");
  assert.equal(toPageHref("/docs/", "/"), "/docs/");
  assert.equal(toPageHref("/docs/", "/guide/intro"), "/docs/guide/intro/");
});

