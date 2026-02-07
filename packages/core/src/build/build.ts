import crypto from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import type { ContentIndex, HotDocsConfig, NavNode } from "../types.js";
import { renderMarkdownToPage, type TocItem } from "../render/markdown.js";
import { withBase, toPageHref, trimTrailingSlash } from "../utils/base.js";
import { joinUrlPath, posixPath } from "../utils/routes.js";
import { scanContent } from "../content/scan.js";
import { loadThemeCss, THEME_PRESETS } from "../theme/load-theme.js";
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

const PREFERRED_THEME_ORDER = ["notion-dark", "notion-light", "graphite-cyan", "immersive-blue", "brand-green"];
const THEME_LABELS: Record<string, string> = {
  "notion-dark": "Notion Dark",
  "notion-light": "Notion Light",
  "graphite-cyan": "Graphite Cyan",
  "immersive-blue": "Immersive Blue",
  "brand-green": "Brand Green"
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
  const themePresetIds = resolveThemePresetIds();
  const currentThemePreset = resolveCurrentThemePreset(config, themePresetIds[0] ?? "notion-dark");
  const runtimeThemeMap = Object.fromEntries(themePresetIds.map((id) => [id, THEME_PRESETS[id] ?? {}]));
  const runtimeConfig = {
    searchHref: resolveSearchHref(config, page.headerQuickLinks),
    themeOrder: themePresetIds,
    currentThemePreset,
    themePresets: runtimeThemeMap
  };
  const shortcutsModal = renderShortcutsModal(themePresetIds);
  const runtimeScript = renderRuntimeScript();

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
    ${shortcutsModal}
    <div id="hd-kbd-toast" class="hd-kbd-toast" hidden></div>
    <script id="hd-runtime-config" type="application/json">${jsonForScript(runtimeConfig)}</script>
    <script>${runtimeScript}</script>
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
  const current = trimTrailingSlash(currentRoutePath);
  const body = links
    .map((link) => {
      const href = toPageHref(config.site.base, link.routePath);
      const active = trimTrailingSlash(link.routePath) === current ? " is-active" : "";
      return `<a class="hd-header-link${active}" href="${href}">${escapeHtml(link.label)}</a>`;
    })
    .join("");
  const actions =
    `<button type="button" class="hd-header-link hd-header-btn" id="hd-theme-toggle" aria-label="切换主题（Shift+T）">主题</button>` +
    `<button type="button" class="hd-header-link hd-header-btn" id="hd-help-toggle" aria-label="查看快捷键（?）">快捷键</button>`;

  return `<nav class="hd-header-links" aria-label="快捷入口">${body}${actions}</nav>`;
}

function resolveThemePresetIds(): string[] {
  const all = Object.keys(THEME_PRESETS);
  const first = PREFERRED_THEME_ORDER.filter((id) => all.includes(id));
  const rest = all.filter((id) => !first.includes(id)).sort((a, b) => a.localeCompare(b));
  return [...first, ...rest];
}

function resolveCurrentThemePreset(config: HotDocsConfig, fallback: string): string {
  const tokens = config.theme?.tokens;
  if (!tokens) return fallback;
  for (const key of ["palettePreset", "themePreset", "preset"]) {
    const value = tokens[key];
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized) continue;
    if (THEME_PRESETS[normalized]) return normalized;
  }
  return fallback;
}

function resolveSearchHref(config: HotDocsConfig, links: HeaderQuickLink[]): string | null {
  const item = links.find((it) => trimTrailingSlash(it.routePath) === "/search");
  if (!item) return null;
  return toPageHref(config.site.base, item.routePath);
}

