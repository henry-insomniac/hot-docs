import path from "node:path";

import type { ContentEntry, HotDocsConfig } from "../types.js";
import { normalizePathname, stripBase, toPageHref, withBase } from "../utils/base.js";
import { joinUrlPath, posixPath, toRoutePath } from "../utils/routes.js";
import type { UrlRewriter } from "./rehype-rewrite-urls.js";

type CreateOptions = {
  config: HotDocsConfig;
  entry: ContentEntry;
  filePath: string;
};

export function createMarkdownUrlRewriter(options: CreateOptions): UrlRewriter {
  const siteBase = options.config.site.base;
  const collection = options.config.collections[options.entry.collection];
  if (!collection) {
    return ({ url, attribute }) => sanitizeUnsafeUrl(url, attribute);
  }

  const collectionRoot = path.join(options.config.contentDir, collection.dir);
  const markdownFilePath = path.resolve(options.filePath);
  const markdownDir = path.dirname(markdownFilePath);

  return ({ url, attribute }) => {
    const sanitized = sanitizeUnsafeUrl(url, attribute);
    if (sanitized !== url) return sanitized;

    const trimmed = url.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("#")) return undefined;
    if (hasScheme(trimmed) || trimmed.startsWith("//")) return undefined;

    const { path: rawPath, query, hash } = splitUrl(trimmed);

    if (rawPath.startsWith("/")) {
      const rebased = rebaseAbsolutePath(siteBase, rawPath);
      if (!rebased) return undefined;
      return `${rebased}${query}${hash}`;
    }

    const absTarget = path.resolve(markdownDir, rawPath);
    if (!isPathInside(collectionRoot, absTarget)) return undefined;

    const relFromRoot = path.relative(collectionRoot, absTarget);
    const relPosix = posixPath(relFromRoot);

    if (isMarkdownPath(rawPath)) {
      const targetRoutePath = toRoutePath(collection.routeBase, relPosix);
      const href = toPageHref(siteBase, targetRoutePath);
      return `${href}${query}${hash}`;
    }

    const assetRoutePath = joinUrlPath(collection.routeBase, relPosix);
    const assetUrl = withBase(siteBase, assetRoutePath);

    // 防止把资源链接误重写成目录链接（如 src="image.png"）
    if (attribute === "href" && looksLikeDirectoryPath(rawPath)) {
      return `${assetUrl}/${query}${hash}`.replaceAll("//?", "/?");
    }

    return `${assetUrl}${query}${hash}`;
  };
}

function sanitizeUnsafeUrl(url: string, attribute: "href" | "src" | "srcset"): string {
  const trimmed = url.trimStart();
  const isUnsafe = /^javascript:/i.test(trimmed) || /^vbscript:/i.test(trimmed);
  if (!isUnsafe) return url;
  return attribute === "href" ? "#" : "about:blank";
}

function hasScheme(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function isMarkdownPath(p: string): boolean {
  return /\.(md|markdown)$/i.test(p);
}

function splitUrl(url: string): { path: string; query: string; hash: string } {
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

  return { path: rest, query, hash };
}

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function rebaseAbsolutePath(siteBase: string, absolutePath: string): string | undefined {
  const abs = normalizePathname(absolutePath);
  const withoutBase = stripBase(siteBase, abs);

  // 如果用户已经手动写了带 base 的绝对路径（例如 /docs/...），则保持不变
  if (siteBase !== "/" && withoutBase !== abs) return abs;

  return withBase(siteBase, abs);
}

function looksLikeDirectoryPath(p: string): boolean {
  if (!p) return false;
  if (p.endsWith("/")) return true;
  return !path.posix.basename(p).includes(".");
}
