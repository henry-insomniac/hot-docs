#!/usr/bin/env node
import { startDevServer } from "@hot-docs/dev-server";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { buildStaticSite, loadConfig, stripBase, type HotDocsConfig } from "@hot-docs/core";

type Args = {
  command?: string;
  config?: string;
  outDir?: string;
  port?: number;
  host?: string;
  open?: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
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
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
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

说明:
  - 默认读取 hot-docs.config.(json|mjs|js|cjs)，否则使用内置默认配置
`);
}

const args = parseArgs(process.argv.slice(2));
const cwd = await resolveProjectCwd(process.cwd());

if (!args.command || args.command === "help") {
  printHelp();
  process.exit(0);
}

if (args.command === "dev") {
  await startDevServer({ configPath: args.config, cwd });
} else if (args.command === "build") {
  const config = await loadConfig({ configPath: args.config, cwd });
  const result = await buildStaticSite(config, { cwd, outDir: args.outDir, includeDrafts: false, clean: true });
  // eslint-disable-next-line no-console
  console.log(`Hot Docs build: ${result.pages} pages, ${result.assets} assets -> ${result.outDir}`);
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
