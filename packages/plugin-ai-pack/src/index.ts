import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import GithubSlugger from "github-slugger";

import type { ContentEntry, HotDocsPlugin } from "@hot-docs/core";
import { trimTrailingSlash } from "@hot-docs/core";

type AiPackPluginOptions = {
  outDir?: string;
  rawDir?: string;
  includeCollections?: string[];
  headingLevels?: number[];
  stripCodeBlocks?: boolean;
  maxChunkTextLength?: number;
};

type AiManifestV1 = {
  version: 1;
  generatedAt: string;
  docs: Array<{
    routePath: string;
    collection: string;
    title: string;
    entryHash: string;
    rawPath: string;
    tags?: string[];
    categories?: string[];
    aliases?: string[];
    updated?: string;
    chunks: Array<{ id: string; anchor: string; title: string; hash: string }>;
  }>;
};

type AiChunkV1 = {
  id: string;
  routePath: string;
  collection: string;
  entryTitle: string;
  anchor: string;
  title: string;
  text: string;
  tags?: string[];
  categories?: string[];
  aliases?: string[];
  scoreHints?: {
    headings?: string[];
  };
  hash: string;
};

export default function aiPackPlugin(options?: Partial<AiPackPluginOptions>): HotDocsPlugin {
  const outDir = normalizeOutDir(options?.outDir);
  const rawDir = normalizeOutDir(options?.rawDir ?? "__raw__");
  const includeCollections = normalizeIncludeCollections(options?.includeCollections);
  const headingLevels = normalizeHeadingLevels(options?.headingLevels);
  const stripCodeBlocks = options?.stripCodeBlocks ?? true;
  const maxChunkTextLength = normalizeMaxChunkTextLength(options?.maxChunkTextLength);

  return {
    name: "@hot-docs/plugin-ai-pack",
    apiVersion: 1,
    capabilities: ["build"],
    hooks: {
      build: async (ctx) => {
        const docs: AiManifestV1["docs"] = [];
        const chunks: AiChunkV1[] = [];

        for (const entry of ctx.index.entriesByRoute.values()) {
          if (includeCollections && !includeCollections.has(entry.collection)) continue;
          const collection = ctx.config.collections[entry.collection];
          if (!collection) continue;

          const filePath = path.join(ctx.config.contentDir, collection.dir, ...entry.relativePath.split("/"));
          const raw = await fs.readFile(filePath, "utf8");
          const parsed = matter(raw);

          const entryChunks = buildEntryChunks(entry, parsed.content, {
            headingLevels,
            stripCodeBlocks,
            maxChunkTextLength
          });

          const rawPath = encodeUrlPathSegments(`/${rawDir}/${entry.collection}/${entry.relativePath}`);
          docs.push({
            routePath: entry.routePath,
            collection: entry.collection,
            title: entry.title,
            entryHash: entry.hash,
            rawPath,
            tags: entry.tags,
            categories: entry.categories?.length ? entry.categories : entry.category ? [entry.category] : undefined,
            aliases: entry.aliases,
            updated: entry.updated,
            chunks: entryChunks.map((c) => ({ id: c.id, anchor: c.anchor, title: c.title, hash: c.hash }))
          });
          chunks.push(...entryChunks);
        }

        const manifest: AiManifestV1 = {
          version: 1,
          generatedAt: new Date().toISOString(),
          docs
        };

        const manifestFile = path.posix.join(outDir, "manifest.json");
        const chunksFile = path.posix.join(outDir, "chunks.json");

        await ctx.emitFile(manifestFile, JSON.stringify(manifest, null, 2));
        await ctx.emitFile(chunksFile, JSON.stringify({ version: 1, items: chunks }, null, 2));
      }
    }
  };
}

function normalizeOutDir(outDir: string | undefined): string {
  const raw = String(outDir ?? "ai").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!raw) return "ai";
  const normalized = path.posix.normalize(raw);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`ai-pack 插件 options.outDir 不安全：${raw}`);
  }
  return normalized;
}

function normalizeIncludeCollections(value: string[] | undefined): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((v) => String(v).trim()).filter(Boolean);
  return items.length ? new Set(items) : undefined;
}

