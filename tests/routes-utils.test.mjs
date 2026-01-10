import assert from "node:assert/strict";
import test from "node:test";

import { joinUrlPath, toRoutePath } from "../packages/core/src/utils/routes.ts";

test("routes utils: joinUrlPath/toRoutePath", () => {
  assert.equal(joinUrlPath("/", ""), "/");
  assert.equal(joinUrlPath("/blog", "a/b"), "/blog/a/b");
  assert.equal(joinUrlPath("/blog/", "a/b"), "/blog/a/b");

  assert.equal(toRoutePath("/", "index.md"), "/");
  assert.equal(toRoutePath("/", "guide/index.md"), "/guide");
  assert.equal(toRoutePath("/", "guide/intro.md"), "/guide/intro");
  assert.equal(toRoutePath("/blog", "hello-world.md"), "/blog/hello-world");
});

