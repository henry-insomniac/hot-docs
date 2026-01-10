import { toPageHref, withBase } from "@hot-docs/core";
import type { HotDocsPlugin } from "@hot-docs/core";

type FeedPluginOptions = {
  siteUrl: string;
  outFile?: string;
  title?: string;
  description?: string;
  limit?: number;
};

export default function feedPlugin(options?: Partial<FeedPluginOptions>): HotDocsPlugin {
  return {
    name: "@hot-docs/plugin-feed",
    apiVersion: 1,
    capabilities: ["build"],
    hooks: {
      build: async (ctx) => {
        const siteUrl = normalizeSiteUrl(options?.siteUrl);
        const outFile = (options?.outFile ?? "feed.xml").replace(/^\/+/, "") || "feed.xml";
        const limit = typeof options?.limit === "number" && Number.isFinite(options.limit) ? Math.max(1, Math.floor(options.limit)) : 20;

        const items = [...ctx.index.entriesByRoute.values()]
          .filter((entry) => ctx.config.collections[entry.collection]?.type === "blog")
          .map((entry) => ({ entry, date: pickEntryDate(entry) }))
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, limit);

        const channelTitle = (options?.title ?? ctx.config.site.title).trim() || ctx.config.site.title;
        const channelDesc = (options?.description ?? "").trim();
        const channelLink = new URL(withBase(ctx.config.site.base, "/"), siteUrl).toString();

        const selfLink = new URL(withBase(ctx.config.site.base, `/${outFile}`), siteUrl).toString();

        const itemXml = items
          .map(({ entry, date }) => {
            const href = toPageHref(ctx.config.site.base, entry.routePath);
            const link = new URL(href, siteUrl).toString();
            const guid = link;
            const pubDate = date.toUTCString();
            const desc = (entry.summary ?? entry.description ?? "").trim();
            return (
              `  <item>\n` +
              `    <title>${escapeXml(entry.title)}</title>\n` +
              `    <link>${escapeXml(link)}</link>\n` +
              `    <guid isPermaLink="true">${escapeXml(guid)}</guid>\n` +
              `    <pubDate>${escapeXml(pubDate)}</pubDate>\n` +
              (desc ? `    <description>${escapeXml(desc)}</description>\n` : "") +
              `  </item>`
            );
          })
          .join("\n");

        const rss =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
          `<channel>\n` +
          `  <title>${escapeXml(channelTitle)}</title>\n` +
          `  <link>${escapeXml(channelLink)}</link>\n` +
          (channelDesc ? `  <description>${escapeXml(channelDesc)}</description>\n` : `  <description></description>\n`) +
          `  <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />\n` +
          `${itemXml}\n` +
          `</channel>\n` +
          `</rss>\n`;

        await ctx.emitFile(outFile, rss);
      }
    }
  };
}

function pickEntryDate(entry: { updated?: string; date?: string; mtimeMs: number }): Date {
  const candidate = entry.updated ?? entry.date;
  if (candidate) {
    const d = new Date(candidate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(entry.mtimeMs);
}

function normalizeSiteUrl(siteUrl: string | undefined): string {
  const raw = (siteUrl ?? "").trim();
  if (!raw) throw new Error("feed 插件缺少 options.siteUrl（例如 https://example.com）");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`feed 插件 options.siteUrl 不是合法 URL：${raw}`);
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

