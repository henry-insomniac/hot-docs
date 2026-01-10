import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../packages/core/src/config/load-config.ts";

test("loadConfig: 配置必须是对象", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-config-"));
  try {
    await fs.writeFile(path.join(cwd, "hot-docs.config.json"), JSON.stringify([]), "utf8");
    await assert.rejects(() => loadConfig({ cwd }), /配置必须导出一个对象/);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test("loadConfig: site.base 必须是字符串", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-config-"));
  try {
    await fs.writeFile(
      path.join(cwd, "hot-docs.config.json"),
      JSON.stringify({ site: { base: 123 } }),
      "utf8"
    );
    await assert.rejects(() => loadConfig({ cwd }), /site\.base 必须是字符串/);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test("loadConfig: plugins 必须是数组，且 ref 需要 name/path", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-config-"));
  try {
    await fs.writeFile(path.join(cwd, "hot-docs.config.json"), JSON.stringify({ plugins: {} }), "utf8");
    await assert.rejects(() => loadConfig({ cwd }), /plugins 必须是数组/);

    await fs.writeFile(
      path.join(cwd, "hot-docs.config.json"),
      JSON.stringify({ plugins: [{ name: "", options: {} }] }),
      "utf8"
    );
    await assert.rejects(() => loadConfig({ cwd }), /plugins\[0\]\.name 必须是非空字符串/);

    await fs.writeFile(
      path.join(cwd, "hot-docs.config.json"),
      JSON.stringify({ plugins: [{ name: "@x", path: "./p" }] }),
      "utf8"
    );
    await assert.rejects(() => loadConfig({ cwd }), /不能同时包含 name 与 path/);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test("loadConfig: normalizeBase 生效", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "hot-docs-config-"));
  try {
    await fs.writeFile(
      path.join(cwd, "hot-docs.config.json"),
      JSON.stringify({
        contentDir: "./content",
        collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
        site: { title: "t", base: "/docs" }
      }),
      "utf8"
    );

    const config = await loadConfig({ cwd });
    assert.equal(config.site.base, "/docs/");
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
