import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import chokidar from "chokidar";
import WebSocket, { WebSocketServer } from "ws";

import {
  DEFAULT_THEME_CSS,
  loadConfig,
  renderMarkdownToHtml,
  scanContent,
  stripBase,
  trimTrailingSlash,
  type HotDocsConfig
} from "@hot-docs/core";

type DevServerOptions = {
  configPath?: string;
  cwd?: string;
};

type WsEvent =
  | { type: "protocol"; protocolVersion: 1 }
  | { type: "doc-changed"; routePath: string; hash: string }
  | { type: "nav-updated"; hash: string }
  | { type: "overlay-error"; message: string; stack?: string };

export async function startDevServer(options: DevServerOptions = {}): Promise<void> {
  const config = await loadConfig({ configPath: options.configPath, cwd: options.cwd });
  const host = config.dev?.host ?? "127.0.0.1";
  const port = config.dev?.port ?? 5173;
  const includeDrafts = config.dev?.includeDrafts ?? true;

  let index = await scanContent(config, { includeDrafts });
  let navHash = computeNavHash(index);

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "protocol", protocolVersion: 1 } satisfies WsEvent));
    socket.on("close", () => clients.delete(socket));
  });

  function broadcast(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
      if (url.pathname === "/__hot_docs__/client.js") {
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        res.end(CLIENT_JS);
        return;
      }
      if (url.pathname === "/__hot_docs__/theme.css") {
        res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        res.end(DEFAULT_THEME_CSS);
        return;
      }
      if (url.pathname === "/__hot_docs__/nav") {
        const nav = index.navTreeByCollection.get("docs") ?? null;
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ nav, hash: navHash }));
        return;
      }
      if (url.pathname === "/__hot_docs__/page") {
        const route = normalizeRoutePath(url.searchParams.get("route") ?? "/");
        const entry = index.entriesByRoute.get(route);
        if (!entry) {
          res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }
        const fullPath = path.join(config.contentDir, config.collections[entry.collection]!.dir, entry.relativePath);
        const raw = await fs.readFile(fullPath, "utf8");
        const html = await renderMarkdownToHtml(raw, { config, entry, filePath: fullPath });
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ routePath: entry.routePath, title: entry.title, html, hash: entry.hash }));
        return;
      }

      const sitePath = stripBase(config.site.base, url.pathname);
      if (looksLikeAssetRequest(sitePath)) {
        const asset = await resolveAssetFilePath(config, sitePath);
        if (asset) {
          const contentType = contentTypeByExt(path.extname(asset).toLowerCase());
          res.writeHead(200, { "content-type": contentType, "cache-control": "no-cache" });
          res.end(await fs.readFile(asset));
          return;
        }
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      // Shell (MPA)：任何路由都返回同一个壳，让 client.js 负责拉取 page payload
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderShellHtml(config));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      broadcast({ type: "overlay-error", message: e.message, stack: e.stack });
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(e.stack ?? e.message);
    }
  });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    if (url.pathname !== "/__hot_docs__/ws") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  const watcher = chokidar.watch(config.contentDir, {
    ignoreInitial: true,
    ignored: (p) => p.includes(`${path.sep}.git${path.sep}`) || p.includes(`${path.sep}node_modules${path.sep}`)
  });

  let rescanTimer: NodeJS.Timeout | undefined;
  let rescanInFlight: Promise<void> | undefined;

  async function rescanNow(): Promise<void> {
    index = await scanContent(config, { includeDrafts });
    navHash = computeNavHash(index);
  }

  async function rescanAndBroadcastNav(): Promise<void> {
    try {
      await rescanNow();
      broadcast({ type: "nav-updated", hash: navHash });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      broadcast({ type: "overlay-error", message: e.message, stack: e.stack });
    }
  }

  function triggerRescan(): void {
    if (rescanTimer) clearTimeout(rescanTimer);
    rescanTimer = setTimeout(() => {
      rescanInFlight = rescanAndBroadcastNav().finally(() => {
        rescanInFlight = undefined;
      });
    }, 80);
  }

  watcher.on("add", triggerRescan);
  watcher.on("change", async (filePath) => {
    if (rescanInFlight) await rescanInFlight;
    await rescanAndBroadcastNav();
    const route = filePathToRoute(config, filePath);
    if (!route) return;
    const entry = index.entriesByRoute.get(route);
    if (!entry) return;
    broadcast({ type: "doc-changed", routePath: entry.routePath, hash: entry.hash });
  });
  watcher.on("unlink", triggerRescan);

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  // eslint-disable-next-line no-console
  console.log(`Hot Docs dev server: http://${host}:${port}`);
}

function computeNavHash(index: Awaited<ReturnType<typeof scanContent>>): string {
  const nav = index.navTreeByCollection.get("docs");
  if (!nav) return "0";
  const json = JSON.stringify(nav);
  return crypto.createHash("sha1").update(json).digest("hex").slice(0, 12);
}

