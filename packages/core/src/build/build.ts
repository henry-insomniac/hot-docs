import crypto from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { ContentIndex, HotDocsConfig, NavNode } from "../types.js";
import { renderMarkdownToPage, type TocItem } from "../render/markdown.js";
import { withBase, toPageHref, trimTrailingSlash } from "../utils/base.js";
import { joinUrlPath, posixPath } from "../utils/routes.js";
import { scanContent } from "../content/scan.js";
import { loadThemeCss } from "../theme/load-theme.js";
import { loadPlugins } from "../plugins/load-plugins.js";
import type { HotDocsPlugin, PluginVirtualPage } from "../plugins/types.js";
import { listBlogVirtualPages } from "../blog/virtual-pages.js";

export type BuildStaticSiteOptions = {
  cwd?: string;
  outDir?: string;
  includeDrafts?: boolean;
  clean?: boolean;
};

type HeaderQuickLink = {
  routePath: string;
  label: string;
};

export async function buildStaticSite(config: HotDocsConfig, options: BuildStaticSiteOptions = {}): Promise<{
  outDir: string;
  pages: number;
  assets: number;
  plugins: string[];
}> {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? "dist");
  const clean = options.clean ?? true;

  if (clean) {
    await fs.rm(outDir, { recursive: true, force: true });
  }
  await fs.mkdir(outDir, { recursive: true });

  const includeDrafts = options.includeDrafts ?? false;
  const plugins = await loadPlugins(config, { cwd });
  const markdownExtensions = collectMarkdownExtensions(plugins);
  const index = await scanContent(config, { includeDrafts });
  const blogVirtualPages = listBlogVirtualPages(config, index);
  const blogReserved = new Set(blogVirtualPages.map((p) => trimTrailingSlash(p.routePath)));
  const pluginVirtualPages = await collectPluginPages(plugins, { cwd, config, index, blogReserved });
  const availableRoutes = collectAvailableRoutes(index, blogVirtualPages, pluginVirtualPages);
  const headerQuickLinks = resolveHeaderQuickLinks(availableRoutes);

  const assets = await copyContentAssets(outDir, config);
  await writeThemeAssets(outDir, config, { cwd });
  const contentPages = await emitPages(outDir, config, index, markdownExtensions, { headerQuickLinks });
  const pluginPages = await emitPluginVirtualPages(outDir, config, index, pluginVirtualPages, { headerQuickLinks });
  const blogPages = await emitBlogVirtualPages(outDir, config, index, blogVirtualPages, { headerQuickLinks });
  await runBuildHooks(plugins, { cwd, outDir, config, index });

  return { outDir, pages: contentPages + pluginPages + blogPages, assets, plugins: plugins.map((p) => p.name) };
}

async function writeThemeAssets(outDir: string, config: HotDocsConfig, options: { cwd: string }): Promise<void> {
  const assetsDir = path.join(outDir, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  const css = await loadThemeCss(config, { cwd: options.cwd });
  await fs.writeFile(path.join(assetsDir, "theme.css"), css, "utf8");
}

async function copyContentAssets(outDir: string, config: HotDocsConfig): Promise<number> {
  let count = 0;

  for (const [, collection] of Object.entries(config.collections)) {
    const root = path.join(config.contentDir, collection.dir);
    const files = await listFiles(root);
    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".md" || ext === ".markdown") continue;

      const rel = path.relative(root, filePath);
      if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;

      const relPosix = posixPath(rel);
      const publicPath = joinUrlPath(collection.routeBase, relPosix);
      const dest = path.join(outDir, publicPath.startsWith("/") ? publicPath.slice(1) : publicPath);

      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(filePath, dest);
      count++;
    }
  }

  return count;
}

async function listFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];

  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile()) results.push(full);
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

