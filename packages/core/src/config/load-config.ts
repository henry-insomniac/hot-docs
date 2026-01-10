import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { HotDocsConfig } from "../types.js";
import { normalizeBase } from "../utils/base.js";

const DEFAULT_CONFIG: HotDocsConfig = {
  contentDir: "./content",
  collections: {
    docs: { dir: "docs", routeBase: "/", type: "docs" },
    blog: { dir: "blog", routeBase: "/blog", type: "blog" },
    pages: { dir: "pages", routeBase: "/", type: "pages" }
  },
  site: { title: "Hot Docs", base: "/" },
  dev: { port: 5173, host: "127.0.0.1", open: false, includeDrafts: true, strictPort: false }
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
    const parsed = JSON.parse(raw) as unknown;
    const override = readConfigObject(parsed, resolvedConfigPath);
    validateConfigOverride(override, resolvedConfigPath);
    const merged = mergeConfig(DEFAULT_CONFIG, override);
    validateConfigMerged(merged, resolvedConfigPath);
    return normalizeConfig(merged, cwd);
  }

  if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
    const mod = await import(pathToFileURL(resolvedConfigPath).toString());
    const cfg = (mod.default ?? mod.config ?? mod) as unknown;
    const override = readConfigObject(cfg, resolvedConfigPath);
    validateConfigOverride(override, resolvedConfigPath);
    const merged = mergeConfig(DEFAULT_CONFIG, override);
    validateConfigMerged(merged, resolvedConfigPath);
    return normalizeConfig(merged, cwd);
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

function normalizeRouteBase(routeBase: string): string {
  if (!routeBase) return "/";
  if (!routeBase.startsWith("/")) routeBase = `/${routeBase}`;
  if (routeBase.length > 1 && routeBase.endsWith("/")) routeBase = routeBase.slice(0, -1);
  return routeBase;
}

function mergeConfig(base: HotDocsConfig, override: Record<string, unknown>): HotDocsConfig {
  const overrideSite = isPlainObject(override.site) ? (override.site as Record<string, unknown>) : {};
  const overrideCollections = isPlainObject(override.collections) ? (override.collections as Record<string, unknown>) : {};
  const overrideTheme = isPlainObject(override.theme) ? (override.theme as Record<string, unknown>) : undefined;
  const overrideDev = isPlainObject(override.dev) ? (override.dev as Record<string, unknown>) : {};

  return {
    ...base,
    ...(override as Partial<HotDocsConfig>),
    site: { ...base.site, ...(overrideSite as Partial<HotDocsConfig["site"]>) },
    collections: { ...base.collections, ...(overrideCollections as HotDocsConfig["collections"]) },
    theme: mergeTheme(base.theme, overrideTheme),
    dev: { ...base.dev, ...(overrideDev as Partial<HotDocsConfig["dev"]>) }
  };
}

function mergeTheme(
  baseTheme: HotDocsConfig["theme"] | undefined,
  overrideTheme: Record<string, unknown> | undefined
): HotDocsConfig["theme"] | undefined {
  const overrideTokens = overrideTheme && isPlainObject(overrideTheme.tokens) ? (overrideTheme.tokens as Record<string, unknown>) : undefined;
  const overrideTokenMap: Record<string, string> = {};
  if (overrideTokens) {
    for (const [k, v] of Object.entries(overrideTokens)) {
      if (typeof v === "string") overrideTokenMap[k] = v;
    }
  }

  if (!baseTheme && !overrideTheme) return undefined;
  return {
    ...(baseTheme ?? {}),
    ...((overrideTheme as Partial<HotDocsConfig["theme"]>) ?? {}),
    tokens: { ...(baseTheme?.tokens ?? {}), ...overrideTokenMap }
  };
}

function readConfigObject(value: unknown, configPath: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    throw new Error(`配置错误（${path.basename(configPath)}）：配置必须导出一个对象（当前是 ${actual}）`);
  }
  return value;
}

