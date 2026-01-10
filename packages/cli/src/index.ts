#!/usr/bin/env node
import { startDevServer } from "@hot-docs/dev-server";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { buildStaticSite, loadConfig, stripBase, type HotDocsConfig } from "@hot-docs/core";

type Args = {
  command?: string;
  _: string[];
  config?: string;
  outDir?: string;
  port?: number;
  host?: string;
  open?: boolean;
  force?: boolean;
  title?: string;
  tags?: string;
  category?: string;
  draft?: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { _: [] };
  const rest = [...argv];
  const command = rest.shift();
  args.command = command;

  while (rest.length) {
    const token = rest.shift();
    if (!token) break;
    if (token === "--config" || token === "-c") {
      args.config = rest.shift();
      continue;
    }
    if (token === "--force" || token === "-f") {
      args.force = true;
      continue;
    }
    if (token === "--outDir" || token === "--out" || token === "-o") {
      args.outDir = rest.shift();
      continue;
    }
    if (token === "--port" || token === "-p") {
      const v = rest.shift();
      args.port = v ? Number(v) : undefined;
      continue;
    }
    if (token === "--host") {
      args.host = rest.shift();
      continue;
    }
    if (token === "--open") {
      args.open = true;
      continue;
    }
    if (token === "--title") {
      args.title = rest.shift();
      continue;
    }
    if (token === "--tags") {
      args.tags = rest.shift();
      continue;
    }
    if (token === "--category") {
      args.category = rest.shift();
      continue;
    }
    if (token === "--draft") {
      args.draft = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }

    if (token.startsWith("-")) {
      // eslint-disable-next-line no-console
      console.error(`未知参数: ${token}`);
      printHelp();
      process.exit(1);
    }

    args._.push(token);
  }

  return args;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`hot-docs

用法:
  hot-docs dev [--config <path>]
  hot-docs build [--config <path>] [--outDir <dir>]
  hot-docs preview [--config <path>] [--outDir <dir>] [--port <number>] [--host <host>] [--open]
  hot-docs init [--force]
  hot-docs new doc <path> [--title <title>] [--force]
  hot-docs new post <slug> [--title <title>] [--tags <a,b>] [--category <cat>] [--draft] [--force]

说明:
  - 默认读取 hot-docs.config.(json|mjs|js|cjs)，否则使用内置默认配置
`);
}

const args = parseArgs(process.argv.slice(2));
const startDir = process.cwd();
const projectCwd = await resolveProjectCwd(startDir);
const cwd = args.command === "init" ? startDir : projectCwd;

if (!args.command || args.command === "help") {
  printHelp();
  process.exit(0);
}

if (args.command === "init") {
  await initProject(cwd, { force: args.force ?? false });
} else if (args.command === "new") {
  const [kind, target] = args._;
  if (!kind || !target) {
    // eslint-disable-next-line no-console
    console.error("用法: hot-docs new <doc|post> <path>");
    process.exit(1);
  }

  const config = await loadConfig({ configPath: args.config, cwd });

  if (kind === "doc") {
    await createNewDoc(config, { cwd, targetPath: target, title: args.title, force: args.force ?? false });
  } else if (kind === "post") {
    await createNewPost(config, {
      cwd,
      slug: target,
      title: args.title,
      tags: args.tags,
      category: args.category,
      draft: args.draft,
      force: args.force ?? false
    });
  } else {
    // eslint-disable-next-line no-console
    console.error(`未知 new 类型: ${kind}（仅支持 doc/post）`);
    process.exit(1);
  }
} else if (args.command === "dev") {
  await startDevServer({ configPath: args.config, cwd });
} else if (args.command === "build") {
  const config = await loadConfig({ configPath: args.config, cwd });
  const result = await buildStaticSite(config, { cwd, outDir: args.outDir, includeDrafts: false, clean: true });
  const pluginText = result.plugins.length ? `, plugins: ${result.plugins.join(", ")}` : "";
  // eslint-disable-next-line no-console
  console.log(`Hot Docs build: ${result.pages} pages, ${result.assets} assets${pluginText} -> ${result.outDir}`);
} else if (args.command === "preview") {
  const config = await loadConfig({ configPath: args.config, cwd });
  const outDir = path.resolve(cwd, args.outDir ?? "dist");
  const host = args.host ?? "127.0.0.1";
  const port = args.port ?? 4173;

  await startPreviewServer({ config, outDir, host, port });
  // eslint-disable-next-line no-console
  console.log(`Hot Docs preview: http://${host}:${port}${config.site.base}`);
} else {
  // eslint-disable-next-line no-console
  console.error(`未知命令: ${args.command}`);
  printHelp();
  process.exit(1);
}

