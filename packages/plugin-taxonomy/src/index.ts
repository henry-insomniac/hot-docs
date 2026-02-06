import type { ContentEntry, HotDocsPlugin, PluginVirtualPage } from "@hot-docs/core";
import { joinUrlPath, toPageHref, trimTrailingSlash } from "@hot-docs/core";

type TaxonomyPluginOptions = {
  routeBase?: string;
  includeCollections?: string[];
};

type CategoryBucket = {
  category: string;
  slug: string;
  entries: ContentEntry[];
};

export default function taxonomyPlugin(options?: Partial<TaxonomyPluginOptions>): HotDocsPlugin {
  const routeBase = normalizeRouteBase(options?.routeBase);
  const includeCollections = normalizeIncludeCollections(options?.includeCollections);

  return {
    name: "@hot-docs/plugin-taxonomy",
    apiVersion: 1,
    capabilities: ["routes"],
    routes: {
      pages: async (ctx) => {
        const buckets = buildCategoryBuckets(ctx.index.entriesByRoute.values(), includeCollections);
        const pages: PluginVirtualPage[] = [];

        pages.push({
          routePath: routeBase,
          title: "Categories",
          html: renderCategoryIndexHtml(ctx.config.site.base, routeBase, buckets)
        });

        for (const bucket of buckets) {
          const routePath = joinUrlPath(routeBase, bucket.slug);
          pages.push({
            routePath,
            title: `Category: ${bucket.category}`,
            html: renderCategoryDetailHtml(ctx.config.site.base, routeBase, bucket)
          });
        }

        return pages;
      }
    }
  };
}

function normalizeRouteBase(value: string | undefined): string {
  const trimmed = trimTrailingSlash(String(value ?? "/categories").trim() || "/categories");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeIncludeCollections(value: string[] | undefined): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((item) => String(item).trim()).filter(Boolean);
  return items.length ? new Set(items) : undefined;
}

function buildCategoryBuckets(entries: Iterable<ContentEntry>, includeCollections: Set<string> | undefined): CategoryBucket[] {
  const categoryMap = new Map<string, ContentEntry[]>();

  for (const entry of entries) {
    if (includeCollections && !includeCollections.has(entry.collection)) continue;
    const categories = collectCategories(entry);
    for (const category of categories) {
      const list = categoryMap.get(category) ?? [];
      list.push(entry);
      categoryMap.set(category, list);
    }
  }

  const sortedCategories = [...categoryMap.keys()].sort((a, b) => {
    const diff = (categoryMap.get(b)?.length ?? 0) - (categoryMap.get(a)?.length ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b, "zh-Hans-CN");
  });

  const slugs = buildUniqueSlugs(sortedCategories);

  return sortedCategories.map((category) => ({
    category,
    slug: slugs.get(category) ?? "category",
    entries: sortEntries(categoryMap.get(category) ?? [])
  }));
}

function collectCategories(entry: ContentEntry): string[] {
  const out: string[] = [];

  if (Array.isArray(entry.categories)) {
    for (const item of entry.categories) {
      const category = String(item ?? "").trim();
      if (category) out.push(category);
    }
  }

  if (typeof entry.category === "string" && entry.category.trim()) out.push(entry.category.trim());
  return out.length ? [...new Set(out)] : [];
}

function buildUniqueSlugs(categories: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Map<string, number>();

  for (const category of categories) {
    const base = slugify(category) || "category";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    out.set(category, count === 0 ? base : `${base}-${count + 1}`);
  }

  return out;
}

function sortEntries(entries: ContentEntry[]): ContentEntry[] {
  return [...entries].sort((a, b) => {
    const diff = getEntryTime(b) - getEntryTime(a);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "zh-Hans-CN");
  });
}

function getEntryTime(entry: ContentEntry): number {
  const raw = entry.updated ?? entry.date;
  if (raw) {
    const time = Date.parse(raw);
    if (Number.isFinite(time)) return time;
  }
  return entry.mtimeMs;
}

function renderCategoryIndexHtml(siteBase: string, routeBase: string, buckets: CategoryBucket[]): string {
  const intro = `<p>按分类浏览站点内容（docs/blog/pages）。</p>`;
  const searchHref = toPageHref(siteBase, "/search");
  const actions = `<p><a href="${searchHref}">进入搜索</a></p>`;

  if (!buckets.length) return `<h1>Categories</h1>${intro}${actions}<p>暂无分类。</p>`;

  const list = buckets
    .map((bucket) => {
      const href = toPageHref(siteBase, joinUrlPath(routeBase, bucket.slug));
      const latest = bucket.entries[0] ? formatDate(bucket.entries[0]) : "-";
      return (
        `<li>` +
        `<a href="${href}">${escapeHtml(bucket.category)}</a> ` +
        `<small>(${bucket.entries.length})</small> ` +
        `<small>最近更新：${escapeHtml(latest)}</small>` +
        `</li>`
      );
    })
    .join("");

  return `<h1>Categories</h1>${intro}${actions}<ul>${list}</ul>`;
}

function renderCategoryDetailHtml(siteBase: string, routeBase: string, bucket: CategoryBucket): string {
  const backHref = toPageHref(siteBase, routeBase);
  const searchHref = `${toPageHref(siteBase, "/search")}?q=${encodeURIComponent(bucket.category)}`;
  const actions = `<p><a href="${backHref}">返回分类列表</a> · <a href="${searchHref}">在搜索页中查找此分类</a></p>`;

  if (!bucket.entries.length) {
    return `<h1>${escapeHtml(bucket.category)}</h1>${actions}<p>该分类暂无内容。</p>`;
  }

  const list = bucket.entries
    .map((entry) => {
      const href = toPageHref(siteBase, entry.routePath);
      const summary = (entry.summary ?? entry.description ?? "").trim();
      const meta = `${entry.collection} · ${formatDate(entry)}`;
      const summaryHtml = summary ? `<div class="hd-taxonomy-summary">${escapeHtml(summary)}</div>` : "";
      return (
        `<li class="hd-taxonomy-item">` +
        `<a href="${href}">${escapeHtml(entry.title)}</a>` +
        `<div><small>${escapeHtml(meta)}</small></div>` +
        `${summaryHtml}` +
        `</li>`
      );
    })
    .join("");

  return `<h1>${escapeHtml(bucket.category)}</h1>${actions}<ul>${list}</ul>`;
}

function formatDate(entry: ContentEntry): string {
  const raw = entry.updated ?? entry.date;
  if (raw) return raw;
  const date = new Date(entry.mtimeMs);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function slugify(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\u4e00-\u9fff -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
