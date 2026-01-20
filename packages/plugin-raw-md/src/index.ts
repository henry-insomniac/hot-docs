import fs from "node:fs/promises";
import path from "node:path";

import type { HotDocsPlugin } from "@hot-docs/core";
import { withBase } from "@hot-docs/core";

type RawMdPluginOptions = {
  outDir?: string;
  includeCollections?: string[];
  insertDownloadLink?: boolean;
  linkText?: string;
};

export default function rawMdPlugin(options?: Partial<RawMdPluginOptions>): HotDocsPlugin {
  const outDir = normalizeOutDir(options?.outDir);
  const includeCollections = normalizeIncludeCollections(options?.includeCollections);
  const insertDownloadLink = options?.insertDownloadLink ?? true;
  const linkText = normalizeLinkText(options?.linkText);

  return {
    name: "@hot-docs/plugin-raw-md",
    apiVersion: 1,
    capabilities: ["markdown", "build"],
    markdown: insertDownloadLink
      ? {
          rehypePlugins: [[rehypeInsertDownloadLink, { outDir, linkText }]]
        }
      : undefined,
    hooks: {
      build: async (ctx) => {
        for (const entry of ctx.index.entriesByRoute.values()) {
          if (includeCollections && !includeCollections.has(entry.collection)) continue;

          const collection = ctx.config.collections[entry.collection];
          if (!collection) continue;

          const sourcePath = path.join(ctx.config.contentDir, collection.dir, ...entry.relativePath.split("/"));
          const raw = await fs.readFile(sourcePath);

          const dest = path.posix.join(outDir, entry.collection, entry.relativePath);
          if (isUnsafeRelativePath(dest)) continue;

          await ctx.emitFile(dest, raw);
        }
      }
    }
  };
}

function normalizeOutDir(outDir: string | undefined): string {
  const raw = String(outDir ?? "__raw__").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!raw) return "__raw__";
  const normalized = path.posix.normalize(raw);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`raw-md 插件 options.outDir 不安全：${raw}`);
  }
  return normalized;
}

function normalizeIncludeCollections(value: string[] | undefined): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((v) => String(v).trim()).filter(Boolean);
  return items.length ? new Set(items) : undefined;
}

function normalizeLinkText(value: string | undefined): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || "下载 Markdown";
}

function isUnsafeRelativePath(p: string): boolean {
  const normalized = path.posix.normalize(p);
  return normalized === ".." || normalized.startsWith("../");
}

function encodeUrlPathSegments(pathname: string): string {
  return pathname
    .split("/")
    .map((seg, idx) => (idx === 0 ? seg : encodeURIComponent(seg)))
    .join("/");
}

function rehypeInsertDownloadLink(opts: { outDir: string; linkText: string }): any {
  const outDir = normalizeOutDir(opts?.outDir);
  const linkText = normalizeLinkText(opts?.linkText);

  return (tree: any, file: any) => {
    const hotDocs = file?.data?.hotDocs;
    const config = hotDocs?.config;
    const entry = hotDocs?.entry;

    if (!config || !entry || typeof entry.collection !== "string" || typeof entry.relativePath !== "string") return;

    const rawPath = `/${outDir}/${entry.collection}/${entry.relativePath}`;
    const href = withBase(config.site.base, encodeUrlPathSegments(rawPath));

    if (!tree || tree.type !== "root" || !Array.isArray(tree.children)) return;
    if (
      tree.children.some(
        (n: any) => n && n.type === "element" && n.tagName === "p" && Array.isArray(n.properties?.className) && n.properties.className.includes("hd-raw-md")
      )
    ) {
      return;
    }

    tree.children.unshift({
      type: "element",
      tagName: "p",
      properties: { className: ["hd-raw-md"] },
      children: [
        {
          type: "element",
          tagName: "a",
          properties: { href, download: true },
          children: [{ type: "text", value: linkText }]
        }
      ]
    });
  };
}

