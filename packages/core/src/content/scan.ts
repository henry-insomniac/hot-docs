import crypto from "node:crypto";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import type { CollectionConfig, ContentEntry, ContentIndex, HotDocsConfig, NavNode } from "../types.js";

type ScanOptions = {
  includeDrafts: boolean;
};

export async function scanContent(config: HotDocsConfig, options: ScanOptions): Promise<ContentIndex> {
  const entriesByRoute = new Map<string, ContentEntry>();
  const entriesById = new Map<string, ContentEntry>();
  const navTreeByCollection = new Map<string, NavNode>();

  for (const [collectionId, collection] of Object.entries(config.collections)) {
    const collectionRoot = path.join(config.contentDir, collection.dir);
    const files = await listMarkdownFiles(collectionRoot);

    const entries: ContentEntry[] = [];
    for (const filePath of files) {
      const relativePath = path.relative(collectionRoot, filePath);
      const entry = await readEntry({
        filePath,
        collectionId,
        collection,
        relativePath
      });
      if (!options.includeDrafts && entry.draft) continue;

      entriesByRoute.set(entry.routePath, entry);
      entriesById.set(entry.id, entry);
      entries.push(entry);
    }

    if (collection.type === "docs") {
      navTreeByCollection.set(collectionId, buildDocsNavTree(collection.routeBase, entries));
    }
  }

  return { entriesByRoute, entriesById, navTreeByCollection };
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  const stack: string[] = [root];

  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;

    let items: Dirent[];
    try {
      items = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const item of items) {
      if (item.name.startsWith(".")) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (item.isFile() && (item.name.endsWith(".md") || item.name.endsWith(".markdown"))) {
        results.push(full);
      }
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

type ReadEntryArgs = {
  filePath: string;
  collectionId: string;
  collection: CollectionConfig;
  relativePath: string;
};

async function readEntry(args: ReadEntryArgs): Promise<ContentEntry> {
  const raw = await fs.readFile(args.filePath, "utf8");
  const stat = await fs.stat(args.filePath);
  const parsed = matter(raw);
  const front = (parsed.data ?? {}) as Record<string, unknown>;

  const title =
    typeof front.title === "string" && front.title.trim()
      ? front.title.trim()
      : findFirstHeading(parsed.content) ?? deriveTitleFromPath(args.relativePath);

  const routePath = toRoutePath(args.collection.routeBase, args.relativePath);
  const id = `${args.collectionId}:${posixPath(args.relativePath)}`;

  const hash = crypto.createHash("sha1").update(raw).digest("hex").slice(0, 12);

  return {
    id,
    collection: args.collectionId,
    relativePath: posixPath(args.relativePath),
    routePath,
    title,
    description: typeof front.description === "string" ? front.description : undefined,
    summary: typeof front.summary === "string" ? front.summary : undefined,
    order: typeof front.order === "number" ? front.order : undefined,
    tags: Array.isArray(front.tags) ? front.tags.filter((t) => typeof t === "string") : undefined,
    category: typeof front.category === "string" ? front.category : undefined,
    date: typeof front.date === "string" ? front.date : undefined,
    updated: typeof front.updated === "string" ? front.updated : undefined,
    draft: typeof front.draft === "boolean" ? front.draft : undefined,
    mtimeMs: stat.mtimeMs,
    hash
  };
}

function findFirstHeading(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

function deriveTitleFromPath(relativePath: string): string {
  const base = path.basename(relativePath, path.extname(relativePath));
  return base === "index" ? "Home" : base;
}

function toRoutePath(routeBase: string, relativePath: string): string {
  const posixRel = posixPath(relativePath);
  const withoutExt = posixRel.replace(/\.(md|markdown)$/i, "");
  const trimmed = withoutExt.endsWith("/index") ? withoutExt.slice(0, -"/index".length) : withoutExt;

  const joined = joinUrlPath(routeBase, trimmed);
  return joined === "" ? "/" : joined;
}

function joinUrlPath(base: string, suffix: string): string {
  const baseNorm = base === "/" ? "" : base;
  const suffixNorm = suffix ? `/${suffix}` : "";
  const joined = `${baseNorm}${suffixNorm}`.replace(/\/+/g, "/");
  return joined === "" ? "/" : joined;
}

function posixPath(p: string): string {
  return p.split(path.sep).join("/");
}

function buildDocsNavTree(routeBase: string, entries: ContentEntry[]): NavNode {
  const root: NavNode = { type: "dir", title: "Docs", pathSegment: "", children: [] };

  const sorted = [...entries].sort((a, b) => {
    const ao = a.order ?? Number.POSITIVE_INFINITY;
    const bo = b.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return a.routePath.localeCompare(b.routePath);
  });

  for (const entry of sorted) {
    if (!entry.routePath.startsWith(routeBase === "/" ? "/" : routeBase)) continue;
    const rel = entry.routePath.replace(routeBase === "/" ? "" : routeBase, "");
    const segments = rel.split("/").filter(Boolean);
    insertNavNode(root, segments, entry);
  }

  return root;
}

function insertNavNode(root: NavNode, segments: string[], entry: ContentEntry): void {
  let current = root;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const isLeaf = i === segments.length - 1;
    if (!current.children) current.children = [];

    if (isLeaf) {
      current.children.push({
        type: "page",
        title: entry.title,
        pathSegment: seg,
        routePath: entry.routePath
      });
      return;
    }

    let child = current.children.find((c) => c.type === "dir" && c.pathSegment === seg);
    if (!child) {
      child = { type: "dir", title: seg, pathSegment: seg, children: [] };
      current.children.push(child);
    }
    current = child;
  }
}