async function emitPages(
  outDir: string,
  config: HotDocsConfig,
  index: ContentIndex,
  markdown: { remarkPlugins: any[]; rehypePlugins: any[] },
  options: { headerQuickLinks: HeaderQuickLink[] }
): Promise<number> {
  const docsNav = getDocsNav(index, config);
  const pageEntries = [...index.entriesByRoute.values()];

  for (const entry of pageEntries) {
    const collection = config.collections[entry.collection];
    if (!collection) continue;

    const filePath = path.join(config.contentDir, collection.dir, ...entry.relativePath.split("/"));
    const raw = await fs.readFile(filePath, "utf8");
    const rendered = await renderMarkdownToPage(raw, { config, entry, filePath, ...markdown });

    const routePath = trimTrailingSlash(entry.routePath);
    const navHtml = docsNav ? renderNavHtml(docsNav, routePath, config) : "";
    const tocHtml = renderTocHtml(rendered.toc);
    const pageHtml = renderPageHtml(config, {
      routePath,
      title: entry.title,
      navHtml,
      tocHtml,
      hasToc: !!rendered.toc.length,
      contentHtml: rendered.html,
      headerQuickLinks: options.headerQuickLinks
    });

    const outputFile = routeToOutputFile(outDir, routePath);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, pageHtml, "utf8");
  }

  return pageEntries.length;
}

function collectMarkdownExtensions(plugins: HotDocsPlugin[]): { remarkPlugins: any[]; rehypePlugins: any[] } {
  const remarkPlugins: any[] = [];
  const rehypePlugins: any[] = [];

  for (const plugin of plugins) {
    const remark = plugin.markdown?.remarkPlugins ?? [];
    const rehype = plugin.markdown?.rehypePlugins ?? [];

    if (Array.isArray(remark)) remarkPlugins.push(...remark);
    if (Array.isArray(rehype)) rehypePlugins.push(...rehype);
  }

  return { remarkPlugins, rehypePlugins };
}

async function runBuildHooks(
  plugins: HotDocsPlugin[],
  ctx: { cwd: string; outDir: string; config: HotDocsConfig; index: ContentIndex }
): Promise<void> {
  const emitFile = async (relativePath: string, content: string | Uint8Array): Promise<void> => {
    const rel = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
    if (!rel) throw new Error("emitFile(relativePath) 不能为空");
    const dest = path.join(ctx.outDir, ...rel.split("/"));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
  };

  for (const plugin of plugins) {
    if (!plugin.hooks?.build) continue;
    try {
      await plugin.hooks.build({ cwd: ctx.cwd, outDir: ctx.outDir, config: ctx.config, index: ctx.index, emitFile });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      throw new Error(`插件 ${plugin.name} 在 build 阶段执行失败：${e.message}`, { cause: e });
    }
  }
}

function getDocsNav(index: ContentIndex, config: HotDocsConfig): NavNode | null {
  for (const [id, c] of Object.entries(config.collections)) {
    if (c.type !== "docs") continue;
    return index.navTreeByCollection.get(id) ?? null;
  }
  return null;
}

function routeToOutputFile(outDir: string, routePath: string): string {
  const normalized = trimTrailingSlash(routePath);
  if (normalized === "/") return path.join(outDir, "index.html");
  const rel = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return path.join(outDir, rel, "index.html");
}

function renderPageHtml(
  config: HotDocsConfig,
  page: {
    routePath: string;
    title: string;
    navHtml: string;
    tocHtml: string;
    hasToc: boolean;
    contentHtml: string;
    headerQuickLinks: HeaderQuickLink[];
  }
): string {
  const siteTitle = escapeHtml(config.site.title);
  const pageTitle = escapeHtml(page.title ? `${page.title} - ${config.site.title}` : config.site.title);
  const themeHref = withBase(config.site.base, "/assets/theme.css");

  const brandHref = toPageHref(config.site.base, "/");
  const nav = page.navHtml ? `<aside id="hd-sidebar">${page.navHtml}</aside>` : `<aside id="hd-sidebar"></aside>`;
  const appClass = page.hasToc ? "hd-has-toc" : "";
  const toc = `<aside id="hd-toc">${page.tocHtml ?? ""}</aside>`;
  const headerQuickLinks = renderHeaderQuickLinks(config, page.routePath, page.headerQuickLinks);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="${themeHref}" />
  </head>
  <body>
    <div id="hd-app" class="${appClass}">
      ${nav}
      <main id="hd-main">
        <div id="hd-header">
          <div id="hd-brand"><a href="${brandHref}">${siteTitle}</a></div>
          ${headerQuickLinks}
        </div>
        <article id="hd-content">${page.contentHtml}</article>
      </main>
      ${toc}
    </div>
  </body>
</html>`;
}

function renderTocHtml(items: TocItem[]): string {
  if (!items.length) return "";

  const links = items
    .map((item) => {
      const href = `#${escapeHtml(item.id)}`;
      const title = escapeHtml(item.title);
      const levelClass = `hd-toc-level-${item.level}`;
      return `<li class="hd-toc-item ${levelClass}"><a href="${href}">${title}</a></li>`;
    })
    .join("");

  return `<div class="hd-toc-inner"><div class="hd-toc-title">目录</div><ul class="hd-toc-list">${links}</ul></div>`;
}

