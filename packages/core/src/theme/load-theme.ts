import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import type { HotDocsConfig } from "../types.js";
import { DEFAULT_THEME_CSS } from "./default-theme.js";

type LoadThemeCssOptions = {
  cwd?: string;
};

type ThemeManifest = {
  type: "theme";
  apiVersion: "1" | 1;
  style: string;
};

export async function loadThemeCss(config: HotDocsConfig, options: LoadThemeCssOptions = {}): Promise<string> {
  const cwd = options.cwd ?? process.cwd();

  const themeName = config.theme?.name?.trim();
  const themeCss = themeName ? await loadThemeCssFromPackage(themeName, cwd) : "";
  const tokensCss = themeTokensToCss(config.theme?.tokens);

  return [DEFAULT_THEME_CSS, themeCss, tokensCss].filter(Boolean).join("\n\n");
}

async function loadThemeCssFromPackage(themeName: string, cwd: string): Promise<string> {
  if (themeName === "default") return "";

  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve(`${themeName}/package.json`, { paths: [cwd] });

  const raw = await fs.readFile(pkgJsonPath, "utf8");
  const pkg = JSON.parse(raw) as { hotDocs?: ThemeManifest };
  const manifest = pkg.hotDocs;

  if (!manifest || manifest.type !== "theme" || !manifest.apiVersion || !manifest.style) {
    throw new Error(`主题包 ${themeName} 缺少有效的 package.json#hotDocs（type=theme/apiVersion=1/style）`);
  }
  if (!(manifest.apiVersion === "1" || manifest.apiVersion === 1)) {
    throw new Error(`主题包 ${themeName} apiVersion 不兼容：${String(manifest.apiVersion)}`);
  }

  const themeRoot = path.dirname(pkgJsonPath);
  const cssPath = path.resolve(themeRoot, manifest.style);
  return await fs.readFile(cssPath, "utf8");
}

function themeTokensToCss(tokens: Record<string, string> | undefined): string {
  if (!tokens) return "";
  const entries = Object.entries(tokens).filter(([, v]) => typeof v === "string" && v.trim());
  if (entries.length === 0) return "";

  const lines = entries.map(([k, v]) => `${tokenKeyToCssVar(k)}:${v.trim()};`);
  return `:root{${lines.join("")}}`;
}

function tokenKeyToCssVar(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "--hd-unknown";
  if (trimmed.startsWith("--")) return trimmed;

  const kebab = trimmed
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/(\\D)(\\d+)/g, "$1-$2")
    .toLowerCase();

  return `--hd-${kebab}`;
}