function renderShortcutsModal(themePresetIds: string[]): string {
  const themeButtons = themePresetIds
    .map((id) => {
      const label = THEME_LABELS[id] ?? id;
      return `<button type="button" class="hd-theme-preset-btn" data-theme-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
    })
    .join("");

  return (
    `<div id="hd-shortcuts-modal" class="hd-kbd-modal" hidden aria-hidden="true">` +
    `<div class="hd-kbd-panel" role="dialog" aria-modal="true" aria-labelledby="hd-kbd-title">` +
    `<div class="hd-kbd-head">` +
    `<h2 id="hd-kbd-title">快捷键与阅读操作</h2>` +
    `<button type="button" class="hd-kbd-close" id="hd-kbd-close" aria-label="关闭">Esc</button>` +
    `</div>` +
    `<p class="hd-kbd-tip">按 <kbd>Shift</kbd> + <kbd>T</kbd> 可快速轮换主题。</p>` +
    `<div class="hd-kbd-grid">` +
    `<div class="hd-kbd-group"><h3>导航</h3><ul>` +
    `<li><kbd>/</kbd><span>聚焦搜索（若无搜索页则不跳转）</span></li>` +
    `<li><kbd>N</kbd>/<kbd>P</kbd><span>跳到下一个/上一个标题</span></li>` +
    `<li><kbd>g</kbd><kbd>g</kbd> / <kbd>G</kbd><span>回到顶部/底部</span></li>` +
    `</ul></div>` +
    `<div class="hd-kbd-group"><h3>阅读</h3><ul>` +
    `<li><kbd>j</kbd>/<kbd>k</kbd><span>小步下滚/上滚</span></li>` +
    `<li><kbd>d</kbd>/<kbd>u</kbd><span>半屏下滚/上滚</span></li>` +
    `<li><kbd>w</kbd><span>切换正文宽度（窄/默认/宽）</span></li>` +
    `</ul></div>` +
    `<div class="hd-kbd-group"><h3>布局</h3><ul>` +
    `<li><kbd>z</kbd><span>沉浸阅读（隐藏左右栏）</span></li>` +
    `<li><kbd>c</kbd><span>切换左侧目录</span></li>` +
    `<li><kbd>t</kbd><span>切换右侧目录</span></li>` +
    `<li><kbd>Esc</kbd><span>关闭弹窗或退出当前操作</span></li>` +
    `</ul></div>` +
    `<div class="hd-kbd-group"><h3>主题</h3><ul>` +
    `<li><kbd>Shift</kbd> + <kbd>T</kbd><span>轮换主题</span></li>` +
    `<li><span>点击下面按钮直达主题：</span></li>` +
    `</ul><div class="hd-theme-preset-list">${themeButtons}</div></div>` +
    `</div>` +
    `</div>` +
    `</div>`
  );
}

function renderRuntimeScript(): string {
  return `
(() => {
  const app = document.getElementById("hd-app");
  const content = document.getElementById("hd-content");
  const shortcutsModal = document.getElementById("hd-shortcuts-modal");
  const shortcutsClose = document.getElementById("hd-kbd-close");
  const shortcutsBtn = document.getElementById("hd-help-toggle");
  const themeBtn = document.getElementById("hd-theme-toggle");
  const toast = document.getElementById("hd-kbd-toast");
  const cfgEl = document.getElementById("hd-runtime-config");
  const cfg = parseJson(cfgEl && cfgEl.textContent);
  const STORAGE_UI = "hd.ui.v1";
  const STORAGE_THEME = "hd.theme.v1";
  const themeOrder = Array.isArray(cfg.themeOrder) ? cfg.themeOrder : [];
  const themePresets = cfg.themePresets && typeof cfg.themePresets === "object" ? cfg.themePresets : {};
  const themeVars = collectThemeVars(themePresets);
  const root = document.documentElement;
  const state = loadUiState();
  let gPending = false;
  let gTimer = 0;

  applyTheme(resolveInitialTheme());
  applyUiState();
  bindEvents();
  updateThemeButton();

  function parseJson(raw) {
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  function collectThemeVars(presets) {
    const keys = new Set();
    for (const values of Object.values(presets)) {
      if (!values || typeof values !== "object") continue;
      for (const key of Object.keys(values)) keys.add(key);
    }
    return [...keys];
  }

  function loadUiState() {
    const defaults = { immersive: false, hideSidebar: false, hideToc: false, width: "default" };
    try {
      const raw = localStorage.getItem(STORAGE_UI);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaults;
      return {
        immersive: !!parsed.immersive,
        hideSidebar: !!parsed.hideSidebar,
        hideToc: !!parsed.hideToc,
        width: parsed.width === "narrow" || parsed.width === "wide" ? parsed.width : "default"
      };
    } catch {
      return defaults;
    }
  }

  function saveUiState() {
    try { localStorage.setItem(STORAGE_UI, JSON.stringify(state)); } catch {}
  }

  function resolveInitialTheme() {
    const fromStorage = localStorage.getItem(STORAGE_THEME);
    if (fromStorage && themePresets[fromStorage]) return fromStorage;
    if (cfg.currentThemePreset && themePresets[cfg.currentThemePreset]) return cfg.currentThemePreset;
    return themeOrder.find((id) => !!themePresets[id]) || "";
  }

  function applyTheme(themeId) {
    if (!themeId || !themePresets[themeId]) return;
    const values = themePresets[themeId];
    for (const key of themeVars) {
      const value = values[key];
      if (typeof value === "string") root.style.setProperty(key, value);
      else root.style.removeProperty(key);
    }
    root.setAttribute("data-hd-theme", themeId);
    try { localStorage.setItem(STORAGE_THEME, themeId); } catch {}
    updateThemeButton();
  }

  function updateThemeButton() {
    if (!themeBtn) return;
    const themeId = root.getAttribute("data-hd-theme") || "";
    themeBtn.textContent = themeId ? ("主题: " + themeId) : "主题";
  }

  function cycleTheme() {
    if (!themeOrder.length) return;
    const current = root.getAttribute("data-hd-theme");
    const idx = current ? themeOrder.indexOf(current) : -1;
    const next = themeOrder[(idx + 1 + themeOrder.length) % themeOrder.length];
    applyTheme(next);
    showToast("主题已切换: " + next);
  }

  function applyUiState() {
    if (!app) return;
    app.classList.toggle("hd-immersive", !!state.immersive);
    app.classList.toggle("hd-hide-sidebar", !state.immersive && !!state.hideSidebar);
    app.classList.toggle("hd-hide-toc", !state.immersive && !!state.hideToc);
    document.body.classList.toggle("hd-content-narrow", state.width === "narrow");
    document.body.classList.toggle("hd-content-wide", state.width === "wide");
  }

  function toggleImmersive() {
    state.immersive = !state.immersive;
    applyUiState();
    saveUiState();
    showToast(state.immersive ? "沉浸阅读: 开启" : "沉浸阅读: 关闭");
  }

  function toggleSidebar() {
    if (state.immersive) state.immersive = false;
    state.hideSidebar = !state.hideSidebar;
    applyUiState();
    saveUiState();
    showToast(state.hideSidebar ? "左侧目录: 隐藏" : "左侧目录: 显示");
  }

  function toggleToc() {
    if (state.immersive) state.immersive = false;
    state.hideToc = !state.hideToc;
    applyUiState();
    saveUiState();
    showToast(state.hideToc ? "右侧目录: 隐藏" : "右侧目录: 显示");
  }

  function cycleWidth() {
    state.width = state.width === "default" ? "narrow" : state.width === "narrow" ? "wide" : "default";
    applyUiState();
    saveUiState();
    const label = state.width === "default" ? "默认" : state.width === "narrow" ? "窄" : "宽";
    showToast("正文宽度: " + label);
  }

  function openShortcuts() {
    if (!shortcutsModal) return;
    shortcutsModal.hidden = false;
    shortcutsModal.setAttribute("aria-hidden", "false");
    showToast("快捷键说明已打开");
  }

  function closeShortcuts() {
    if (!shortcutsModal || shortcutsModal.hidden) return;
    shortcutsModal.hidden = true;
    shortcutsModal.setAttribute("aria-hidden", "true");
  }

  function scrollStep(delta) {
    window.scrollBy({ top: delta, behavior: "smooth" });
  }

  function jumpHeading(direction) {
    const nodes = [...document.querySelectorAll("#hd-content h2[id], #hd-content h3[id], #hd-content h4[id]")];
    if (!nodes.length) return;
    const currentY = window.scrollY + 96;
    if (direction > 0) {
      const target = nodes.find((el) => el.offsetTop > currentY + 4) || nodes[nodes.length - 1];
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const reversed = [...nodes].reverse();
    const target = reversed.find((el) => el.offsetTop < currentY - 4) || nodes[0];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goSearch() {
    const input = document.getElementById("hd-search-q");
    if (input && typeof input.focus === "function") {
      input.focus();
      input.select && input.select();
      return;
    }
    if (cfg.searchHref) window.location.href = cfg.searchHref;
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
    const active = document.activeElement;
    return !!(active && active instanceof Element && active.closest("input, textarea, select, [contenteditable='true']"));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.tid);
    showToast.tid = setTimeout(() => {
      toast.hidden = true;
    }, 1200);
  }
  showToast.tid = 0;

  function bindEvents() {
    document.addEventListener("keydown", onKeydown);
    shortcutsBtn && shortcutsBtn.addEventListener("click", openShortcuts);
    shortcutsClose && shortcutsClose.addEventListener("click", closeShortcuts);
    themeBtn && themeBtn.addEventListener("click", cycleTheme);
    shortcutsModal && shortcutsModal.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target === shortcutsModal) closeShortcuts();
      const presetBtn = target.closest("[data-theme-id]");
      if (presetBtn) {
        const id = presetBtn.getAttribute("data-theme-id");
        if (id) {
          applyTheme(id);
          showToast("主题已切换: " + id);
        }
      }
    });
  }

  function onKeydown(e) {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key;
    const lower = key.toLowerCase();

    if (key === "Escape") {
      closeShortcuts();
      gPending = false;
      return;
    }
    if (e.shiftKey && lower === "t") {
      e.preventDefault();
      cycleTheme();
      return;
    }
    if (key === "?" && !isEditableTarget(e.target)) {
      e.preventDefault();
      openShortcuts();
      return;
    }
    if (!shortcutsModal || !shortcutsModal.hidden) {
      return;
    }
    if (isEditableTarget(e.target)) return;

    if (lower === "/") {
      e.preventDefault();
      goSearch();
      return;
    }
    if (lower === "j") {
      e.preventDefault();
      scrollStep(72);
      return;
    }
    if (lower === "k") {
      e.preventDefault();
      scrollStep(-72);
      return;
    }
    if (lower === "d") {
      e.preventDefault();
      scrollStep(Math.round(window.innerHeight * 0.5));
      return;
    }
    if (lower === "u") {
      e.preventDefault();
      scrollStep(-Math.round(window.innerHeight * 0.5));
      return;
    }
    if (lower === "n") {
      e.preventDefault();
      jumpHeading(1);
      return;
    }
    if (lower === "p") {
      e.preventDefault();
      jumpHeading(-1);
      return;
    }
    if (lower === "g") {
      e.preventDefault();
      if (e.shiftKey || key === "G") {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        return;
      }
      if (gPending) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        gPending = false;
        clearTimeout(gTimer);
      } else {
        gPending = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPending = false;
        }, 420);
      }
      return;
    }
    if (lower === "z") {
      e.preventDefault();
      toggleImmersive();
      return;
    }
    if (lower === "c") {
      e.preventDefault();
      toggleSidebar();
      return;
    }
    if (lower === "t") {
      e.preventDefault();
      toggleToc();
      return;
    }
    if (lower === "w") {
      e.preventDefault();
      cycleWidth();
    }
  }
})();
`;
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
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