function renderNavHtml(nav: NavNode, currentRoutePath: string, config: HotDocsConfig): string {
  const inner = renderNavNode(nav, currentRoutePath, config);
  return `<ul class="hd-list hd-root">${inner}</ul>`;
}

function renderNavNode(node: NavNode, currentRoutePath: string, config: HotDocsConfig): string {
  if (node.type === "page" && node.routePath) {
    const active = trimTrailingSlash(node.routePath) === trimTrailingSlash(currentRoutePath) ? " hd-active" : "";
    const href = toPageHref(config.site.base, node.routePath);
    return `<li class="hd-item${active}"><a href="${href}">${escapeHtml(node.title)}</a></li>`;
  }

  if (!node.pathSegment) {
    return (node.children ?? []).map((c) => renderNavNode(c, currentRoutePath, config)).join("");
  }

  const active = nodeContainsRoute(node, currentRoutePath);
  const children = (node.children ?? []).map((c) => renderNavNode(c, currentRoutePath, config)).join("");
  const open = active ? " open" : "";
  const cls = active ? "hd-dir hd-dir-active" : "hd-dir";
  return (
    `<li class="${cls}">` +
    `<details class="hd-dir-details"${open}>` +
    `<summary class="hd-dir-title">${escapeHtml(node.title)}</summary>` +
    `<ul class="hd-list">${children}</ul>` +
    `</details>` +
    `</li>`
  );
}

function nodeContainsRoute(node: NavNode, currentRoutePath: string): boolean {
  const current = trimTrailingSlash(currentRoutePath);
  if (node.type === "page" && node.routePath) return trimTrailingSlash(node.routePath) === current;
  for (const child of node.children ?? []) {
    if (nodeContainsRoute(child, currentRoutePath)) return true;
  }
  return false;
}

function renderHeaderQuickLinks(config: HotDocsConfig, currentRoutePath: string, links: HeaderQuickLink[]): string {
  if (!links.length) return "";

  const current = trimTrailingSlash(currentRoutePath);
  const body = links
    .map((link) => {
      const href = toPageHref(config.site.base, link.routePath);
      const active = trimTrailingSlash(link.routePath) === current ? " is-active" : "";
      return `<a class="hd-header-link${active}" href="${href}">${escapeHtml(link.label)}</a>`;
    })
    .join("");

  return `<nav class="hd-header-links" aria-label="快捷入口">${body}</nav>`;
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function emitBlogVirtualPages(
  outDir: string,
  config: HotDocsConfig,
  index: ContentIndex,
  virtualPages: Array<{ routePath: string; title: string; html: string; hash: string }>,
  options: { headerQuickLinks: HeaderQuickLink[] }
): Promise<number> {
  const docsNav = getDocsNav(index, config);
  let count = 0;

  for (const page of virtualPages) {
    if (index.entriesByRoute.has(page.routePath)) continue; // allow user override with real markdown

    const routePath = trimTrailingSlash(page.routePath);
    const navHtml = docsNav ? renderNavHtml(docsNav, routePath, config) : "";
    const pageHtml = renderPageHtml(config, {
      routePath,
      title: page.title,
      navHtml,
      tocHtml: "",
      hasToc: false,
      contentHtml: page.html,
      headerQuickLinks: options.headerQuickLinks
    });

    const outputFile = routeToOutputFile(outDir, routePath);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, pageHtml, "utf8");
    count++;
  }

  return count;
}

