import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import type { ContentIndex, HotDocsConfig, HotDocsPlugin, PluginVirtualPage } from "@hot-docs/core";
import { trimTrailingSlash } from "@hot-docs/core";

type SearchPluginOptions = {
  routePath?: string;
  outFile?: string;
  maxTextLength?: number;
  maxSectionTextLength?: number;
  sectionLevels?: number[];
};

type SearchIndexItemV2 = {
  id: string;
  kind: "doc" | "section";
  routePath: string;
  anchor?: string;
  title: string;
  sectionTitle?: string;
  collection: string;
  summary?: string;
  aliases?: string[];
  tags?: string[];
  categories?: string[];
  date?: string;
  headings?: string[];
  text?: string;
  sectionText?: string;
};

type SearchData = {
  text?: string;
  headings?: string[];
  sections?: Array<{ anchor: string; title: string; text: string }>;
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
          maxTextLength: options?.maxTextLength,
          maxSectionTextLength: options?.maxSectionTextLength,
          sectionLevels: options?.sectionLevels
        });
        await ctx.emitFile(outFile, JSON.stringify({ version: 2, items }, null, 2));
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
  options: { maxTextLength?: number; maxSectionTextLength?: number; sectionLevels?: number[] }
): Promise<SearchIndexItemV2[]> {
  const maxTextLength =
    typeof options.maxTextLength === "number" && Number.isFinite(options.maxTextLength) ? Math.max(0, Math.floor(options.maxTextLength)) : 1800;
  const maxSectionTextLength =
    typeof options.maxSectionTextLength === "number" && Number.isFinite(options.maxSectionTextLength)
      ? Math.max(0, Math.floor(options.maxSectionTextLength))
      : 700;
  const sectionLevels = normalizeSectionLevels(options.sectionLevels);

  const entries = [...index.entriesByRoute.values()];
  const items: SearchIndexItemV2[] = [];

  for (const entry of entries) {
    const collection = config.collections[entry.collection];
    if (!collection) continue;

    const filePath = path.join(config.contentDir, collection.dir, ...entry.relativePath.split("/"));
    const data = await readEntrySearchData(filePath, { maxTextLength, maxSectionTextLength, sectionLevels });

    const categories = entry.categories?.length ? entry.categories : entry.category ? [entry.category] : undefined;
    const summary = (entry.summary ?? entry.description ?? "").trim() || undefined;

    const docItem: SearchIndexItemV2 = {
      id: `${entry.id}#doc`,
      kind: "doc",
      routePath: entry.routePath,
      title: entry.title,
      collection: entry.collection,
      summary,
      aliases: entry.aliases,
      tags: entry.tags,
      categories,
      date: entry.updated ?? entry.date,
      headings: data.headings,
      text: data.text
    };
    items.push(docItem);

    for (const section of data.sections ?? []) {
      items.push({
        id: `${entry.id}${section.anchor}`,
        kind: "section",
        routePath: entry.routePath,
        anchor: section.anchor,
        title: entry.title,
        sectionTitle: section.title,
        collection: entry.collection,
        summary,
        aliases: entry.aliases,
        tags: entry.tags,
        categories,
        date: entry.updated ?? entry.date,
        headings: data.headings,
        sectionText: section.text
      });
    }
  }

  return items;
}

function normalizeSectionLevels(levels: number[] | undefined): Set<number> {
  const raw = Array.isArray(levels) && levels.length ? levels : [2, 3];
  const out = new Set<number>();
  for (const n of raw) {
    const v = Number(n);
    if (!Number.isFinite(v)) continue;
    const level = Math.floor(v);
    if (level >= 1 && level <= 6) out.add(level);
  }
  if (!out.size) return new Set([2, 3]);
  return out;
}

async function readEntrySearchData(
  filePath: string,
  options: { maxTextLength: number; maxSectionTextLength: number; sectionLevels: Set<number> }
): Promise<SearchData> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const content = matter(raw).content;
    const fullText = markdownToText(content);
    const text = options.maxTextLength > 0 ? fullText.slice(0, options.maxTextLength) : fullText;

    return {
      text,
      headings: extractHeadings(content),
      sections: extractSections(content, {
        maxSectionTextLength: options.maxSectionTextLength,
        levels: options.sectionLevels
      })
    };
  } catch {
    return {};
  }
}

