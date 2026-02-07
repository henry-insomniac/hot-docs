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

const THEME_PRESETS: Record<string, Record<string, string>> = {
  "immersive-blue": {
    "--hd-bg-0": "#0b1118",
    "--hd-bg-1": "#0f1724",
    "--hd-bg-2": "#142033",
    "--hd-bg-3": "#1b2a40",
    "--hd-fg-0": "#dce6f2",
    "--hd-fg-1": "#9fb0c4",
    "--hd-fg-2": "#7f91a7",
    "--hd-border-0": "rgba(220,230,242,.08)",
    "--hd-border-1": "rgba(220,230,242,.14)",
    "--hd-accent": "#4cc9f0",
    "--hd-accent-2": "#7cffb2",
    "--hd-glow": "rgba(76,201,240,.24)",
    "--hd-glow-1": "rgba(76,201,240,.14)",
    "--hd-glow-2": "rgba(124,255,178,.10)"
  },
  "graphite-cyan": {
    "--hd-bg-0": "#0c0f14",
    "--hd-bg-1": "#111722",
    "--hd-bg-2": "#182235",
    "--hd-bg-3": "#1f2d45",
    "--hd-fg-0": "#e6edf7",
    "--hd-fg-1": "#a6b4c6",
    "--hd-fg-2": "#8fa0b4",
    "--hd-border-0": "rgba(230,237,247,.08)",
    "--hd-border-1": "rgba(230,237,247,.13)",
    "--hd-accent": "#38bdf8",
    "--hd-accent-2": "#a78bfa",
    "--hd-glow": "rgba(56,189,248,.23)",
    "--hd-glow-1": "rgba(56,189,248,.12)",
    "--hd-glow-2": "rgba(167,139,250,.10)"
  },
  "brand-green": {
    "--hd-bg-0": "#0a0e13",
    "--hd-bg-1": "#0f151e",
    "--hd-bg-2": "#162231",
    "--hd-bg-3": "#1d2c40",
    "--hd-fg-0": "#dde7f3",
    "--hd-fg-1": "#9fb0c4",
    "--hd-fg-2": "#8ea0b5",
    "--hd-border-0": "rgba(221,231,243,.08)",
    "--hd-border-1": "rgba(221,231,243,.13)",
    "--hd-accent": "#52c41a",
    "--hd-accent-2": "#22d3ee",
    "--hd-glow": "rgba(82,196,26,.24)",
    "--hd-glow-1": "rgba(82,196,26,.12)",
    "--hd-glow-2": "rgba(34,211,238,.10)"
  }
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

  const vars = new Map<string, string>();
  const preset = resolvePresetName(tokens);
  if (preset && THEME_PRESETS[preset]) {
    for (const [k, v] of Object.entries(THEME_PRESETS[preset])) {
      vars.set(k, v);
    }
  }

  for (const [key, value] of Object.entries(tokens)) {
    if (isPresetKey(key)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    vars.set(tokenKeyToCssVar(key), value.trim());
  }

  if (vars.size === 0) return "";
  const lines = [...vars.entries()].map(([k, v]) => `${k}:${v};`);
  return `:root{${lines.join("")}}`;
}

function resolvePresetName(tokens: Record<string, string>): string | undefined {
  const keys = ["palettePreset", "themePreset", "preset"];
  for (const key of keys) {
    const value = tokens[key];
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    if (THEME_PRESETS[normalized]) return normalized;
  }
  return undefined;
}

function isPresetKey(key: string): boolean {
  return key === "palettePreset" || key === "themePreset" || key === "preset";
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