async function startPreviewServer(options: { config: HotDocsConfig; outDir: string; host: string; port: number }): Promise<void> {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? options.host}`);
      const pathname = url.pathname;

      const base = options.config.site.base;
      const baseNoTrailing = base.endsWith("/") ? base.slice(0, -1) : base;
      const inBase = base === "/" || pathname === baseNoTrailing || pathname.startsWith(`${baseNoTrailing}/`);

      if (!inBase) {
        if (base !== "/" && pathname === "/") {
          res.writeHead(302, { location: base });
          res.end();
          return;
        }
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      const sitePath = stripBase(base, pathname);
      const fsPath = await resolveDistPath(options.outDir, sitePath);
      if (!fsPath) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      const ext = path.extname(fsPath).toLowerCase();
      res.writeHead(200, { "content-type": contentTypeByExt(ext), "cache-control": "no-cache" });
      res.end(await fs.readFile(fsPath));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(e.stack ?? e.message);
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
}

async function resolveProjectCwd(startDir: string): Promise<string> {
  const configCandidates = [
    "hot-docs.config.json",
    "hot-docs.config.mjs",
    "hot-docs.config.js",
    "hot-docs.config.cjs"
  ];
  const markers = ["pnpm-workspace.yaml", ".git"];

  let dir = path.resolve(startDir);
  while (true) {
    for (const name of configCandidates) {
      if (await exists(path.join(dir, name))) return dir;
    }
    for (const name of markers) {
      if (await exists(path.join(dir, name))) return dir;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return startDir;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveDistPath(outDir: string, sitePath: string): Promise<string | undefined> {
  const decoded = safeDecodeURIComponent(sitePath);
  const clean = decoded.startsWith("/") ? decoded.slice(1) : decoded;
  if (!clean) return path.join(outDir, "index.html");

  const hasExt = path.posix.basename(clean).includes(".");

  if (hasExt) {
    const file = path.join(outDir, ...clean.split("/"));
    return (await fileExists(file)) ? file : undefined;
  }

  const dirIndex = path.join(outDir, ...clean.split("/"), "index.html");
  if (await fileExists(dirIndex)) return dirIndex;

  // 允许访问无尾斜杠路径（/guide/intro），回退到目录 index.html
  const withoutTrailing = clean.endsWith("/") ? clean.slice(0, -1) : clean;
  const dirIndex2 = path.join(outDir, ...withoutTrailing.split("/"), "index.html");
  if (await fileExists(dirIndex2)) return dirIndex2;

  // 同时尝试 /foo/index.html（当 clean 里含尾斜杠时）
  const dirIndex3 = path.join(outDir, ...clean.split("/").filter(Boolean), "index.html");
  if (await fileExists(dirIndex3)) return dirIndex3;

  return undefined;
}

function safeDecodeURIComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function contentTypeByExt(ext: string): string {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function initProject(cwd: string, options: { force: boolean }): Promise<void> {
  const configPath = path.join(cwd, "hot-docs.config.json");
  const contentDir = path.join(cwd, "content");

  const tasks: Array<Promise<void>> = [];

  tasks.push(
    writeFileIfMissing(
      configPath,
      JSON.stringify(
        {
          contentDir: "./content",
          collections: {
            docs: { dir: "docs", routeBase: "/", type: "docs" },
            blog: { dir: "blog", routeBase: "/blog", type: "blog" },
            pages: { dir: "pages", routeBase: "/", type: "pages" }
          },
          site: { title: "Hot Docs", base: "/" },
          dev: { port: 5173, host: "127.0.0.1", open: false, includeDrafts: true }
        },
        null,
        2
      ) + "\n",
      options
    )
  );

  const docsRoot = path.join(contentDir, "docs");
  const blogRoot = path.join(contentDir, "blog");
  const pagesRoot = path.join(contentDir, "pages");

  tasks.push(
    writeFileIfMissing(
      path.join(docsRoot, "index.md"),
      `---\n` +
        `title: Hot Docs\n` +
        `description: 开源、轻量、静态优先的 Docs + Blog 系统\n` +
        `order: 1\n` +
        `---\n\n` +
        `# Hot Docs\n\n` +
        `- [快速开始](./guide/intro.md)\n` +
        `- [Blog 列表](/blog/)\n`,
      options
    )
  );
  tasks.push(
    writeFileIfMissing(
      path.join(docsRoot, "guide", "intro.md"),
      `---\n` + `title: 快速开始\n` + `order: 10\n` + `---\n\n` + `# 快速开始\n\n` + `\`\`\`bash\npnpm install\npnpm dev\n\`\`\`\n`,
      options
    )
  );
  tasks.push(
    writeFileIfMissing(
      path.join(blogRoot, "hello-world.md"),
      `---\n` +
        `title: Hello World\n` +
        `date: ${today()}\n` +
        `tags: [hello, hot-docs]\n` +
        `draft: true\n` +
        `summary: 这是一篇示例草稿文章（dev 可见，build 默认会过滤）。\n` +
        `---\n\n` +
        `# Hello World\n\n` +
        `这是一个 Blog 示例条目。\n`,
      options
    )
  );
  tasks.push(
    writeFileIfMissing(
      path.join(pagesRoot, "about.md"),
      `---\n` + `title: About\n` + `---\n\n` + `# About\n\n` + `这里是一个页面示例。\n`,
      options
    )
  );

  await Promise.all(tasks);
  // eslint-disable-next-line no-console
  console.log(`Hot Docs init: ${cwd}`);
}

