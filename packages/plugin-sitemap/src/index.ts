import { listBlogVirtualPages, toPageHref } from "@hot-docs/core";
import type { HotDocsPlugin } from "@hot-docs/core";

type SitemapPluginOptions = {
  siteUrl: string;
  outFile?: string;
};

export default function sitemapPlugin(options?: Partial<SitemapPluginOptions>): HotDocsPlugin {
  return {
    name: "@hot-docs/plugin-sitemap",
    apiVersion: 1,
    capabilities: ["build"],
    hooks: {
      build: async (ctx) => {
        const siteUrl = normalizeSiteUrl(options?.siteUrl);
        const outFile = (options?.outFile ?? "sitemap.xml").replace(/^\/+/, "") || "sitemap.xml";

        const urls = [...ctx.index.entriesByRoute.values()]
          .sort((a, b) => a.routePath.localeCompare(b.routePath))
          .map((entry) => {
            const href = toPageHref(ctx.config.site.base, entry.routePath);
            const loc = new URL(href, siteUrl).toString();
            const lastmod = new Date(entry.mtimeMs).toISOString();
            return { loc, lastmod };
          });

        const blogEntries = [...ctx.index.entriesByRoute.values()].filter((e) => ctx.config.collections[e.collection]?.type === "blog");
        const blogLastMod = blogEntries.length ? new Date(Math.max(...blogEntries.map((e) => e.mtimeMs))).toISOString() : undefined;
        const blogVirtualPages = listBlogVirtualPages(ctx.config, ctx.index).filter((p) => !ctx.index.entriesByRoute.has(p.routePath));
        for (const page of blogVirtualPages) {
          const href = toPageHref(ctx.config.site.base, page.routePath);
          const loc = new URL(href, siteUrl).toString();
          urls.push({ loc, lastmod: blogLastMod ?? "" });
        }

        const dedup = new Map<string, string>();
        for (const u of urls) {
          const prev = dedup.get(u.loc);
          if (!prev) {
            dedup.set(u.loc, u.lastmod);
            continue;
          }
          if (u.lastmod && (!prev || u.lastmod > prev)) dedup.set(u.loc, u.lastmod);
        }

        const body = [...dedup.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([loc, lastmod]) => {
            const lastmodXml = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "";
            return `  <url><loc>${escapeXml(loc)}</loc>${lastmodXml}</url>`;
          })
          .join("\n");
        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${body}\n` +
          `</urlset>\n`;

        await ctx.emitFile(outFile, xml);
      }
    }
  };
}

function normalizeSiteUrl(siteUrl: string | undefined): string {
  const raw = (siteUrl ?? "").trim();
  if (!raw) throw new Error("sitemap 插件缺少 options.siteUrl（例如 https://example.com）");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`sitemap 插件 options.siteUrl 不是合法 URL：${raw}`);
  }
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.toString();
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
