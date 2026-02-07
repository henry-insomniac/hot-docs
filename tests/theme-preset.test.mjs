import assert from "node:assert/strict";
import test from "node:test";

import { loadThemeCss } from "../packages/core/src/theme/load-theme.ts";

test("loadThemeCss: 支持 palettePreset 并允许显式 token 覆盖", async () => {
  const css = await loadThemeCss(
    {
      contentDir: "./content",
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      theme: {
        name: "@hot-docs/theme-neon-dark",
        tokens: {
          palettePreset: "graphite-cyan",
          accent: "#123456"
        }
      }
    },
    { cwd: process.cwd() }
  );

  assert.ok(css.includes("--hd-bg-0:#0c0f14;"));
  assert.ok(css.includes("--hd-glow-1:rgba(56,189,248,.12);"));
  assert.ok(css.includes("--hd-accent:#123456;"));
});

test("loadThemeCss: notion-light 预设可生效", async () => {
  const css = await loadThemeCss(
    {
      contentDir: "./content",
      collections: { docs: { dir: "docs", routeBase: "/", type: "docs" } },
      site: { title: "t", base: "/" },
      theme: {
        name: "@hot-docs/theme-neon-dark",
        tokens: {
          palettePreset: "notion-light"
        }
      }
    },
    { cwd: process.cwd() }
  );

  assert.ok(css.includes("--hd-bg-0:#f7f7f5;"));
  assert.ok(css.includes("--hd-accent:#2f76ff;"));
});
