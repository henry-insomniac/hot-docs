import matter from "gray-matter";
import { unified } from "unified";
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
};

export async function renderMarkdownToHtml(markdown: string, options: RenderMarkdownOptions = {}): Promise<string> {
  const parsed = matter(markdown);
  const content = parsed.content;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" });

  if (options.config && options.entry && options.filePath) {
    processor.use(rehypeRewriteUrls, {
      rewriteUrl: createMarkdownUrlRewriter({ config: options.config, entry: options.entry, filePath: options.filePath })
    });
  }

  processor.use(rehypeStringify);

  const file = await processor.process(content);

  return String(file);
}
