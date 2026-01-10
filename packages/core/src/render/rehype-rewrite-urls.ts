import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

export type UrlRewriter = (args: { url: string; attribute: "href" | "src" | "srcset"; tagName: string }) => string | undefined;

type Options = {
  rewriteUrl: UrlRewriter;
};

export const rehypeRewriteUrls: Plugin<[Options], any> = (options) => {
  return (tree) => {
    visit(tree, "element", (node) => {
      const tagName = typeof node.tagName === "string" ? node.tagName : "";
      if (!tagName) return;

      if (tagName === "a") rewriteAttr(node, "href", options.rewriteUrl);
      if (tagName === "img") {
        rewriteAttr(node, "src", options.rewriteUrl);
        rewriteAttr(node, "srcset", options.rewriteUrl);
      }
      if (tagName === "source" || tagName === "video" || tagName === "audio") {
        rewriteAttr(node, "src", options.rewriteUrl);
        rewriteAttr(node, "srcset", options.rewriteUrl);
      }
      if (tagName === "link") rewriteAttr(node, "href", options.rewriteUrl);
      if (tagName === "script") rewriteAttr(node, "src", options.rewriteUrl);
    });
  };
};

function rewriteAttr(node: { tagName: string; properties?: Record<string, unknown> }, attribute: "href" | "src" | "srcset", rewriteUrl: UrlRewriter): void {
  const props = node.properties;
  if (!props) return;

  const current = props[attribute];
  if (typeof current !== "string") return;

  if (attribute === "srcset") {
    const rewritten = rewriteSrcset(current, (url) => rewriteUrl({ url, attribute, tagName: node.tagName }));
    if (rewritten) props[attribute] = rewritten;
    return;
  }

  const rewritten = rewriteUrl({ url: current, attribute, tagName: node.tagName });
  if (rewritten) props[attribute] = rewritten;
}

function rewriteSrcset(srcset: string, rewriteOne: (url: string) => string | undefined): string | undefined {
  const parts = srcset
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;

  const rewrittenParts: string[] = [];
  let changed = false;

  for (const part of parts) {
    const m = /^(\S+)(\s+.+)?$/.exec(part);
    if (!m) {
      rewrittenParts.push(part);
      continue;
    }
    const url = m[1]!;
    const descriptor = m[2] ?? "";
    const rewrittenUrl = rewriteOne(url);
    if (rewrittenUrl && rewrittenUrl !== url) changed = true;
    rewrittenParts.push(`${rewrittenUrl ?? url}${descriptor}`);
  }

  return changed ? rewrittenParts.join(", ") : undefined;
}