async function createNewDoc(
  config: HotDocsConfig,
  options: { cwd: string; targetPath: string; title?: string; force: boolean }
): Promise<void> {
  const collection = findFirstCollectionByType(config, "docs");
  if (!collection) throw new Error("未找到 type=docs 的 collection");

  const rel = normalizeUserPath(options.targetPath);
  const relWithExt = rel.endsWith(".md") || rel.endsWith(".markdown") ? rel : `${rel}.md`;
  const abs = path.resolve(config.contentDir, collection.dir, ...relWithExt.split("/"));
  ensureInside(path.join(config.contentDir, collection.dir), abs);

  const title = (options.title ?? deriveTitleFromPath(relWithExt)).trim() || "Untitled";
  const body = `---\n` + `title: ${title}\n` + `---\n\n` + `# ${title}\n\n`;

  await writeFileIfMissing(abs, body, { force: options.force });
  // eslint-disable-next-line no-console
  console.log(`New doc: ${path.relative(options.cwd, abs)}`);
}

async function createNewPost(
  config: HotDocsConfig,
  options: { cwd: string; slug: string; title?: string; tags?: string; category?: string; draft?: boolean; force: boolean }
): Promise<void> {
  const collection = findFirstCollectionByType(config, "blog");
  if (!collection) throw new Error("未找到 type=blog 的 collection");

  const rel = normalizeUserPath(options.slug);
  const relWithExt = rel.endsWith(".md") || rel.endsWith(".markdown") ? rel : `${rel}.md`;
  const abs = path.resolve(config.contentDir, collection.dir, ...relWithExt.split("/"));
  ensureInside(path.join(config.contentDir, collection.dir), abs);

  const title = (options.title ?? deriveTitleFromPath(relWithExt)).trim() || "Untitled";
  const tagList = parseTags(options.tags);
  const tagsText = tagList.length ? `[${tagList.join(", ")}]` : "[]";

  const front: string[] = [];
  front.push("---");
  front.push(`title: ${title}`);
  front.push(`date: ${today()}`);
  front.push(`tags: ${tagsText}`);
  if (options.category && options.category.trim()) front.push(`category: ${options.category.trim()}`);
  if (options.draft ?? true) front.push(`draft: true`);
  front.push(`summary: ${title}`);
  front.push("---");

  const body = `${front.join("\n")}\n\n# ${title}\n\n`;
  await writeFileIfMissing(abs, body, { force: options.force });
  // eslint-disable-next-line no-console
  console.log(`New post: ${path.relative(options.cwd, abs)}`);
}

function findFirstCollectionByType(config: HotDocsConfig, type: "docs" | "blog" | "pages"): { dir: string; routeBase: string; type: string } | undefined {
  for (const c of Object.values(config.collections)) {
    if (c.type === type) return c;
  }
  return undefined;
}

async function writeFileIfMissing(filePath: string, content: string, options: { force: boolean }): Promise<void> {
  if (!options.force) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      // continue
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function normalizeUserPath(input: string): string {
  const trimmed = input.trim().replaceAll("\\", "/");
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

function deriveTitleFromPath(p: string): string {
  const base = path.posix.basename(p, path.posix.extname(p));
  if (!base) return "Untitled";
  return base
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseTags(input: string | undefined): string[] {
  const raw = (input ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.includes(" ") ? `"${t}"` : t));
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ensureInside(root: string, filePath: string): void {
  const rel = path.relative(path.resolve(root), path.resolve(filePath));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`目标路径不在 contentDir 内: ${filePath}`);
  }
}
