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
  aliases?: string[];
  tags?: string[];
  categories?: string[];
  date?: string;
  headings?: string[];
  text?: string;
};

export default function searchPlugin(options?: Partial<SearchPluginOptions>): HotDocsPlugin {
  const outFile = (options?.outFile ?? "search-index.json").replace(/^\/+/, "") || "search-index.json";
  return {
    name: "@hot-docs/plugin-search",
    apiVersion: 1,
    capabilities: ["routes", "build"],
    routes: {
      pages: async (ctx) => {
        const routePath = normalizeRoutePath(options?.routePath ?? "/search");
        const html = renderSearchPageHtml(ctx.config, { indexFile: outFile, routePath });
        const page: PluginVirtualPage = { routePath, title: "Search", html };
        return [page];
      }
    },
    hooks: {
      build: async (ctx) => {
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
      aliases: entry.aliases,
      tags: entry.tags,
      categories: entry.categories?.length ? entry.categories : entry.category ? [entry.category] : undefined,
      date: entry.date ?? entry.updated
    };

    const filePath = path.join(config.contentDir, collection.dir, ...entry.relativePath.split("/"));
    const data = await readEntryPlainTextAndHeadings(filePath);
    if (data.text) item.text = maxTextLength ? data.text.slice(0, maxTextLength) : data.text;
    if (data.headings?.length) item.headings = data.headings;

    items.push(item);
  }

  return items;
}

async function readEntryPlainTextAndHeadings(filePath: string): Promise<{ text?: string; headings?: string[] }> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const content = matter(raw).content;
    return { text: markdownToText(content), headings: extractHeadings(content) };
  } catch {
    return {};
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

function extractHeadings(markdown: string): string[] {
  const stripped = markdown.replace(/```[\s\S]*?```/g, "\n");
  const out: string[] = [];
  for (const line of stripped.split(/\r?\n/)) {
    const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (!m?.[1]) continue;
    const title = m[1].trim();
    if (title) out.push(title);
  }
  return out.length ? [...new Set(out)] : [];
}

function renderSearchPageHtml(config: HotDocsConfig, options: { indexFile: string; routePath: string }): string {
  const base = config.site.base;
  const inputId = "hd-search-q";
  const resultsId = "hd-search-results";
  const collectionId = "hd-search-collection";
  const tagsId = "hd-search-tags";
  const categoriesId = "hd-search-categories";
  const indexUrl = withBasePath(base, `/${options.indexFile}`);

  return (
    `<h1>Search</h1>` +
    `<p><input id="${inputId}" class="hd-search-input" type="search" placeholder="输入关键词…" autocomplete="off" /></p>` +
    `<div class="hd-search-filters">` +
    `<label>Collection <select id="${collectionId}"><option value="">All</option></select></label>` +
    `<details><summary>Categories</summary><div id="${categoriesId}" class="hd-search-facet"></div></details>` +
    `<details><summary>Tags</summary><div id="${tagsId}" class="hd-search-facet"></div></details>` +
    `</div>` +
    `<ul id="${resultsId}" class="hd-search-results"></ul>` +
    `<script type="module">\n` +
    `const base = ${JSON.stringify(base)};\n` +
    `const indexUrl = ${JSON.stringify(indexUrl)};\n` +
    `const input = document.getElementById(${JSON.stringify(inputId)});\n` +
    `const results = document.getElementById(${JSON.stringify(resultsId)});\n` +
    `const collectionSel = document.getElementById(${JSON.stringify(collectionId)});\n` +
    `const tagsEl = document.getElementById(${JSON.stringify(tagsId)});\n` +
    `const catsEl = document.getElementById(${JSON.stringify(categoriesId)});\n` +
    `let items = [];\n` +
    `let docs = [];\n` +
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
    `function norm(s){return String(s||"").toLowerCase();}\n` +
    `function bigrams(s){\n` +
    `  const out=[];\n` +
    `  const str=String(s||"");\n` +
    `  if (str.length<=1) return str ? [str] : out;\n` +
    `  for (let i=0;i<=str.length-2;i++) out.push(str.slice(i,i+2));\n` +
    `  return out;\n` +
    `}\n` +
    `function parseQuery(q){\n` +
    `  const raw=String(q||"").trim();\n` +
    `  const words=(raw.toLowerCase().match(/[a-z0-9]+/g) || []).filter(Boolean);\n` +
    `  const cjk=(raw.match(/[\\u4e00-\\u9fff]+/g) || []).filter(Boolean);\n` +
    `  const cjkBigrams=[];\n` +
    `  for (const seq of cjk) cjkBigrams.push(...bigrams(seq));\n` +
    `  return { raw, words, cjk, cjkBigrams: Array.from(new Set(cjkBigrams.filter(Boolean))) };\n` +
    `}\n` +
    `function highlight(text, q){\n` +
    `  const raw = String(text||\"\");\n` +
    `  const ranges=[];\n` +
    `  const rawLower = raw.toLowerCase();\n` +
    `  function pushAll(hay, needle, offset, ci){\n` +
    `    const n = String(needle||\"\");\n` +
    `    if (!n) return;\n` +
    `    let from=0;\n` +
    `    const h = ci ? hay.toLowerCase() : hay;\n` +
    `    const nn = ci ? n.toLowerCase() : n;\n` +
    `    while(true){\n` +
    `      const i=h.indexOf(nn, from);\n` +
    `      if(i<0) break;\n` +
    `      ranges.push([offset+i, offset+i+nn.length]);\n` +
    `      from=i+nn.length;\n` +
    `    }\n` +
    `  }\n` +
    `  for (const w of (q.words||[])) pushAll(rawLower, w, 0, true);\n` +
    `  for (const c of (q.cjk||[])) pushAll(raw, c, 0, false);\n` +
    `  if (!ranges.length) return esc(raw);\n` +
    `  ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);\n` +
    `  const merged=[];\n` +
    `  for (const r of ranges){\n` +
    `    if (!merged.length || r[0] > merged[merged.length-1][1]) merged.push(r);\n` +
    `    else merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], r[1]);\n` +
    `  }\n` +
    `  let out=\"\";\n` +
    `  let last=0;\n` +
    `  for (const r of merged){\n` +
    `    out += esc(raw.slice(last, r[0]));\n` +
    `    out += \"<mark>\" + esc(raw.slice(r[0], r[1])) + \"</mark>\";\n` +
    `    last = r[1];\n` +
    `  }\n` +
    `  out += esc(raw.slice(last));\n` +
    `  return out;\n` +
    `}\n` +
    `function buildFacets(){\n` +
    `  const byCol=new Map();\n` +
    `  const byTag=new Map();\n` +
    `  const byCat=new Map();\n` +
    `  for (const it of items){\n` +
    `    byCol.set(it.collection, (byCol.get(it.collection)||0)+1);\n` +
    `    for (const t of (it.tags||[])) byTag.set(t, (byTag.get(t)||0)+1);\n` +
    `    for (const c of (it.categories||[])) byCat.set(c, (byCat.get(c)||0)+1);\n` +
    `  }\n` +
    `  if (collectionSel){\n` +
    `    const cols=[...byCol.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));\n` +
    `    collectionSel.innerHTML='<option value=\"\">All</option>'+cols.map(([k,v])=>'<option value=\"'+esc(k)+'\">'+esc(k)+' ('+v+')</option>').join('');\n` +
    `  }\n` +
    `  function renderFacet(target, entries, name){\n` +
    `    if(!target) return;\n` +
    `    if(entries.length===0){target.innerHTML='<p><small>None</small></p>'; return;}\n` +
    `    target.innerHTML=entries.map(([k,v])=>\n` +
    `      '<label style=\"display:block; margin:2px 0;\"><input type=\"checkbox\" name=\"'+name+'\" value=\"'+esc(k)+'\" /> '+esc(k)+' <small>('+v+')</small></label>'\n` +
    `    ).join('');\n` +
    `  }\n` +
    `  renderFacet(catsEl, [...byCat.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))), "categories");\n` +
    `  renderFacet(tagsEl, [...byTag.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))), "tags");\n` +
    `}\n` +
    `function selectedValues(container){\n` +
    `  if(!container) return new Set();\n` +
    `  const s=new Set();\n` +
    `  for (const el of container.querySelectorAll('input[type=\"checkbox\"]:checked')) s.add(el.value);\n` +
    `  return s;\n` +
    `}\n` +
    `function matchesFacets(it, facets){\n` +
    `  if (facets.collection && it.collection !== facets.collection) return false;\n` +
    `  if (facets.categories.size){\n` +
    `    const cats=Array.isArray(it.categories)?it.categories:[];\n` +
    `    if (!cats.some((c)=>facets.categories.has(c))) return false;\n` +
    `  }\n` +
    `  if (facets.tags.size){\n` +
    `    const tags=Array.isArray(it.tags)?it.tags:[];\n` +
    `    if (!tags.some((t)=>facets.tags.has(t))) return false;\n` +
    `  }\n` +
    `  return true;\n` +
    `}\n` +
    `function scoreDoc(doc, q){\n` +
    `  let score=0;\n` +
    `  const req=[...q.words, ...q.cjkBigrams];\n` +
    `  for (const tok of req){\n` +
    `    if (!tok) continue;\n` +
    `    let w=0;\n` +
    `    if (doc.title.includes(tok)) w=Math.max(w, 30);\n` +
    `    if (doc.aliases.includes(tok)) w=Math.max(w, 26);\n` +
    `    if (doc.tags.includes(tok) || doc.categories.includes(tok)) w=Math.max(w, 22);\n` +
    `    if (doc.headings.includes(tok)) w=Math.max(w, 16);\n` +
    `    if (doc.summary.includes(tok)) w=Math.max(w, 10);\n` +
    `    if (doc.text.includes(tok)) w=Math.max(w, 4);\n` +
    `    score += w;\n` +
    `  }\n` +
    `  if (q.raw && doc.title.startsWith(norm(q.raw))) score += 8;\n` +
    `  return score;\n` +
    `}\n` +
    `function render(list){\n` +
    `  if (!results) return;\n` +
    `  if (list.length === 0) { results.innerHTML = ""; return; }\n` +
    `  results.innerHTML = list.map((r)=>{\n` +
    `    const it=r.item;\n` +
    `    const href = toPageHref(it.routePath);\n` +
    `    const title = it.title || it.routePath;\n` +
    `    const summary = (it.summary || it.text || \"\").trim();\n` +
    `    const titleHtml = r.q ? highlight(title, r.q) : esc(title);\n` +
    `    const summaryHtml = r.q ? highlight(summary, r.q) : esc(summary);\n` +
    `    const meta = [it.collection, ...(it.categories||[]).slice(0,3), ...(it.tags||[]).slice(0,3)].filter(Boolean).map(esc).join(\" · \");\n` +
    `    const metaHtml = meta ? ('<div class=\"hd-search-meta\"><small>'+meta+'</small></div>') : '';\n` +
    `    return '<li class=\"hd-search-item\"><a href=\"' + href + '\">' + titleHtml + '</a>' + metaHtml + (summary ? ('<div class=\"hd-search-summary\">' + summaryHtml + '</div>') : '') + '</li>';\n` +
    `  }).join(\"\");\n` +
    `}\n` +
    `function search(q, facets){\n` +
    `  const parsed = parseQuery(q);\n` +
    `  const req=[...parsed.words, ...parsed.cjkBigrams];\n` +
    `  if (req.length === 0) return [];\n` +
    `  const out=[];\n` +
    `  for (const doc of docs){\n` +
    `    const it = doc.item;\n` +
    `    if (!matchesFacets(it, facets)) continue;\n` +
    `    if (!req.every((t)=> doc.all.includes(t))) continue;\n` +
    `    const score = scoreDoc(doc, parsed);\n` +
    `    if (score <= 0) continue;\n` +
    `    out.push({ item: it, score, q: parsed });\n` +
    `  }\n` +
    `  out.sort((a,b)=>b.score-a.score || String(a.item.title||\"\").localeCompare(String(b.item.title||\"\")));\n` +
    `  return out.slice(0, 50);\n` +
    `}\n` +
    `function apply(){\n` +
    `  const facets={\n` +
    `    collection: collectionSel ? collectionSel.value : \"\",\n` +
    `    categories: selectedValues(catsEl),\n` +
    `    tags: selectedValues(tagsEl)\n` +
    `  };\n` +
    `  render(search(input ? input.value : \"\", facets));\n` +
    `}\n` +
    `async function init(){\n` +
    `  try{\n` +
    `    const res = await fetch(indexUrl);\n` +
    `    const data = res.ok ? await res.json() : null;\n` +
    `    items = Array.isArray(data && data.items) ? data.items : [];\n` +
    `  } catch { items = []; }\n` +
    `  docs = items.map((it)=>{\n` +
    `    const title = norm(it.title);\n` +
    `    const headings = norm((it.headings||[]).join(\" \"));\n` +
    `    const summary = norm(it.summary);\n` +
    `    const text = norm(it.text);\n` +
    `    const tags = (it.tags||[]).map(norm).join(\" \");\n` +
    `    const categories = (it.categories||[]).map(norm).join(\" \");\n` +
    `    const aliases = (it.aliases||[]).map(norm).join(\" \");\n` +
    `    const all = (title+\" \"+headings+\" \"+summary+\" \"+tags+\" \"+categories+\" \"+aliases+\" \"+text).trim();\n` +
    `    return { item: it, all, title, headings, summary, text, tags, categories, aliases };\n` +
    `  });\n` +
    `  buildFacets();\n` +
    `  apply();\n` +
    `  if (input) input.focus();\n` +
    `}\n` +
    `if (input) input.addEventListener(\"input\", apply);\n` +
    `if (input) input.addEventListener(\"keydown\", (e)=>{ if (e.key === \"Escape\") { input.value = \"\"; apply(); } });\n` +
    `if (collectionSel) collectionSel.addEventListener(\"change\", apply);\n` +
    `if (catsEl) catsEl.addEventListener(\"change\", apply);\n` +
    `if (tagsEl) tagsEl.addEventListener(\"change\", apply);\n` +
    `init();\n` +
    `</script>`
  );
}

function withBasePath(base: string, pathname: string): string {
  if (base === "/") return pathname;
  if (pathname === "/") return base;
  return (base.endsWith("/") ? base.slice(0, -1) : base) + pathname;
}