function validateConfigOverride(override: Record<string, unknown>, configPath: string): void {
  if ("contentDir" in override && typeof override.contentDir !== "string") {
    throw new Error(`配置错误（${path.basename(configPath)}）：contentDir 必须是字符串`);
  }

  if ("site" in override && !isPlainObject(override.site)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：site 必须是对象`);
  }
  if (isPlainObject(override.site)) {
    const site = override.site as Record<string, unknown>;
    if ("title" in site && typeof site.title !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：site.title 必须是字符串`);
    }
    if ("base" in site && typeof site.base !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：site.base 必须是字符串`);
    }
  }

  if ("collections" in override && !isPlainObject(override.collections)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：collections 必须是对象`);
  }
  if (isPlainObject(override.collections)) {
    for (const [id, raw] of Object.entries(override.collections as Record<string, unknown>)) {
      if (!isPlainObject(raw)) {
        throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id} 必须是对象`);
      }
      const c = raw as Record<string, unknown>;
      if ("dir" in c && typeof c.dir !== "string") {
        throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.dir 必须是字符串`);
      }
      if ("routeBase" in c && typeof c.routeBase !== "string") {
        throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.routeBase 必须是字符串`);
      }
      if ("type" in c && c.type !== "docs" && c.type !== "blog" && c.type !== "pages") {
        throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.type 必须是 docs/blog/pages`);
      }
    }
  }

  if ("dev" in override && !isPlainObject(override.dev)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：dev 必须是对象`);
  }
  if (isPlainObject(override.dev)) {
    const dev = override.dev as Record<string, unknown>;
    if ("port" in dev && typeof dev.port !== "number") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.port 必须是数字`);
    }
    if ("host" in dev && typeof dev.host !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.host 必须是字符串`);
    }
    if ("open" in dev && typeof dev.open !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.open 必须是布尔值`);
    }
    if ("includeDrafts" in dev && typeof dev.includeDrafts !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.includeDrafts 必须是布尔值`);
    }
    if ("strictPort" in dev && typeof dev.strictPort !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.strictPort 必须是布尔值`);
    }
  }

  if ("theme" in override && !isPlainObject(override.theme)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：theme 必须是对象`);
  }
  if (isPlainObject(override.theme)) {
    const theme = override.theme as Record<string, unknown>;
    if ("name" in theme && typeof theme.name !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：theme.name 必须是字符串`);
    }
    if ("tokens" in theme && theme.tokens !== undefined && !isPlainObject(theme.tokens)) {
      throw new Error(`配置错误（${path.basename(configPath)}）：theme.tokens 必须是对象`);
    }
    if (isPlainObject(theme.tokens)) {
      for (const [k, v] of Object.entries(theme.tokens as Record<string, unknown>)) {
        if (typeof v !== "string") {
          throw new Error(`配置错误（${path.basename(configPath)}）：theme.tokens.${k} 必须是字符串`);
        }
      }
    }
  }

  if ("plugins" in override && override.plugins !== undefined && !Array.isArray(override.plugins)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：plugins 必须是数组`);
  }
  if (Array.isArray(override.plugins)) {
    override.plugins.forEach((p, idx) => validatePluginRef(p, `plugins[${idx}]`, configPath));
  }
}

function validateConfigMerged(config: HotDocsConfig, configPath: string): void {
  if (typeof config.contentDir !== "string" || !config.contentDir.trim()) {
    throw new Error(`配置错误（${path.basename(configPath)}）：contentDir 必须是非空字符串`);
  }

  if (!config.site || typeof config.site.title !== "string" || typeof config.site.base !== "string") {
    throw new Error(`配置错误（${path.basename(configPath)}）：site.title/site.base 必须存在且为字符串`);
  }

  if (!config.collections || typeof config.collections !== "object") {
    throw new Error(`配置错误（${path.basename(configPath)}）：collections 必须存在且为对象`);
  }

  const ids = Object.keys(config.collections);
  if (ids.length === 0) {
    throw new Error(`配置错误（${path.basename(configPath)}）：collections 不能为空`);
  }

  for (const id of ids) {
    const c = (config.collections as any)[id] as any;
    if (!c || typeof c !== "object") {
      throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id} 必须是对象`);
    }
    if (typeof c.dir !== "string" || !c.dir.trim()) {
      throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.dir 必须是非空字符串`);
    }
    if (typeof c.routeBase !== "string" || !c.routeBase.trim()) {
      throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.routeBase 必须是非空字符串`);
    }
    if (c.type !== "docs" && c.type !== "blog" && c.type !== "pages") {
      throw new Error(`配置错误（${path.basename(configPath)}）：collections.${id}.type 必须是 docs/blog/pages`);
    }
  }

  if (config.dev) {
    const dev = config.dev;
    if (dev.port !== undefined) {
      if (typeof dev.port !== "number" || !Number.isFinite(dev.port) || Math.floor(dev.port) !== dev.port) {
        throw new Error(`配置错误（${path.basename(configPath)}）：dev.port 必须是整数`);
      }
      if (dev.port < 1 || dev.port > 65535) {
        throw new Error(`配置错误（${path.basename(configPath)}）：dev.port 必须在 1~65535 之间`);
      }
    }
    if (dev.host !== undefined && typeof dev.host !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.host 必须是字符串`);
    }
    if (dev.open !== undefined && typeof dev.open !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.open 必须是布尔值`);
    }
    if (dev.includeDrafts !== undefined && typeof dev.includeDrafts !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.includeDrafts 必须是布尔值`);
    }
    if (dev.strictPort !== undefined && typeof dev.strictPort !== "boolean") {
      throw new Error(`配置错误（${path.basename(configPath)}）：dev.strictPort 必须是布尔值`);
    }
  }

  if (config.theme) {
    if (config.theme.name !== undefined && typeof config.theme.name !== "string") {
      throw new Error(`配置错误（${path.basename(configPath)}）：theme.name 必须是字符串`);
    }
    if (config.theme.tokens !== undefined && !isPlainObject(config.theme.tokens)) {
      throw new Error(`配置错误（${path.basename(configPath)}）：theme.tokens 必须是对象`);
    }
    if (config.theme.tokens) {
      for (const [k, v] of Object.entries(config.theme.tokens)) {
        if (typeof v !== "string") {
          throw new Error(`配置错误（${path.basename(configPath)}）：theme.tokens.${k} 必须是字符串`);
        }
      }
    }
  }

  if (config.plugins !== undefined && !Array.isArray(config.plugins)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：plugins 必须是数组`);
  }
  if (Array.isArray(config.plugins)) {
    config.plugins.forEach((p, idx) => validatePluginRef(p as unknown, `plugins[${idx}]`, configPath));
  }
}