async function emitPluginVirtualPages(
  outDir: string,
  config: HotDocsConfig,
  index: ContentIndex,
  pages: Array<{ routePath: string; title: string; html: string; hash: string }>,
  options: { headerQuickLinks: HeaderQuickLink[] }
): Promise<number> {
  const docsNav = getDocsNav(index, config);
  let count = 0;

  for (const page of pages) {
    const routePath = trimTrailingSlash(page.routePath);
    if (index.entriesByRoute.has(routePath)) continue; // allow user override with real markdown

    const navHtml = docsNav ? renderNavHtml(docsNav, routePath, config) : "";
    const pageHtml = renderPageHtml(config, {
      routePath,
      title: page.title,
      navHtml,
      tocHtml: "",
      hasToc: false,
      contentHtml: page.html,
      headerQuickLinks: options.headerQuickLinks
    });

    const outputFile = routeToOutputFile(outDir, routePath);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, pageHtml, "utf8");
    count++;
  }

  return count;
}

async function collectPluginPages(
  plugins: HotDocsPlugin[],
  ctx: { cwd: string; config: HotDocsConfig; index: ContentIndex; blogReserved: Set<string> }
): Promise<Array<{ routePath: string; title: string; html: string; hash: string }>> {
  const out: Array<{ routePath: string; title: string; html: string; hash: string }> = [];
  const seen = new Map<string, string>();

  for (const plugin of plugins) {
    const fn = plugin.routes?.pages;
    if (!fn) continue;

    let pages: PluginVirtualPage[];
    try {
      const res = await fn({ cwd: ctx.cwd, config: ctx.config, index: ctx.index });
      pages = Array.isArray(res) ? res : [];
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      throw new Error(`插件 ${plugin.name} 在 routes 阶段执行失败：${e.message}`, { cause: e });
    }

    for (const p of pages) {
      if (!p || typeof p !== "object") continue;
      if (typeof p.routePath !== "string" || !p.routePath.trim()) continue;
      if (typeof p.title !== "string") continue;
      if (typeof p.html !== "string") continue;

      const routePath = trimTrailingSlash(p.routePath.trim().startsWith("/") ? p.routePath.trim() : `/${p.routePath.trim()}`);
      if (ctx.blogReserved.has(routePath)) {
        throw new Error(`插件虚拟页面路由被 core 占用：${routePath}（plugin: ${plugin.name}）`);
      }
      const prev = seen.get(routePath);
      if (prev) {
        throw new Error(`插件虚拟页面路由冲突：${routePath}（${prev} vs ${plugin.name}）`);
      }
      seen.set(routePath, plugin.name);

      const hash = typeof p.hash === "string" && p.hash.trim() ? p.hash.trim() : computeHash({ routePath, title: p.title, html: p.html });
      out.push({ routePath, title: p.title, html: p.html, hash });
    }
  }

  return out;
}

function collectAvailableRoutes(
  index: ContentIndex,
  blogVirtualPages: Array<{ routePath: string }>,
  pluginVirtualPages: Array<{ routePath: string }>
): Set<string> {
  const routes = new Set<string>();

  for (const routePath of index.entriesByRoute.keys()) {
    routes.add(trimTrailingSlash(routePath));
  }
  for (const page of blogVirtualPages) {
    routes.add(trimTrailingSlash(page.routePath));
  }
  for (const page of pluginVirtualPages) {
    routes.add(trimTrailingSlash(page.routePath));
  }

  return routes;
}

function resolveHeaderQuickLinks(availableRoutes: Set<string>): HeaderQuickLink[] {
  const candidates: HeaderQuickLink[] = [
    { routePath: "/search", label: "搜索" },
    { routePath: "/categories", label: "分类" }
  ];

  return candidates.filter((item) => availableRoutes.has(trimTrailingSlash(item.routePath)));
}

function computeHash(obj: unknown): string {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 12);
}
