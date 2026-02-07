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

export const THEME_PRESETS: Record<string, Record<string, string>> = {
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
  },
  "notion-light": {
    "--hd-bg-0": "#f7f7f5",
    "--hd-bg-1": "#ffffff",
    "--hd-bg-2": "#f3f3ef",
    "--hd-bg-3": "#ecece6",
    "--hd-fg-0": "#2f3437",
    "--hd-fg-1": "#37352f",
    "--hd-fg-2": "#787774",
    "--hd-border-0": "rgba(15,23,42,.08)",
    "--hd-border-1": "rgba(15,23,42,.14)",
    "--hd-accent": "#2f76ff",
    "--hd-accent-2": "#0f62fe",
    "--hd-glow": "rgba(47,118,255,.10)",
    "--hd-glow-1": "rgba(47,118,255,.06)",
    "--hd-glow-2": "rgba(120,119,116,.05)",
    "--hd-surface-sidebar-1": "rgba(255,255,255,.94)",
    "--hd-surface-sidebar-2": "rgba(250,250,248,.95)",
    "--hd-surface-toc-1": "rgba(255,255,255,.74)",
    "--hd-surface-toc-2": "rgba(247,247,245,.76)",
    "--hd-surface-header": "rgba(255,255,255,.88)",
    "--hd-surface-content": "rgba(255,255,255,.94)",
    "--hd-shadow-1": "rgba(15,23,42,.06)",
    "--hd-shadow-2": "rgba(15,23,42,.05)",
    "--hd-hover-bg": "rgba(47,118,255,.08)",
    "--hd-hover-border": "rgba(47,118,255,.16)",
    "--hd-active-bg": "rgba(47,118,255,.12)",
    "--hd-active-border": "rgba(47,118,255,.24)",
    "--hd-code-bg": "rgba(15,23,42,.04)",
    "--hd-code-border": "rgba(15,23,42,.10)",
    "--hd-pre-bg": "#fbfbfa",
    "--hd-card-bg": "#ffffff",
    "--hd-card-border": "rgba(15,23,42,.10)"
  },
  "notion-dark": {
    "--hd-bg-0": "#191919",
    "--hd-bg-1": "#202020",
    "--hd-bg-2": "#252525",
    "--hd-bg-3": "#2f2f2f",
    "--hd-fg-0": "#e9e9e7",
    "--hd-fg-1": "#c8c8c6",
    "--hd-fg-2": "#9b9b97",
    "--hd-border-0": "rgba(255,255,255,.08)",
    "--hd-border-1": "rgba(255,255,255,.14)",
    "--hd-accent": "#6ea8fe",
    "--hd-accent-2": "#8cc8ff",
    "--hd-glow": "rgba(110,168,254,.16)",
    "--hd-glow-1": "rgba(110,168,254,.10)",
    "--hd-glow-2": "rgba(120,119,116,.08)",
    "--hd-surface-sidebar-1": "rgba(26,26,26,.96)",
    "--hd-surface-sidebar-2": "rgba(22,22,22,.97)",
    "--hd-surface-toc-1": "rgba(31,31,31,.90)",
    "--hd-surface-toc-2": "rgba(24,24,24,.90)",
    "--hd-surface-header": "rgba(24,24,24,.88)",
    "--hd-surface-content": "rgba(26,26,26,.94)",
    "--hd-shadow-1": "rgba(0,0,0,.34)",
    "--hd-shadow-2": "rgba(0,0,0,.30)",
    "--hd-hover-bg": "rgba(110,168,254,.12)",
    "--hd-hover-border": "rgba(110,168,254,.22)",
    "--hd-active-bg": "rgba(110,168,254,.16)",
    "--hd-active-border": "rgba(110,168,254,.28)",
    "--hd-code-bg": "rgba(255,255,255,.05)",
    "--hd-code-border": "rgba(255,255,255,.12)",
    "--hd-pre-bg": "#1f1f1f",
    "--hd-card-bg": "#222222",
    "--hd-card-border": "rgba(255,255,255,.10)"
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