function extractSections(
  markdown: string,
  options: { levels: Set<number>; maxSectionTextLength: number }
): Array<{ anchor: string; title: string; text: string }> {
  const lines = markdown.split(/\r?\n/);
  const headingRe = /^(#{1,6})\s+(.+?)\s*$/;

  type Draft = { level: number; heading: string; anchorId: string; bodyLines: string[] };
  const drafts: Draft[] = [];
  let current: Draft | undefined;
  const usedAnchors = new Map<string, number>();

  for (const line of lines) {
    const m = headingRe.exec(line);
    if (m?.[1] && m[2]) {
      const level = m[1].length;
      const heading = sanitizeHeadingText(m[2]);
      const anchorId = createAnchorId(heading || "section", usedAnchors);

      if (options.levels.has(level)) {
        if (current) drafts.push(current);
        current = { level, heading: heading || "Section", anchorId, bodyLines: [] };
        continue;
      }

      if (current) current.bodyLines.push(line);
      continue;
    }

    if (current) current.bodyLines.push(line);
  }

  if (current) drafts.push(current);

  return drafts
    .map((d) => {
      const text = markdownToText(d.bodyLines.join("\n"));
      const limited = options.maxSectionTextLength > 0 ? text.slice(0, options.maxSectionTextLength) : text;
      return {
        anchor: `#${d.anchorId}`,
        title: d.heading,
        text: limited
      };
    })
    .filter((s) => s.text.trim().length > 0);
}

function createAnchorId(heading: string, used: Map<string, number>): string {
  const base = slugifyHeading(heading) || "section";
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function slugifyHeading(s: string): string {
  const normalized = String(s ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(
      /[\u0300-\u036f`~!@#$%^&*()+=\[\]{}\\|;:'",.<>/?，。！？、；：“”‘’（）【】《》]/g,
      ""
    )
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized;
}

function sanitizeHeadingText(s: string): string {
  return String(s ?? "")
    .replace(/\r/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

function markdownToText(markdown: string): string {
  return (
    markdown
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
      .replace(/^(\s{0,3}#{1,6}\s+|\s{0,3}>\s+|\s{0,3}[-*+]\s+|\s{0,3}\d+\.\s+)/gm, " ")
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
    const title = sanitizeHeadingText(m[1]);
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
    `let docs = [];\n` +
    `function withBase(p){\n` +
    `  if (base === "/") return p;\n` +
    `  if (p === "/") return base;\n` +
    `  return (base.endsWith("/") ? base.slice(0, -1) : base) + p;\n` +
    `}\n` +
    `function toPageHref(routePath, anchor){\n` +
    `  const r = (routePath || "/").replace(/\\/+$/,"") || "/";\n` +
    `  const href = (r === "/") ? withBase("/") : (withBase(r) + "/");\n` +
    `  return anchor ? (href + anchor) : href;\n` +
    `}\n` +
    `function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}\n` +
    `function norm(s){return String(s||"").toLowerCase();}\n` +
    `function arr(v){return Array.isArray(v) ? v.map((x)=>String(x||"").trim()).filter(Boolean) : []; }\n` +
    `function uniq(a){return Array.from(new Set(a));}\n` +
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
    `  return { raw, words, cjk, cjkBigrams: uniq(cjkBigrams.filter(Boolean)) };\n` +
    `}\n` +
    `function highlight(text, q){\n` +
    `  const raw = String(text||"");\n` +
    `  const ranges=[];\n` +
    `  const rawLower = raw.toLowerCase();\n` +
    `  function pushAll(hay, needle, offset, ci){\n` +
    `    const n = String(needle||"");\n` +
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
    `  let out="";\n` +
    `  let last=0;\n` +
    `  for (const r of merged){\n` +
    `    out += esc(raw.slice(last, r[0]));\n` +
    `    out += "<mark>" + esc(raw.slice(r[0], r[1])) + "</mark>";\n` +
    `    last = r[1];\n` +
    `  }\n` +
    `  out += esc(raw.slice(last));\n` +
    `  return out;\n` +
    `}\n` +
    `function normalizeItem(it, idx){\n` +
    `  const routePath = String((it && it.routePath) || "").trim();\n` +
    `  if (!routePath) return null;\n` +
    `  const kind = it && it.kind === "section" ? "section" : "doc";\n` +
    `  const anchor = (kind === "section" && typeof it.anchor === "string" && it.anchor.startsWith("#")) ? it.anchor : "";\n` +
    `  const title = String((it && it.title) || routePath).trim() || routePath;\n` +
    `  const sectionTitle = String((it && it.sectionTitle) || "").trim();\n` +
    `  const summary = String((it && it.summary) || "").trim();\n` +
    `  const text = String((it && it.text) || "").trim();\n` +
    `  const sectionText = String((it && it.sectionText) || "").trim();\n` +
    `  const headings = uniq(arr(it && it.headings));\n` +
    `  const tags = uniq(arr(it && it.tags));\n` +
    `  const categories = uniq(arr(it && it.categories));\n` +
    `  const aliases = uniq(arr(it && it.aliases));\n` +
    `  const collection = String((it && it.collection) || "docs");\n` +
    `  const all = norm([title, sectionTitle, summary, sectionText, text, headings.join(" "), tags.join(" "), categories.join(" "), aliases.join(" ")].join(" "));\n` +
    `  return {\n` +
    `    _idx: idx,\n` +
    `    id: String((it && it.id) || (routePath + (anchor || "") + "#" + idx)),\n` +
    `    kind, routePath, anchor, title, sectionTitle, summary, text, sectionText, headings, tags, categories, aliases, collection, all,\n` +
    `    byField: {\n` +
    `      title: norm(title),\n` +
    `      sectionTitle: norm(sectionTitle),\n` +
    `      aliases: norm(aliases.join(" ")),\n` +
    `      tags: norm(tags.join(" ")),\n` +
    `      categories: norm(categories.join(" ")),\n` +
    `      headings: norm(headings.join(" ")),\n` +
    `      summary: norm(summary),\n` +
    `      sectionText: norm(sectionText),\n` +
    `      text: norm(text)\n` +
    `    }\n` +
    `  };\n` +
    `}\n` +
    `function buildFacets(){\n` +
    `  const routeMap = new Map();\n` +
    `  for (const d of docs){\n` +
    `    const prev = routeMap.get(d.routePath);\n` +
    `    if (!prev || prev.kind !== "doc") routeMap.set(d.routePath, d);\n` +
    `  }\n` +
    `  const values = Array.from(routeMap.values());\n` +
    `  const byCol=new Map();\n` +
    `  const byTag=new Map();\n` +
    `  const byCat=new Map();\n` +
    `  for (const it of values){\n` +
    `    byCol.set(it.collection, (byCol.get(it.collection)||0)+1);\n` +
    `    for (const t of (it.tags||[])) byTag.set(t, (byTag.get(t)||0)+1);\n` +
    `    for (const c of (it.categories||[])) byCat.set(c, (byCat.get(c)||0)+1);\n` +
    `  }\n` +
    `  if (collectionSel){\n` +
    `    const cols=[...byCol.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));\n` +
    `    collectionSel.innerHTML='<option value="">All</option>'+cols.map(([k,v])=>'<option value="'+esc(k)+'">'+esc(k)+' ('+v+')</option>').join('');\n` +
    `  }\n` +
    `  function renderFacet(target, entries, name){\n` +
    `    if(!target) return;\n` +
    `    if(entries.length===0){target.innerHTML='<p><small>None</small></p>'; return;}\n` +
    `    target.innerHTML=entries.map(([k,v])=>\n` +
    `      '<label style="display:block; margin:2px 0;"><input type="checkbox" name="'+name+'" value="'+esc(k)+'" /> '+esc(k)+' <small>('+v+')</small></label>'\n` +
    `    ).join('');\n` +
    `  }\n` +
    `  renderFacet(catsEl, [...byCat.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))), "categories");\n` +
    `  renderFacet(tagsEl, [...byTag.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))), "tags");\n` +
    `}\n` +
    `function selectedValues(container){\n` +
    `  if(!container) return new Set();\n` +
    `  const s=new Set();\n` +
    `  for (const el of container.querySelectorAll('input[type="checkbox"]:checked')) s.add(el.value);\n` +
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
    `  const req=[...q.words, ...(q.cjkBigrams.length ? q.cjkBigrams : q.cjk)];\n` +
    `  for (const tok of req){\n` +
    `    if (!tok) continue;\n` +
    `    let w=0;\n` +
    `    if (doc.byField.title.includes(tok)) w=Math.max(w, 30);\n` +
    `    if (doc.byField.sectionTitle.includes(tok)) w=Math.max(w, 24);\n` +
    `    if (doc.byField.aliases.includes(tok)) w=Math.max(w, 22);\n` +
    `    if (doc.byField.tags.includes(tok) || doc.byField.categories.includes(tok)) w=Math.max(w, 20);\n` +
    `    if (doc.byField.headings.includes(tok)) w=Math.max(w, 16);\n` +
    `    if (doc.byField.summary.includes(tok)) w=Math.max(w, 10);\n` +
    `    if (doc.byField.sectionText.includes(tok)) w=Math.max(w, 8);\n` +
    `    if (doc.byField.text.includes(tok)) w=Math.max(w, 4);\n` +
    `    score += w;\n` +
    `  }\n` +
    `  if (doc.kind === "section") score += 4;\n` +
    `  const qn = norm(q.raw);\n` +
    `  if (qn && doc.byField.title.startsWith(qn)) score += 8;\n` +
    `  if (qn && doc.byField.sectionTitle.startsWith(qn)) score += 4;\n` +
    `  return score;\n` +
    `}\n` +
    `function render(list){\n` +
    `  if (!results) return;\n` +
    `  if (list.length === 0) { results.innerHTML = ""; return; }\n` +
    `  results.innerHTML = list.map((r)=>{\n` +
    `    const it=r.item;\n` +
    `    const href = toPageHref(it.routePath, it.anchor);\n` +
    `    const showTitle = it.sectionTitle ? (it.title + " · " + it.sectionTitle) : it.title;\n` +
    `    const summary = (it.sectionText || it.summary || it.text || "").trim();\n` +
    `    const titleHtml = r.q ? highlight(showTitle, r.q) : esc(showTitle);\n` +
    `    const summaryHtml = r.q ? highlight(summary, r.q) : esc(summary);\n` +
    `    const meta = [it.kind, it.collection, ...(it.categories||[]).slice(0,3), ...(it.tags||[]).slice(0,3)].filter(Boolean).map(esc).join(" · ");\n` +
    `    const metaHtml = meta ? ('<div class="hd-search-meta"><small>'+meta+'</small></div>') : '';\n` +
    `    const anchorHtml = it.anchor ? ('<small>' + esc(it.anchor) + '</small>') : '';\n` +
    `    return '<li class="hd-search-item"><a href="' + href + '">' + titleHtml + '</a> ' + anchorHtml + metaHtml + (summary ? ('<div class="hd-search-summary">' + summaryHtml + '</div>') : '') + '</li>';\n` +
    `  }).join("");\n` +
    `}\n` +
    `function search(q, facets){\n` +
    `  const parsed = parseQuery(q);\n` +
    `  const req=[...parsed.words, ...(parsed.cjkBigrams.length ? parsed.cjkBigrams : parsed.cjk)];\n` +
    `  if (req.length === 0) return [];\n` +
    `  const out=[];\n` +
    `  for (const doc of docs){\n` +
    `    if (!matchesFacets(doc, facets)) continue;\n` +
    `    if (!req.every((t)=> doc.all.includes(t))) continue;\n` +
    `    const score = scoreDoc(doc, parsed);\n` +
    `    if (score <= 0) continue;\n` +
    `    out.push({ item: doc, score, q: parsed });\n` +
    `  }\n` +
    `  out.sort((a,b)=>b.score-a.score || String(a.item.title||"").localeCompare(String(b.item.title||"")));\n` +
    `  const dedup = [];\n` +
    `  const seen = new Set();\n` +
    `  for (const r of out){\n` +
    `    const key = r.item.routePath + (r.item.anchor || "");\n` +
    `    if (seen.has(key)) continue;\n` +
    `    seen.add(key);\n` +
    `    dedup.push(r);\n` +
    `    if (dedup.length >= 50) break;\n` +
    `  }\n` +
    `  return dedup;\n` +
    `}\n` +
    `function apply(){\n` +
    `  const facets={\n` +
    `    collection: collectionSel ? collectionSel.value : "",\n` +
    `    categories: selectedValues(catsEl),\n` +
    `    tags: selectedValues(tagsEl)\n` +
    `  };\n` +
    `  render(search(input ? input.value : "", facets));\n` +
    `}\n` +
    `async function init(){\n` +
    `  let items = [];\n` +
    `  try{\n` +
    `    const res = await fetch(indexUrl);\n` +
    `    const data = res.ok ? await res.json() : null;\n` +
    `    items = Array.isArray(data && data.items) ? data.items : [];\n` +
    `  } catch { items = []; }\n` +
    `  docs = items.map((it, idx)=>normalizeItem(it, idx)).filter(Boolean);\n` +
    `  buildFacets();\n` +
    `  apply();\n` +
    `  if (input) input.focus();\n` +
    `}\n` +
    `if (input) input.addEventListener("input", apply);\n` +
    `if (input) input.addEventListener("keydown", (e)=>{ if (e.key === "Escape") { input.value = ""; apply(); } });\n` +
    `if (collectionSel) collectionSel.addEventListener("change", apply);\n` +
    `if (catsEl) catsEl.addEventListener("change", apply);\n` +
    `if (tagsEl) tagsEl.addEventListener("change", apply);\n` +
    `init();\n` +
    `</script>`
  );
}

function withBasePath(base: string, pathname: string): string {
  if (base === "/") return pathname;
  if (pathname === "/") return base;
  return (base.endsWith("/") ? base.slice(0, -1) : base) + pathname;
}
