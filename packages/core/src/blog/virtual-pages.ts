import crypto from "node:crypto";
import path from "node:path";

import type { ContentEntry, ContentIndex, HotDocsConfig } from "../types.js";
import { normalizePathname, stripBase, toPageHref, trimTrailingSlash, withBase } from "../utils/base.js";
import { joinUrlPath } from "../utils/routes.js";

export type BlogVirtualPage = {
  routePath: string;
  title: string;
  html: string;
  hash: string;
};

export type BlogVirtualPagesOptions = {
  pageSize?: number;
};

export function listBlogVirtualPages(
  config: HotDocsConfig,
  index: ContentIndex,
  options: BlogVirtualPagesOptions = {}
): BlogVirtualPage[] {
  const pageSize = normalizePageSize(options.pageSize);
  const pages: BlogVirtualPage[] = [];

  for (const [collectionId, collection] of Object.entries(config.collections)) {
    if (collection.type !== "blog") continue;

    const entries = collectCollectionEntries(index, collectionId);
    const sorted = sortBlogEntries(entries);

    const blogBase = trimTrailingSlash(collection.routeBase);

    pages.push(...buildBlogIndexPages(config, blogBase, sorted, pageSize));
    pages.push(buildTagsIndexPage(config, blogBase, sorted));
    pages.push(...buildTagPages(config, blogBase, sorted));
    pages.push(buildCategoriesIndexPage(config, blogBase, sorted));
    pages.push(...buildCategoryPages(config, blogBase, sorted));
    pages.push(buildArchivePage(config, blogBase, sorted));
  }

  return pages;
}

export function getBlogVirtualPage(
  routePath: string,
  config: HotDocsConfig,
  index: ContentIndex,
  options: BlogVirtualPagesOptions = {}
): BlogVirtualPage | undefined {
  const normalized = trimTrailingSlash(routePath || "/");
  return listBlogVirtualPages(config, index, options).find((p) => trimTrailingSlash(p.routePath) === normalized);
}

export function listBlogVirtualRoutePaths(
  config: HotDocsConfig,
  index: ContentIndex,
  options: BlogVirtualPagesOptions = {}
): string[] {
  return listBlogVirtualPages(config, index, options).map((p) => p.routePath);
}

function normalizePageSize(pageSize: number | undefined): number {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize)) return 10;
  return Math.max(1, Math.floor(pageSize));
}

function collectCollectionEntries(index: ContentIndex, collectionId: string): ContentEntry[] {
  const entries: ContentEntry[] = [];
  for (const entry of index.entriesByRoute.values()) {
    if (entry.collection === collectionId) entries.push(entry);
  }
  return entries;
}

function sortBlogEntries(entries: ContentEntry[]): ContentEntry[] {
  return [...entries].sort((a, b) => getEntryTime(b) - getEntryTime(a));
}

function getEntryTime(entry: ContentEntry): number {
  const candidate = entry.updated ?? entry.date;
  if (candidate) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return entry.mtimeMs;
}

