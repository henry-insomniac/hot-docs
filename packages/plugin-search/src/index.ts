import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import type { ContentIndex, HotDocsConfig, HotDocsPlugin, PluginVirtualPage } from "@hot-docs/core";
import { trimTrailingSlash } from "@hot-docs/core";

type SearchPluginOptions = {
  routePath?: string;
  outFile?: string;
  maxTextLength?: number;
};

type SearchIndexItem = {
  routePath: string;
  title: string;
  collection: string;
  summary?: string;
  tags?: string[];
  category?: string;
  date?: string;
  text?: string;
};

export default function searchPlugin(options?: Partial<SearchPluginOptions>): HotDocsPlugin {
  return {
    name: "@hot-docs/plugin-search",
    apiVersion: 1,
    capabilities: ["routes", "build"],
    routes: {
      pages: async (ctx) => {
        const routePath = normalizeRoutePath(options?.routePath ?? "/search");
        const items = await buildSearchIndex(ctx.config, ctx.index, {
          maxTextLength: options?.maxTextLength
        });

        const html = renderSearchPageHtml(ctx.config, items);
        const page: PluginVirtualPage = { routePath, title: "Search", html };
        return [page];
      }
    },
    hooks: {
      build: async (ctx) => {
        const outFile = (options?.outFile ?? "search-index.json").replace(/^\/+/, "") || "search-index.json";
        const items = await buildSearchIndex(ctx.config, ctx.index, {
          maxTextLength: options?.maxTextLength
        });
        await ctx.emitFile(outFile, JSON.stringify({ version: 1, items }, null, 2));
      }
    }
  };
}

function normalizeRoutePath(routePath: string): string {
  const trimmed = trimTrailingSlash(String(routePath ?? "").trim() || "/");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function buildSearchIndex(
  config: HotDocsConfig,
  index: ContentIndex,
  options: { maxTextLength?: number }
): Promise<SearchIndexItem[]> {
  const maxTextLength =
    typeof options.maxTextLength === "number" && Number.isFinite(options.maxTextLength) ? Math.max(0, Math.floor(options.maxTextLength)) : 1200;

  const entries = [...index.entriesByRoute.values()];
  const items: SearchIndexItem[] = [];

  for (const entry of entries) {
    const collection = config.collections[entry.collection];
    if (!collection) continue;

    const item: SearchIndexItem = {
      routePath: entry.routePath,
      title: entry.title,
      collection: entry.collection,
      summary: (entry.summary ?? entry.description ?? "").trim() || undefined,
      tags: entry.tags,
      category: entry.category,
      date: entry.date ?? entry.updated
    };

    const filePath = path.join(config.contentDir, collection.dir, ...entry.relativePath.split("/"));
    const text = await readEntryPlainText(filePath);
    if (text) item.text = maxTextLength ? text.slice(0, maxTextLength) : text;

    items.push(item);
  }

  return items;
}

async function readEntryPlainText(filePath: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const content = matter(raw).content;
    return markdownToText(content);
  } catch {
    return undefined;
  }
}

function markdownToText(markdown: string): string {
  return (
    markdown
      // fenced code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // inline code
      .replace(/`[^`]*`/g, " ")
      // images: ![alt](url) -> alt
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
      // links: [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
      // headings/blockquote/list markers
      .replace(/^(\s{0,3}#{1,6}\s+|\s{0,3}>\s+|\s{0,3}[-*+]\s+|\s{0,3}\d+\.\s+)/gm, " ")
      // emphasis
      .replace(/[*_~]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function renderSearchPageHtml(config: HotDocsConfig, items: SearchIndexItem[]): string {
  const base = config.site.base;
  const dataLiteral = safeJsonForInlineScript({ version: 1, items });
  const inputId = "hd-search-q";
  const resultsId = "hd-search-results";

  return (
    `<h1>Search</h1>` +
    `<p><small>共 ${items.length} 条索引</small></p>` +
    `<p><input id="${inputId}" class="hd-search-input" type="search" placeholder="输入关键词…" autocomplete="off" /></p>` +
    `<ul id="${resultsId}" class="hd-search-results"></ul>` +
    `<script type="module">\n` +
    `const base = ${JSON.stringify(base)};\n` +
    `const input = document.getElementById(${JSON.stringify(inputId)});\n` +
    `const results = document.getElementById(${JSON.stringify(resultsId)});\n` +
    `const data = ${dataLiteral};\n` +
    `const items = Array.isArray(data.items) ? data.items : [];\n` +
    `function withBase(p){\n` +
    `  if (base === "/") return p;\n` +
    `  if (p === "/") return base;\n` +
    `  return (base.endsWith("/") ? base.slice(0, -1) : base) + p;\n` +
    `}\n` +
    `function toPageHref(routePath){\n` +
    `  const r = (routePath || "/").replace(/\\/+$/,"") || "/";\n` +
    `  if (r === "/") return withBase("/");\n` +
    `  return withBase(r) + "/";\n` +
    `}\n` +
    `function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}\n` +
    `function render(list){\n` +
    `  if (!results) return;\n` +
    `  if (list.length === 0) { results.innerHTML = ""; return; }\n` +
    `  results.innerHTML = list.map((it)=>{\n` +
    `    const href = toPageHref(it.routePath);\n` +
    `    const title = it.title || it.routePath;\n` +
    `    const summary = (it.summary || "").trim();\n` +
    `    return '<li class=\"hd-search-item\"><a href=\"' + href + '\">' + esc(title) + '</a>' + (summary ? ('<div class=\"hd-search-summary\">' + esc(summary) + '</div>') : '') + '</li>';\n` +
    `  }).join(\"\");\n` +
    `}\n` +
    `function search(q){\n` +
    `  const raw = String(q || \"\").trim().toLowerCase();\n` +
    `  if (!raw) return [];\n` +
    `  const terms = raw.split(/\\s+/g).filter(Boolean);\n` +
    `  return items.filter((it)=>{\n` +
    `    const hay = ((it.title||\"\") + \" \" + (it.summary||\"\") + \" \" + (it.text||\"\")).toLowerCase();\n` +
    `    return terms.every((t)=> hay.includes(t));\n` +
    `  }).slice(0, 50);\n` +
    `}\n` +
    `if (input) {\n` +
    `  input.addEventListener(\"input\", ()=> render(search(input.value)));\n` +
    `  input.addEventListener(\"keydown\", (e)=>{ if (e.key === \"Escape\") { input.value = \"\"; render([]); } });\n` +
    `  input.focus();\n` +
    `}\n` +
    `</script>`
  );
}

function safeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
