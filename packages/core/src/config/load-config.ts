import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { HotDocsConfig } from "../types.js";

const DEFAULT_CONFIG: HotDocsConfig = {
  contentDir: "./content",
  collections: {
    docs: { dir: "docs", routeBase: "/", type: "docs" },
    blog: { dir: "blog", routeBase: "/blog", type: "blog" },
    pages: { dir: "pages", routeBase: "/", type: "pages" }
  },
  site: { title: "Hot Docs", base: "/" },
  dev: { port: 5173, host: "127.0.0.1", open: false, includeDrafts: true }
};

type LoadConfigOptions = {
  configPath?: string;
  cwd?: string;
};

export async function loadConfig(options: LoadConfigOptions = {}): Promise<HotDocsConfig> {
  const cwd = options.cwd ?? process.cwd();
  const resolvedConfigPath = options.configPath
    ? path.resolve(cwd, options.configPath)
    : await findDefaultConfigPath(cwd);

  if (!resolvedConfigPath) {
    return normalizeConfig(DEFAULT_CONFIG, cwd);
  }

  const ext = path.extname(resolvedConfigPath);
  if (ext === ".json") {
    const raw = await fs.readFile(resolvedConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<HotDocsConfig>;
    return normalizeConfig(mergeConfig(DEFAULT_CONFIG, parsed), cwd);
  }

  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    const mod = await import(pathToFileURL(resolvedConfigPath).toString());
    const cfg = (mod.default ?? mod.config ?? mod) as Partial<HotDocsConfig>;
    return normalizeConfig(mergeConfig(DEFAULT_CONFIG, cfg), cwd);
  }

  if (ext === ".ts") {
    throw new Error(
      `不支持直接加载 TS 配置（${path.basename(resolvedConfigPath)}）。请改用 .js/.mjs 或 .json；或用 tsx/自定义 loader 启动。`
    );
  }

  throw new Error(`不支持的配置文件类型：${resolvedConfigPath}`);
}

async function findDefaultConfigPath(cwd: string): Promise<string | undefined> {
  const candidates = [
    "hot-docs.config.json",
    "hot-docs.config.mjs",
    "hot-docs.config.js",
    "hot-docs.config.cjs"
  ];
  for (const name of candidates) {
    const candidate = path.join(cwd, name);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function normalizeConfig(config: HotDocsConfig, cwd: string): HotDocsConfig {
  const contentDir = path.resolve(cwd, config.contentDir);
  const base = normalizeBase(config.site.base);

  const collections: HotDocsConfig["collections"] = {};
  for (const [id, c] of Object.entries(config.collections)) {
    collections[id] = {
      dir: c.dir,
      routeBase: normalizeRouteBase(c.routeBase),
      type: c.type
    };
  }

  return {
    ...config,
    contentDir,
    collections,
    site: { ...config.site, base },
    dev: { ...DEFAULT_CONFIG.dev, ...(config.dev ?? {}) }
  };
}

function normalizeBase(base: string): string {
  if (!base) return "/";
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

function normalizeRouteBase(routeBase: string): string {
  if (!routeBase) return "/";
  if (!routeBase.startsWith("/")) routeBase = `/${routeBase}`;
  if (routeBase.length > 1 && routeBase.endsWith("/")) routeBase = routeBase.slice(0, -1);
  return routeBase;
}

function mergeConfig(base: HotDocsConfig, override: Partial<HotDocsConfig>): HotDocsConfig {
  return {
    ...base,
    ...override,
    site: { ...base.site, ...(override.site ?? {}) },
    collections: { ...base.collections, ...(override.collections ?? {}) },
    dev: { ...base.dev, ...(override.dev ?? {}) }
  };
}

// use node:url pathToFileURL
