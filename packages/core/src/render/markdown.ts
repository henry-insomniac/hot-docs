import matter from "gray-matter";
import { unified, type PluggableList } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";

import type { ContentEntry, HotDocsConfig } from "../types.js";
import { rehypeRewriteUrls } from "./rehype-rewrite-urls.js";
import { createMarkdownUrlRewriter } from "./url-rewriter.js";

export type RenderMarkdownOptions = {
  config?: HotDocsConfig;
  entry?: ContentEntry;
  filePath?: string;
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
};

export type TocItem = { id: string; title: string; level: number };

export type RenderMarkdownResult = { html: string; toc: TocItem[] };

export async function renderMarkdownToPage(markdown: string, options: RenderMarkdownOptions = {}): Promise<RenderMarkdownResult> {
  const parsed = matter(markdown);
  const content = parsed.content;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(options.remarkPlugins ?? [])
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeCollectToc)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(options.rehypePlugins ?? []);

  if (options.config && options.entry && options.filePath) {
    processor.use(rehypeRewriteUrls, {
      rewriteUrl: createMarkdownUrlRewriter({ config: options.config, entry: options.entry, filePath: options.filePath })
    });
  }

  processor.use(rehypeStringify);

  const file = await processor.process(content);

  const toc = (file.data.hotDocsToc ?? []) as TocItem[];

  return { html: String(file), toc };
}

export async function renderMarkdownToHtml(markdown: string, options: RenderMarkdownOptions = {}): Promise<string> {
  const result = await renderMarkdownToPage(markdown, options);
  return result.html;
}

function rehypeCollectToc(): any {
  return (tree: any, file: any) => {
    const items: TocItem[] = [];

    walk(tree, (node: any) => {
      if (!node || node.type !== "element") return;
      const tag = String(node.tagName ?? "");
      if (!/^h[1-6]$/i.test(tag)) return;

      const level = Number(tag.slice(1));
      if (!Number.isFinite(level) || level < 2 || level > 6) return;

      const id = String(node.properties?.id ?? "").trim();
      if (!id) return;

      const title = toText(node).trim();
      if (!title) return;

      items.push({ id, title, level });
    });

    file.data.hotDocsToc = items;
  };
}

function walk(node: any, visit: (n: any) => void): void {
  visit(node);
  const children: any[] | undefined = node && Array.isArray(node.children) ? node.children : undefined;
  if (!children) return;
  for (const child of children) walk(child, visit);
}

function toText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return String(node.value ?? "");
  if (node.type !== "element" && node.type !== "root") return "";
  const children: any[] | undefined = Array.isArray(node.children) ? node.children : undefined;
  if (!children) return "";
  return children.map(toText).join("");
}