function renderShellHtml(config: HotDocsConfig): string {
  const siteTitle = escapeHtml(config.site.title);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${siteTitle}</title>
    <link rel="stylesheet" href="/__hot_docs__/theme.css" />
  </head>
  <body>
    <div id="hd-app">
      <aside id="hd-sidebar"></aside>
      <main id="hd-main">
        <div id="hd-header">
          <div id="hd-brand">${siteTitle}</div>
        </div>
        <article id="hd-content"></article>
      </main>
    </div>
    <script>window.__HOT_DOCS_BASE__=${JSON.stringify(config.site.base)};</script>
    <script type="module" src="/__hot_docs__/client.js"></script>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function normalizeRoutePath(routePath: string): string {
  const normalized = trimTrailingSlash(routePath.trim() || "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function filePathToRoute(config: HotDocsConfig, filePath: string): string | undefined {
  const abs = path.resolve(filePath);
  for (const [id, c] of Object.entries(config.collections)) {
    const root = path.join(config.contentDir, c.dir);
    if (!abs.startsWith(path.resolve(root) + path.sep)) continue;
    const rel = path.relative(root, abs);
    const posixRel = rel.split(path.sep).join("/");
    const withoutExt = posixRel.replace(/\.(md|markdown)$/i, "");
    const trimmed = withoutExt === "index" ? "" : withoutExt.endsWith("/index") ? withoutExt.slice(0, -"/index".length) : withoutExt;
    const base = c.routeBase === "/" ? "" : c.routeBase;
    const joined = `${base}/${trimmed}`.replace(/\/+/g, "/");
    return joined === "" ? "/" : joined;
  }
  return undefined;
}

function looksLikeAssetRequest(sitePath: string): boolean {
  const pathname = sitePath.split("?")[0]?.split("#")[0] ?? sitePath;
  const baseName = path.posix.basename(pathname);
  return baseName.includes(".") && !baseName.endsWith(".");
}

async function resolveAssetFilePath(config: HotDocsConfig, sitePath: string): Promise<string | undefined> {
  const candidates = Object.entries(config.collections).sort((a, b) => b[1].routeBase.length - a[1].routeBase.length);

  for (const [, collection] of candidates) {
    const rel = stripRouteBase(collection.routeBase, sitePath);
    if (rel === undefined || rel === "") continue;
    const collectionRoot = path.join(config.contentDir, collection.dir);
    const abs = path.resolve(collectionRoot, rel);
    if (!isPathInside(collectionRoot, abs)) continue;
    try {
      const stat = await fs.stat(abs);
      if (stat.isFile()) return abs;
    } catch {
      // ignore
    }
  }

  return undefined;
}

function stripRouteBase(routeBase: string, pathname: string): string | undefined {
  if (routeBase === "/") return pathname.startsWith("/") ? pathname.slice(1) : pathname;
  if (pathname === routeBase) return "";
  if (pathname.startsWith(`${routeBase}/`)) return pathname.slice(routeBase.length + 1);
  return undefined;
}

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function contentTypeByExt(ext: string): string {
  switch (ext) {
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

const CLIENT_JS = `
const base = (window.__HOT_DOCS_BASE__ || "/");
function withBase(p) {
  if (base === "/") return p;
  if (p === "/") return base;
  return (base.endsWith("/") ? base.slice(0, -1) : base) + p;
}
function stripBase(p) {
  if (base === "/") return p || "/";
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  if (p === b) return "/";
  if (p.startsWith(b + "/")) return p.slice(b.length) || "/";
  return p || "/";
}
function trimTrailingSlash(p) {
  if (!p) return "/";
  if (p === "/") return "/";
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
function normalizeRouteFromPathname(pathname) {
  return trimTrailingSlash(stripBase(pathname));
}

const wsUrl = (() => {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return proto + "//" + location.host + "/__hot_docs__/ws";
})();

function el(id) { return document.getElementById(id); }
const contentEl = el("hd-content");
const sidebarEl = el("hd-sidebar");

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return await res.json();
}

async function loadPage(routePath) {
  const data = await fetchJson("/__hot_docs__/page?route=" + encodeURIComponent(routePath));
  document.title = data.title;
  contentEl.innerHTML = data.html;
}

function renderNavNode(node) {
  if (!node) return "";
  if (node.type === "page") {
    const hrefBase = withBase(node.routePath);
    const href = node.routePath === "/" ? hrefBase : hrefBase + "/";
    const currentRoute = normalizeRouteFromPathname(location.pathname);
    const active = node.routePath === currentRoute ? " hd-active" : "";
    return '<li class="hd-item' + active + '"><a href="' + href + '">' + escapeHtml(node.title) + "</a></li>";
  }
  const children = (node.children || []).map(renderNavNode).join("");
  const title = node.pathSegment ? '<div class="hd-dir-title">' + escapeHtml(node.title) + "</div>" : "";
  return '<li class="hd-dir">' + title + '<ul class="hd-list">' + children + "</ul></li>";
}

function escapeHtml(s) {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function loadNav() {
  const data = await fetchJson("/__hot_docs__/nav");
  if (!data.nav) return;
  sidebarEl.innerHTML = '<ul class="hd-list hd-root">' + renderNavNode(data.nav) + "</ul>";
}

await loadNav();
await loadPage(normalizeRouteFromPathname(location.pathname));

const ws = new WebSocket(wsUrl);
ws.addEventListener("message", async (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    const currentRoute = normalizeRouteFromPathname(location.pathname);
    if (msg.type === "doc-changed" && msg.routePath === currentRoute) {
      await loadPage(currentRoute);
    }
    if (msg.type === "nav-updated") {
      await loadNav();
    }
    if (msg.type === "overlay-error") {
      console.error("[hot-docs]", msg.message, msg.stack || "");
    }
  } catch (e) {
    console.error(e);
  }
});
`;

// 默认主题由 core 提供（build/dev 保持一致）
