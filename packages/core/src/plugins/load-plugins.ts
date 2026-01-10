import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import type { HotDocsConfig, HotDocsPluginRef } from "../types.js";
import type { HotDocsPlugin, HotDocsPluginFactory } from "./types.js";

type LoadPluginsOptions = {
  cwd?: string;
};

type PluginManifestV1 = {
  type: "plugin";
  apiVersion: "1" | 1;
  entry: string;
  capabilities?: string[];
};

type NormalizedPluginRef =
  | { kind: "package"; name: string; options?: Record<string, unknown> }
  | { kind: "file"; filePath: string; options?: Record<string, unknown> };

export async function loadPlugins(config: HotDocsConfig, options: LoadPluginsOptions = {}): Promise<HotDocsPlugin[]> {
  const cwd = options.cwd ?? process.cwd();
  const refs = config.plugins ?? [];
  const plugins: HotDocsPlugin[] = [];

  for (const ref of refs) {
    const normalized = normalizePluginRef(ref, cwd);
    try {
      if (normalized.kind === "package") {
        plugins.push(await loadPluginFromPackage(normalized.name, normalized.options, cwd));
      } else {
        plugins.push(await loadPluginFromFile(normalized.filePath, normalized.options));
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const id = normalized.kind === "package" ? normalized.name : normalized.filePath;
      throw new Error(`插件加载失败：${id}\n${e.message}`);
    }
  }

  return plugins;
}

function normalizePluginRef(ref: HotDocsPluginRef, cwd: string): NormalizedPluginRef {
  if (typeof ref === "string") {
    const name = ref.trim();
    if (!name) throw new Error("plugins 中存在空字符串");
    return { kind: "package", name };
  }

  if (!ref || typeof ref !== "object") {
    throw new Error("plugins 配置项必须是 string 或 {name|path, options?}");
  }

  const hasName = typeof (ref as any).name === "string" && String((ref as any).name).trim();
  const hasPath = typeof (ref as any).path === "string" && String((ref as any).path).trim();
  if (hasName && hasPath) throw new Error("plugins 配置项不能同时包含 name 与 path");

  const options = (ref as any).options;
  const normalizedOptions = options && typeof options === "object" ? (options as Record<string, unknown>) : undefined;

  if (hasName) return { kind: "package", name: String((ref as any).name).trim(), options: normalizedOptions };
  if (hasPath) return { kind: "file", filePath: path.resolve(cwd, String((ref as any).path).trim()), options: normalizedOptions };

  throw new Error("plugins 配置项必须包含 name 或 path");
}

async function loadPluginFromPackage(
  name: string,
  options: Record<string, unknown> | undefined,
  cwd: string
): Promise<HotDocsPlugin> {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = await resolvePackageJsonPath(require, name, cwd);
  const pkgRoot = path.dirname(pkgJsonPath);

  const raw = await fs.readFile(pkgJsonPath, "utf8");
  const pkg = JSON.parse(raw) as { hotDocs?: unknown };
  const manifest = validatePluginManifest(name, (pkg as any).hotDocs);

  let entryPath = path.resolve(pkgRoot, manifest.entry);
  if (!(await fileExists(entryPath))) {
    const candidates = inferDevEntryCandidates(pkgRoot, manifest.entry);
    entryPath = (await firstExistingFile(candidates)) ?? entryPath;
  }

  if (!(await fileExists(entryPath))) {
    throw new Error(`插件包 ${name} entry 不存在：${manifest.entry}`);
  }

  const mod = await import(pathToFileURL(entryPath).toString());
  const plugin = await resolvePluginFromModule(mod, options);
  return validatePluginObject(name, plugin, manifest.capabilities);
}

async function loadPluginFromFile(filePath: string, options: Record<string, unknown> | undefined): Promise<HotDocsPlugin> {
  if (!(await fileExists(filePath))) throw new Error(`本地插件文件不存在：${filePath}`);

  const mod = await import(pathToFileURL(filePath).toString());
  const plugin = await resolvePluginFromModule(mod, options);
  return validatePluginObject(filePath, plugin, undefined);
}

function validatePluginManifest(pluginName: string, hotDocs: unknown): PluginManifestV1 {
  if (!hotDocs || typeof hotDocs !== "object") {
    throw new Error(`插件包 ${pluginName} 缺少 package.json#hotDocs`);
  }
  const type = (hotDocs as any).type;
  const apiVersion = (hotDocs as any).apiVersion;
  const entry = (hotDocs as any).entry;

  if (type !== "plugin") throw new Error(`插件包 ${pluginName} package.json#hotDocs.type 必须为 "plugin"`);
  if (!(apiVersion === "1" || apiVersion === 1)) {
    throw new Error(`插件包 ${pluginName} apiVersion 不兼容：${String(apiVersion)}`);
  }
  if (typeof entry !== "string" || !entry.trim()) {
    throw new Error(`插件包 ${pluginName} 缺少有效的 entry（package.json#hotDocs.entry）`);
  }

  const capabilities = (hotDocs as any).capabilities;
  if (capabilities !== undefined && !Array.isArray(capabilities)) {
    throw new Error(`插件包 ${pluginName} capabilities 必须为 string[]（可选）`);
  }

  return {
    type: "plugin",
    apiVersion: apiVersion as any,
    entry: entry.trim(),
    capabilities: Array.isArray(capabilities) ? capabilities.filter((c) => typeof c === "string") : undefined
  };
}

async function resolvePluginFromModule(mod: unknown, options: Record<string, unknown> | undefined): Promise<unknown> {
  if (!mod || typeof mod !== "object") return mod;

  const m = mod as any;
  const exported = m.default ?? m.plugin ?? m.createPlugin ?? m;
  if (typeof exported === "function") {
    return await (exported as HotDocsPluginFactory)(options);
  }
  return exported;
}

function validatePluginObject(sourceId: string, plugin: unknown, capabilities: string[] | undefined): HotDocsPlugin {
  if (!plugin || typeof plugin !== "object") {
    throw new Error(`插件导出必须是对象或工厂函数（source: ${sourceId}）`);
  }

  const p = plugin as any;
  if (typeof p.name !== "string" || !p.name.trim()) {
    throw new Error(`插件缺少 name（source: ${sourceId}）`);
  }
  if (p.apiVersion !== 1) {
    throw new Error(`插件 ${p.name} apiVersion 不兼容：${String(p.apiVersion)}（source: ${sourceId}）`);
  }

  const normalized: HotDocsPlugin = {
    ...(p as HotDocsPlugin),
    name: p.name.trim(),
    apiVersion: 1
  };

  if (capabilities && !normalized.capabilities) {
    normalized.capabilities = capabilities;
  }

  if (normalized.hooks?.build && typeof normalized.hooks.build !== "function") {
    throw new Error(`插件 ${normalized.name} hooks.build 必须为函数（source: ${sourceId}）`);
  }

  return normalized;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolvePackageJsonPath(require: NodeRequire, pkgName: string, cwd: string): Promise<string> {
  try {
    return require.resolve(`${pkgName}/package.json`, { paths: [cwd] });
  } catch {
    const fromNodeModules = await resolvePackageJsonByNodeModules(pkgName, cwd);
    if (fromNodeModules) return fromNodeModules;

    try {
      const entry = require.resolve(pkgName, { paths: [cwd] });
      const pkgJson = await findNearestPackageJson(path.dirname(entry));
      if (pkgJson) return pkgJson;
    } catch {
      // ignore
    }

    throw new Error(`无法定位插件包 ${pkgName} 的 package.json（可能受 exports 限制，或包未安装）`);
  }
}

async function findNearestPackageJson(startDir: string): Promise<string | undefined> {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, "package.json");
    if (await fileExists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

async function resolvePackageJsonByNodeModules(pkgName: string, startDir: string): Promise<string | undefined> {
  const parts = pkgName.split("/").filter(Boolean);
  if (parts.length === 0) return undefined;

  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, "node_modules", ...parts, "package.json");
    if (await fileExists(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function inferDevEntryCandidates(pkgRoot: string, manifestEntry: string): string[] {
  const candidates: string[] = [];
  const normalized = manifestEntry.split(path.sep).join("/");

  if (normalized.includes("/dist/") || normalized.startsWith("dist/")) {
    candidates.push(path.resolve(pkgRoot, manifestEntry.replace(/(^|[\\/])dist([\\/])/g, "$1src$2").replace(/\.js$/i, ".ts")));
  }

  candidates.push(path.join(pkgRoot, "src", "index.ts"));
  candidates.push(path.join(pkgRoot, "src", "index.js"));

  return [...new Set(candidates)];
}

async function firstExistingFile(candidates: string[]): Promise<string | undefined> {
  for (const p of candidates) {
    if (await fileExists(p)) return p;
  }
  return undefined;
}