function normalizeHeadingLevels(levels: number[] | undefined): Set<number> {
  const raw = Array.isArray(levels) && levels.length ? levels : [2, 3];
  const out = new Set<number>();
  for (const n of raw) {
    const v = Number(n);
    if (!Number.isFinite(v)) continue;
    const lvl = Math.floor(v);
    if (lvl >= 1 && lvl <= 6) out.add(lvl);
  }
  if (!out.size) return new Set([2, 3]);
  return out;
}

function normalizeMaxChunkTextLength(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const v = Math.max(0, Math.floor(n));
  return v || undefined;
}

function buildEntryChunks(
  entry: ContentEntry,
  markdownContent: string,
  options: { headingLevels: Set<number>; stripCodeBlocks: boolean; maxChunkTextLength?: number }
): AiChunkV1[] {
  const routePath = trimTrailingSlash(entry.routePath);
  const slugger = new GithubSlugger();

  const content = options.stripCodeBlocks ? markdownContent.replace(/```[\\s\\S]*?```/g, "\n") : markdownContent;
  const lines = content.split(/\r?\n/);

  type ChunkDraft = { level: number; heading: string; anchorId: string; bodyLines: string[] };
  const drafts: ChunkDraft[] = [];
  let current: ChunkDraft | undefined;

  const headingRe = /^(#{1,6})\\s+(.+?)\\s*$/;
  for (const line of lines) {
    const m = headingRe.exec(line);
    if (m?.[1] && m[2]) {
      const level = m[1].length;
      const heading = sanitizeHeadingText(m[2]);
      const anchorId = slugger.slug(heading || "section");

      if (options.headingLevels.has(level)) {
        if (current) drafts.push(current);
        current = { level, heading: heading || entry.title, anchorId, bodyLines: [] };
        continue;
      }

      // 非分块级别的标题：计入当前 chunk 的内容，避免丢上下文
      if (current) current.bodyLines.push(line);
      continue;
    }
    if (current) current.bodyLines.push(line);
  }
  if (current) drafts.push(current);

  if (!drafts.length) {
    const anchorId = slugger.slug(entry.title || "doc");
    const text = markdownToText(content, { maxLen: options.maxChunkTextLength });
    return [
      buildChunk(entry, {
        routePath,
        anchorId,
        title: entry.title,
        text,
        headings: undefined
      })
    ];
  }

  return drafts
    .map((d) => {
      const bodyMd = d.bodyLines.join("\n");
      const text = markdownToText(bodyMd, { maxLen: options.maxChunkTextLength });
      return buildChunk(entry, {
        routePath,
        anchorId: d.anchorId,
        title: d.heading,
        text,
        headings: undefined
      });
    })
    .filter((c) => c.text.trim().length > 0);
}

function buildChunk(
  entry: ContentEntry,
  data: { routePath: string; anchorId: string; title: string; text: string; headings?: string[] }
): AiChunkV1 {
  const anchor = `#${data.anchorId}`;
  const id = `${data.routePath}${anchor}`;
  const hash = sha256(`${id}\n${data.title}\n${data.text}`);

  return {
    id,
    routePath: data.routePath,
    collection: entry.collection,
    entryTitle: entry.title,
    anchor,
    title: data.title,
    text: data.text,
    tags: entry.tags,
    categories: entry.categories?.length ? entry.categories : entry.category ? [entry.category] : undefined,
    aliases: entry.aliases,
    scoreHints: data.headings?.length ? { headings: data.headings } : undefined,
    hash
  };
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function sanitizeHeadingText(s: string): string {
  return String(s ?? "")
    .replace(/\r/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

function markdownToText(markdown: string, options: { maxLen?: number } = {}): string {
  const maxLen = options.maxLen;
  const text = String(markdown ?? "")
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
    .trim();

  if (typeof maxLen === "number" && Number.isFinite(maxLen) && maxLen > 0) return text.slice(0, Math.floor(maxLen));
  return text;
}

function encodeUrlPathSegments(pathname: string): string {
  return String(pathname || "")
    .split("/")
    .map((seg, idx) => (idx === 0 ? seg : encodeURIComponent(seg)))
    .join("/");
}