function formatEntryDate(entry: ContentEntry): string {
  const candidate = entry.updated ?? entry.date;
  if (candidate) return candidate;
  const d = new Date(entry.mtimeMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildBlogIndexPages(config: HotDocsConfig, blogBase: string, entries: ContentEntry[], pageSize: number): BlogVirtualPage[] {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const pages: BlogVirtualPage[] = [];

  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * pageSize;
    const slice = entries.slice(start, start + pageSize);

    const routePath = page === 1 ? blogBase : joinUrlPath(blogBase, `page/${page}`);
    const title = page === 1 ? "Blog" : `Blog - 第 ${page} 页`;
    const html = renderBlogListHtml(config, blogBase, slice, { page, totalPages });
    const hash = computeHash({ kind: "blog-index", blogBase, page, totalPages, entries: slice });

    pages.push({ routePath, title, html, hash });
  }

  return pages;
}

function renderBlogListHtml(
  config: HotDocsConfig,
  blogBase: string,
  entries: ContentEntry[],
  pager: { page: number; totalPages: number }
): string {
  const tabs = renderBlogTabs(config, blogBase, "blog");

  const items = renderEntryList(config, blogBase, entries);

  const pagerHtml = renderPager(config, blogBase, pager.page, pager.totalPages);

  return `<h1>Blog</h1>${tabs}${items}${pagerHtml}`;
}

function renderPager(config: HotDocsConfig, blogBase: string, page: number, totalPages: number): string {
  if (totalPages <= 1) return "";

  const parts: string[] = [];
  if (page > 1) {
    const prevRoute = page === 2 ? blogBase : joinUrlPath(blogBase, `page/${page - 1}`);
    parts.push(`<a href="${toPageHref(config.site.base, prevRoute)}">上一页</a>`);
  }
  parts.push(`<span>第 ${page}/${totalPages} 页</span>`);
  if (page < totalPages) {
    const nextRoute = joinUrlPath(blogBase, `page/${page + 1}`);
    parts.push(`<a href="${toPageHref(config.site.base, nextRoute)}">下一页</a>`);
  }

  return `<p>${parts.join(" · ")}</p>`;
}

function buildTagsIndexPage(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): BlogVirtualPage {
  const tags = collectTagMap(entries);
  const routePath = joinUrlPath(blogBase, "tags");
  const title = "Tags";
  const tabs = renderBlogTabs(config, blogBase, "tags");

  const items =
    tags.size === 0
      ? `<p>暂无标签。</p>`
      : `<ul>${[...tags.entries()]
          .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
          .map(([tag, list]) => {
            const tagRoute = joinUrlPath(blogBase, `tags/${encodeURIComponent(tag)}`);
            return `<li><a href="${toPageHref(config.site.base, tagRoute)}">${escapeHtml(tag)}</a> <small>(${list.length})</small></li>`;
          })
          .join("")}</ul>`;

  const html = `<h1>Tags</h1>${tabs}${items}`;
  const hash = computeHash({ kind: "tags-index", blogBase, tags: [...tags.entries()].map(([k, v]) => [k, v.map((e) => e.id)]) });
  return { routePath, title, html, hash };
}

function buildTagPages(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): BlogVirtualPage[] {
  const tags = collectTagMap(entries);
  const pages: BlogVirtualPage[] = [];

  for (const [tag, list] of tags.entries()) {
    const routePath = joinUrlPath(blogBase, `tags/${encodeURIComponent(tag)}`);
    const title = `Tag: ${tag}`;
    const tabs = renderBlogTabs(config, blogBase, "tags");
    const items = renderEntryList(config, blogBase, list);
    const html = `<h1>${escapeHtml(tag)}</h1>${tabs}${items}`;
    const hash = computeHash({ kind: "tag", blogBase, tag, entries: list.map((e) => e.id) });
    pages.push({ routePath, title, html, hash });
  }

  return pages;
}

function buildCategoriesIndexPage(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): BlogVirtualPage {
  const categories = collectCategoryMap(entries);
  const routePath = joinUrlPath(blogBase, "categories");
  const title = "Categories";
  const tabs = renderBlogTabs(config, blogBase, "categories");

  const items =
    categories.size === 0
      ? `<p>暂无分类。</p>`
      : `<ul>${[...categories.entries()]
          .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
          .map(([category, list]) => {
            const catRoute = joinUrlPath(blogBase, `categories/${encodeURIComponent(category)}`);
            return `<li><a href="${toPageHref(config.site.base, catRoute)}">${escapeHtml(category)}</a> <small>(${list.length})</small></li>`;
          })
          .join("")}</ul>`;

  const html = `<h1>Categories</h1>${tabs}${items}`;
  const hash = computeHash({
    kind: "categories-index",
    blogBase,
    categories: [...categories.entries()].map(([k, v]) => [k, v.map((e) => e.id)])
  });
  return { routePath, title, html, hash };
}

function buildCategoryPages(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): BlogVirtualPage[] {
  const categories = collectCategoryMap(entries);
  const pages: BlogVirtualPage[] = [];

  for (const [category, list] of categories.entries()) {
    const routePath = joinUrlPath(blogBase, `categories/${encodeURIComponent(category)}`);
    const title = `Category: ${category}`;
    const tabs = renderBlogTabs(config, blogBase, "categories");
    const items = renderEntryList(config, blogBase, list);
    const html = `<h1>${escapeHtml(category)}</h1>${tabs}${items}`;
    const hash = computeHash({ kind: "category", blogBase, category, entries: list.map((e) => e.id) });
    pages.push({ routePath, title, html, hash });
  }

  return pages;
}

function buildArchivePage(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): BlogVirtualPage {
  const routePath = joinUrlPath(blogBase, "archive");
  const title = "Archive";
  const tabs = renderBlogTabs(config, blogBase, "archive");

  const groups = groupEntriesByMonth(entries);
  const body =
    groups.length === 0
      ? `<p>暂无归档。</p>`
      : groups
          .map((g) => `<h2>${escapeHtml(g.key)}</h2>${renderEntryList(config, blogBase, g.entries)}`)
          .join("");

  const html = `<h1>Archive</h1>${tabs}${body}`;
  const hash = computeHash({ kind: "archive", blogBase, groups: groups.map((g) => [g.key, g.entries.map((e) => e.id)]) });
  return { routePath, title, html, hash };
}

function renderBlogTabs(config: HotDocsConfig, blogBase: string, active: "blog" | "tags" | "categories" | "archive"): string {
  const items: Array<{ key: typeof active; label: string; routePath: string }> = [
    { key: "blog", label: "列表", routePath: blogBase },
    { key: "tags", label: "Tags", routePath: joinUrlPath(blogBase, "tags") },
    { key: "categories", label: "Categories", routePath: joinUrlPath(blogBase, "categories") },
    { key: "archive", label: "Archive", routePath: joinUrlPath(blogBase, "archive") }
  ];

  return (
    `<p>` +
    items
      .map((it) => {
        const label = it.key === active ? `<strong>${escapeHtml(it.label)}</strong>` : escapeHtml(it.label);
        return `<a href="${toPageHref(config.site.base, it.routePath)}">${label}</a>`;
      })
      .join(" · ") +
    `</p>`
  );
}

function renderEntryList(config: HotDocsConfig, blogBase: string, entries: ContentEntry[]): string {
  if (entries.length === 0) return `<p>暂无文章。</p>`;
  return `<ul class="hd-blog-list">${entries.map((entry) => renderEntryListItem(config, blogBase, entry)).join("")}</ul>`;
}

function renderEntryListItem(config: HotDocsConfig, blogBase: string, entry: ContentEntry): string {
  const href = toPageHref(config.site.base, entry.routePath);
  const dateText = formatEntryDate(entry);
  const draft = entry.draft ? ` <span class="hd-blog-draft">（草稿）</span>` : "";
  const summary = (entry.summary ?? entry.description ?? "").trim();
  const summaryHtml = summary ? `<div class="hd-blog-summary">${escapeHtml(summary)}</div>` : "";

  const coverSrc = resolveCoverSrc(config, blogBase, entry);
  const coverAlt = (entry.coverAlt ?? entry.title ?? "").trim();
  const coverHtml = coverSrc
    ? `<a class="hd-blog-cover" href="${href}"><img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(coverAlt)}" loading="lazy" /></a>`
    : "";

  return (
    `<li class="hd-blog-item">` +
    `${coverHtml}` +
    `<div class="hd-blog-meta">` +
    `<a class="hd-blog-title" href="${href}">${escapeHtml(entry.title)}</a>` +
    `<div class="hd-blog-sub"><small>${escapeHtml(dateText)}${draft}</small></div>` +
    `${summaryHtml}` +
    `</div>` +
    `</li>`
  );
}

function resolveCoverSrc(config: HotDocsConfig, blogBase: string, entry: ContentEntry): string | undefined {
  const raw = typeof entry.cover === "string" ? entry.cover.trim() : "";
  if (!raw) return undefined;
  const unsafe = /^javascript:/i.test(raw) || /^vbscript:/i.test(raw);
  if (unsafe) return undefined;
  if (hasScheme(raw) || raw.startsWith("//")) return raw;

  const { pathname, query, hash } = splitUrl(raw);
  if (pathname.startsWith("/")) {
    const rebased = rebaseAbsolutePath(config.site.base, pathname);
    return rebased ? `${rebased}${query}${hash}` : undefined;
  }

  const entryDir = path.posix.dirname(entry.relativePath);
  const joined = path.posix.normalize(path.posix.join(entryDir === "." ? "" : entryDir, pathname));
  if (joined === ".." || joined.startsWith("../")) return undefined;

  const assetRoutePath = joinUrlPath(blogBase, joined);
  return `${withBase(config.site.base, assetRoutePath)}${query}${hash}`;
}

function splitUrl(url: string): { pathname: string; query: string; hash: string } {
  let rest = url;
  let hash = "";
  let query = "";

  const hashIndex = rest.indexOf("#");
  if (hashIndex >= 0) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  const queryIndex = rest.indexOf("?");
  if (queryIndex >= 0) {
    query = rest.slice(queryIndex);
    rest = rest.slice(0, queryIndex);
  }

  return { pathname: rest, query, hash };
}

function hasScheme(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function rebaseAbsolutePath(siteBase: string, absolutePath: string): string | undefined {
  const abs = normalizePathname(absolutePath);
  const withoutBase = stripBase(siteBase, abs);

  // 如果用户已经手动写了带 base 的绝对路径（例如 /docs/...），则保持不变
  if (siteBase !== "/" && withoutBase !== abs) return abs;

  return withBase(siteBase, abs);
}

function collectTagMap(entries: ContentEntry[]): Map<string, ContentEntry[]> {
  const map = new Map<string, ContentEntry[]>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      const t = typeof tag === "string" ? tag.trim() : "";
      if (!t) continue;
      const list = map.get(t) ?? [];
      list.push(entry);
      map.set(t, list);
    }
  }
  for (const list of map.values()) list.sort((a, b) => getEntryTime(b) - getEntryTime(a));
  return map;
}

function collectCategoryMap(entries: ContentEntry[]): Map<string, ContentEntry[]> {
  const map = new Map<string, ContentEntry[]>();
  for (const entry of entries) {
    const categories = entry.categories?.length ? entry.categories : entry.category ? [entry.category] : [];
    for (const category of categories) {
      const c = typeof category === "string" ? category.trim() : "";
      if (!c) continue;
      const list = map.get(c) ?? [];
      list.push(entry);
      map.set(c, list);
    }
  }
  for (const list of map.values()) list.sort((a, b) => getEntryTime(b) - getEntryTime(a));
  return map;
}

function groupEntriesByMonth(entries: ContentEntry[]): Array<{ key: string; entries: ContentEntry[] }> {
  const groups = new Map<string, ContentEntry[]>();
  for (const entry of entries) {
    const d = new Date(getEntryTime(entry));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  for (const list of groups.values()) list.sort((a, b) => getEntryTime(b) - getEntryTime(a));

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({ key, entries: list }));
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function computeHash(value: unknown): string {
  const json = JSON.stringify(value);
  return crypto.createHash("sha1").update(json).digest("hex").slice(0, 12);
}