function validatePluginRef(ref: unknown, at: string, configPath: string): void {
  if (typeof ref === "string") {
    if (!ref.trim()) throw new Error(`配置错误（${path.basename(configPath)}）：${at} 不能为空字符串`);
    return;
  }

  if (!isPlainObject(ref)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at} 必须是字符串或对象`);
  }

  const r = ref as Record<string, unknown>;
  if ("name" in r && (typeof r.name !== "string" || !r.name.trim())) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at}.name 必须是非空字符串`);
  }
  if ("path" in r && (typeof r.path !== "string" || !r.path.trim())) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at}.path 必须是非空字符串`);
  }

  const name = typeof r.name === "string" ? r.name.trim() : "";
  const p = typeof r.path === "string" ? r.path.trim() : "";

  if (!!name && !!p) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at} 不能同时包含 name 与 path`);
  }
  if (!name && !p) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at} 必须包含 name 或 path`);
  }

  if ("name" in r && (typeof r.name !== "string" || !name)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at}.name 必须是非空字符串`);
  }
  if ("path" in r && (typeof r.path !== "string" || !p)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at}.path 必须是非空字符串`);
  }

  if ("options" in r && r.options !== undefined && !isPlainObject(r.options)) {
    throw new Error(`配置错误（${path.basename(configPath)}）：${at}.options 必须是对象`);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// use node:url pathToFileURL
