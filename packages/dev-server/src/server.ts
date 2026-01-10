import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import chokidar from "chokidar";
import WebSocket, { WebSocketServer } from "ws";

import {
  buildDocsNavTree,
  loadConfig,
  loadPlugins,
  loadThemeCss,
  listBlogVirtualPages,
  readContentEntry,
  renderMarkdownToHtml,
  scanContent,
  stripBase,
  trimTrailingSlash,
  type ContentEntry,
  type ContentIndex,
  type HotDocsConfig,
  type HotDocsPlugin
} from "@hot-docs/core";

type DevServerOptions = {
  configPath?: string;
  cwd?: string;
};

type WsEvent =
  | { type: "protocol"; protocolVersion: 1 }
  | { type: "doc-changed"; routePath: string; hash: string }
  | { type: "doc-removed"; routePath: string }
  | { type: "nav-updated"; hash: string }
  | {
      type: "overlay-stats";
      entries: number;
      navHash: string;
      at: number;
      durationMs?: number;
      lastEvent?: { kind: "add" | "change" | "unlink"; filePath: string; routePath?: string; action?: "updated" | "removed" };
    }
  | { type: "overlay-error"; message: string; stack?: string; phase?: "http" | "watch" | "plugin" };

export async function startDevServer(options: DevServerOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig({ configPath: options.configPath, cwd });
  const host = config.dev?.host ?? "127.0.0.1";
  const port = config.dev?.port ?? 5173;
  const includeDrafts = config.dev?.includeDrafts ?? true;

  let index = await scanContent(config, { includeDrafts });
  let navHash = computeNavHash(getDocsNav(index, config));
  const themeCss = await loadThemeCss(config, { cwd });
  let blogVirtualByRoute = buildBlogVirtualPageMap(config, index);
  let markdownExtensions = { remarkPlugins: [] as any[], rehypePlugins: [] as any[] };
  let pluginLoadError: Error | undefined;

  try {
    const plugins = await loadPlugins(config, { cwd });
    markdownExtensions = collectMarkdownExtensions(plugins);
    if (plugins.length) {
      // eslint-disable-next-line no-console
      console.log(`Hot Docs plugins: ${plugins.map((p) => p.name).join(", ")}`);
    }
  } catch (err) {
    pluginLoadError = err instanceof Error ? err : new Error(String(err));
    // eslint-disable-next-line no-console
    console.error(pluginLoadError.message);
  }

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "protocol", protocolVersion: 1 } satisfies WsEvent));
    socket.send(
      JSON.stringify(
        {
          type: "overlay-stats",
          entries: index.entriesById.size,
          navHash,
          at: Date.now()
        } satisfies WsEvent
      )
    );
    if (pluginLoadError) {
      socket.send(
        JSON.stringify(
          { type: "overlay-error", message: pluginLoadError.message, stack: pluginLoadError.stack, phase: "plugin" } satisfies WsEvent
        )
      );
    }
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
        res.end(themeCss);
        return;
      }
      if (url.pathname === "/__hot_docs__/overlay.css") {
        res.writeHead(200, { "content-type": "text/css; charset=utf-8" });
        res.end(OVERLAY_CSS);
        return;
      }
      if (url.pathname === "/__hot_docs__/nav") {
        const nav = getDocsNav(index, config);
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ nav, hash: navHash }));
        return;
      }
      if (url.pathname === "/__hot_docs__/page") {
        const route = normalizeRoutePath(url.searchParams.get("route") ?? "/");
        const entry = index.entriesByRoute.get(route);
        if (!entry) {
          const virtual = blogVirtualByRoute.get(route);
          if (virtual) {
            res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ routePath: virtual.routePath, title: virtual.title, html: virtual.html, hash: virtual.hash }));
            return;
          }

          res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }
        const fullPath = path.join(config.contentDir, config.collections[entry.collection]!.dir, entry.relativePath);
        const raw = await fs.readFile(fullPath, "utf8");
        const html = await renderMarkdownToHtml(raw, { config, entry, filePath: fullPath, ...markdownExtensions });
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
      broadcast({ type: "overlay-error", message: e.message, stack: e.stack, phase: "http" });
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
    ignored: (p) =>
      p.includes(`${path.sep}.git${path.sep}`) ||
      p.includes(`${path.sep}node_modules${path.sep}`) ||
      p.includes(`${path.sep}dist${path.sep}`) ||
      p.includes(`${path.sep}.hot-docs${path.sep}`)
  });

  let updateQueue: Promise<void> = Promise.resolve();

  function enqueue(event: { kind: "add" | "change" | "unlink"; filePath: string }, task: () => Promise<OverlayLastEvent | undefined>): void {
    updateQueue = updateQueue
      .then(async () => {
        const start = Date.now();
        const last = await task();
        broadcast({
          type: "overlay-stats",
          entries: index.entriesById.size,
          navHash,
          at: Date.now(),
          durationMs: Date.now() - start,
          lastEvent: last ? { ...last, kind: event.kind } : { kind: event.kind, filePath: event.filePath }
        } satisfies WsEvent);
      })
      .catch((err) => {
        const e = err instanceof Error ? err : new Error(String(err));
        broadcast({ type: "overlay-error", message: e.message, stack: e.stack, phase: "watch" });
      });
  }

  watcher.on("add", (filePath) =>
    enqueue({ kind: "add", filePath }, () =>
      handleFileUpsert({
        config,
        includeDrafts,
        filePath,
        index,
        blogVirtualPages: blogVirtualByRoute,
        onIndex: (v) => (index = v),
        onNavHash: (v) => (navHash = v),
        onBlogVirtualPages: (v) => (blogVirtualByRoute = v),
        broadcast
      })
    )
  );
  watcher.on("change", (filePath) =>
    enqueue({ kind: "change", filePath }, () =>
      handleFileUpsert({
        config,
        includeDrafts,
        filePath,
        index,
        blogVirtualPages: blogVirtualByRoute,
        onIndex: (v) => (index = v),
        onNavHash: (v) => (navHash = v),
        onBlogVirtualPages: (v) => (blogVirtualByRoute = v),
        broadcast
      })
    )
  );
  watcher.on("unlink", (filePath) =>
    enqueue({ kind: "unlink", filePath }, () =>
      handleFileRemove({
        config,
        filePath,
        index,
        blogVirtualPages: blogVirtualByRoute,
        onIndex: (v) => (index = v),
        onNavHash: (v) => (navHash = v),
        onBlogVirtualPages: (v) => (blogVirtualByRoute = v),
        broadcast
      })
    )
  );

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  // eslint-disable-next-line no-console
  console.log(`Hot Docs dev server: http://${host}:${port}`);
}

function computeNavHash(nav: unknown): string {
  if (!nav) return "0";
  const json = JSON.stringify(nav);
  return crypto.createHash("sha1").update(json).digest("hex").slice(0, 12);
}

function buildBlogVirtualPageMap(config: HotDocsConfig, index: ContentIndex): Map<string, { routePath: string; title: string; html: string; hash: string }> {
  const pages = listBlogVirtualPages(config, index).filter((p) => !index.entriesByRoute.has(p.routePath));
  return new Map(pages.map((p) => [trimTrailingSlash(p.routePath), p]));
}

function diffBlogVirtualPages(
  prev: Map<string, { routePath: string; title: string; html: string; hash: string }>,
  next: Map<string, { routePath: string; title: string; html: string; hash: string }>
): { removed: string[]; changed: Array<{ routePath: string; hash: string }> } {
  const removed: string[] = [];
  const changed: Array<{ routePath: string; hash: string }> = [];

  for (const route of prev.keys()) {
    if (!next.has(route)) removed.push(route);
  }
  for (const [route, page] of next.entries()) {
    const prevPage = prev.get(route);
    if (!prevPage || prevPage.hash !== page.hash) changed.push({ routePath: route, hash: page.hash });
  }

  return { removed, changed };
}

function collectMarkdownExtensions(plugins: HotDocsPlugin[]): { remarkPlugins: any[]; rehypePlugins: any[] } {
  const remarkPlugins: any[] = [];
  const rehypePlugins: any[] = [];

  for (const plugin of plugins) {
    const remark = plugin.markdown?.remarkPlugins ?? [];
    const rehype = plugin.markdown?.rehypePlugins ?? [];
    if (Array.isArray(remark)) remarkPlugins.push(...remark);
    if (Array.isArray(rehype)) rehypePlugins.push(...rehype);
  }

  return { remarkPlugins, rehypePlugins };
}

function getDocsCollectionId(config: HotDocsConfig): string | undefined {
  for (const [id, c] of Object.entries(config.collections)) {
    if (c.type === "docs") return id;
  }
  return undefined;
}

function getDocsNav(index: ContentIndex, config: HotDocsConfig): unknown | null {
  const docsId = getDocsCollectionId(config);
  if (!docsId) return null;
  return index.navTreeByCollection.get(docsId) ?? null;
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
    <link rel="stylesheet" href="/__hot_docs__/overlay.css" />
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
    <details id="hd-overlay" class="hd-overlay">
      <summary class="hd-overlay-summary">
        <span class="hd-overlay-title">Hot Docs</span>
        <span id="hd-overlay-summary-text" class="hd-overlay-summary-text"></span>
      </summary>
      <div class="hd-overlay-body">
        <div id="hd-overlay-status" class="hd-overlay-status"></div>
        <div class="hd-overlay-actions">
          <button id="hd-overlay-clear" type="button" class="hd-overlay-btn">清空错误</button>
        </div>
        <pre id="hd-overlay-error" class="hd-overlay-error"></pre>
      </div>
    </details>
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
const overlayEl = el("hd-overlay");
const overlaySummaryEl = el("hd-overlay-summary-text");
const overlayStatusEl = el("hd-overlay-status");
const overlayErrorEl = el("hd-overlay-error");
const overlayClearBtn = el("hd-overlay-clear");
const overlayErrors = [];

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

function updateOverlaySummary(stats) {
  if (!overlaySummaryEl) return;
  const parts = [];
  if (stats && typeof stats.entries === "number") parts.push("entries:" + stats.entries);
  if (stats && stats.lastEvent) {
    const ev = stats.lastEvent;
    const dur = typeof stats.durationMs === "number" ? (stats.durationMs + "ms") : "";
    parts.push(ev.kind + ":" + ev.filePath + (dur ? (" " + dur) : ""));
  } else if (stats && typeof stats.durationMs === "number") {
    parts.push("update:" + stats.durationMs + "ms");
  }
  parts.push("errors:" + overlayErrors.length);
  overlaySummaryEl.textContent = parts.join(" | ");
}

function renderOverlayErrors() {
  if (!overlayErrorEl) return;
  if (overlayErrors.length === 0) {
    overlayErrorEl.textContent = "";
    return;
  }
  const last = overlayErrors[overlayErrors.length - 1];
  overlayErrorEl.textContent = last;
}

function pushOverlayError(msg) {
  overlayErrors.push(msg);
  if (overlayEl && overlayEl.tagName === "DETAILS") overlayEl.open = true;
  renderOverlayErrors();
  updateOverlaySummary({});
}

if (overlayClearBtn) {
  overlayClearBtn.addEventListener("click", () => {
    overlayErrors.length = 0;
    renderOverlayErrors();
    updateOverlaySummary({});
  });
}

const ws = new WebSocket(wsUrl);
ws.addEventListener("message", async (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    const currentRoute = normalizeRouteFromPathname(location.pathname);
    if (msg.type === "doc-changed" && msg.routePath === currentRoute) {
      await loadPage(currentRoute);
    }
    if (msg.type === "doc-removed" && msg.routePath === currentRoute) {
      location.href = withBase("/");
      return;
    }
    if (msg.type === "nav-updated") {
      await loadNav();
    }
    if (msg.type === "overlay-stats") {
      if (overlayStatusEl) {
        const t = new Date(msg.at).toLocaleTimeString();
        const last = msg.lastEvent ? (msg.lastEvent.kind + " " + msg.lastEvent.filePath) : "";
        const dur = typeof msg.durationMs === "number" ? (msg.durationMs + "ms") : "";
        overlayStatusEl.textContent = [t, dur, last, ("nav:" + (msg.navHash || ""))].filter(Boolean).join(" | ");
      }
      updateOverlaySummary(msg);
    }
    if (msg.type === "overlay-error") {
      const phase = msg.phase ? ("[" + msg.phase + "] ") : "";
      const text = phase + msg.message + (msg.stack ? ("\\n" + msg.stack) : "");
      console.error("[hot-docs]", text);
      pushOverlayError(text);
    }
  } catch (e) {
    console.error(e);
  }
});
`;

// 默认主题由 core 提供（build/dev 保持一致）

const OVERLAY_CSS = `
.hd-overlay{
  position:fixed;
  right:12px;
  bottom:12px;
  width:min(520px, calc(100vw - 24px));
  max-height:55vh;
  overflow:auto;
  z-index:9999;
  color:rgba(230,237,243,.92);
  background:rgba(15,22,32,.78);
  border:1px solid rgba(255,255,255,.12);
  border-radius:12px;
  box-shadow:0 16px 50px rgba(0,0,0,.45);
  font:12px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.hd-overlay-summary{
  cursor:pointer;
  list-style:none;
  display:flex;
  gap:10px;
  align-items:center;
  padding:10px 12px;
  user-select:none;
}
.hd-overlay-summary::-webkit-details-marker{display:none}
.hd-overlay-title{
  font-weight:700;
  color:rgba(34,211,238,.92);
}
.hd-overlay-summary-text{
  color:rgba(166,179,194,.92);
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.hd-overlay-body{padding:0 12px 12px}
.hd-overlay-status{
  padding:10px 0 8px;
  color:rgba(166,179,194,.92);
}
.hd-overlay-actions{display:flex; justify-content:flex-end; padding:6px 0 8px}
.hd-overlay-btn{
  background:rgba(23,34,52,.85);
  color:rgba(230,237,243,.92);
  border:1px solid rgba(124,58,237,.35);
  border-radius:10px;
  padding:6px 10px;
  cursor:pointer;
}
.hd-overlay-btn:hover{
  border-color:rgba(34,211,238,.35);
  box-shadow:0 0 0 1px rgba(34,211,238,.12), 0 0 22px rgba(124,58,237,.14);
}
.hd-overlay-error{
  margin:0;
  padding:10px 12px;
  white-space:pre-wrap;
  border:1px solid rgba(255,255,255,.10);
  border-radius:10px;
  background:rgba(0,0,0,.25);
  max-height:28vh;
  overflow:auto;
}
`;

type OverlayLastEvent = { filePath: string; routePath?: string; action?: "updated" | "removed" };

type UpsertArgs = {
  config: HotDocsConfig;
  includeDrafts: boolean;
  filePath: string;
  index: ContentIndex;
  blogVirtualPages: Map<string, { routePath: string; title: string; html: string; hash: string }>;
  onIndex: (next: ContentIndex) => void;
  onNavHash: (next: string) => void;
  onBlogVirtualPages: (next: Map<string, { routePath: string; title: string; html: string; hash: string }>) => void;
  broadcast: (event: WsEvent) => void;
};

async function handleFileUpsert(args: UpsertArgs): Promise<OverlayLastEvent | undefined> {
  if (!isMarkdownFile(args.filePath)) return;

  const resolved = resolveCollectionForFilePath(args.config, args.filePath);
  if (!resolved) return;

  const previous = findEntryByFilePath(args.index, resolved.collectionId, resolved.relativePath);

  const entry = await readContentEntry({
    filePath: resolved.filePath,
    collectionId: resolved.collectionId,
    collection: resolved.collection,
    relativePath: resolved.relativePath
  });

  if (!args.includeDrafts && entry.draft) {
    if (previous) {
      removeEntry(args.index, previous);
      const navChanged = maybeRebuildDocsNav(args.index, args.config, resolved.collectionId, true);
      if (navChanged) {
        const nextHash = computeNavHash(getDocsNav(args.index, args.config));
        args.onNavHash(nextHash);
        args.broadcast({ type: "nav-updated", hash: nextHash });
      }
      if (resolved.collection.type === "blog") {
        const next = buildBlogVirtualPageMap(args.config, args.index);
        const diff = diffBlogVirtualPages(args.blogVirtualPages, next);
        args.onBlogVirtualPages(next);
        for (const routePath of diff.removed) args.broadcast({ type: "doc-removed", routePath });
        for (const ev of diff.changed) args.broadcast({ type: "doc-changed", routePath: ev.routePath, hash: ev.hash });
      }
      args.broadcast({ type: "doc-removed", routePath: previous.routePath });
      return { filePath: resolved.displayPath, routePath: previous.routePath, action: "removed" };
    }
    return;
  }

  upsertEntry(args.index, entry, previous);

  const shouldRebuildNav = isDocsCollection(args.config, resolved.collectionId) && didDocsMetaChange(previous, entry);
  const navChanged = maybeRebuildDocsNav(args.index, args.config, resolved.collectionId, shouldRebuildNav);
  if (navChanged) {
    const nextHash = computeNavHash(getDocsNav(args.index, args.config));
    args.onNavHash(nextHash);
    args.broadcast({ type: "nav-updated", hash: nextHash });
  }

  args.onIndex(args.index);
  if (resolved.collection.type === "blog") {
    const next = buildBlogVirtualPageMap(args.config, args.index);
    const diff = diffBlogVirtualPages(args.blogVirtualPages, next);
    args.onBlogVirtualPages(next);
    for (const routePath of diff.removed) args.broadcast({ type: "doc-removed", routePath });
    for (const ev of diff.changed) args.broadcast({ type: "doc-changed", routePath: ev.routePath, hash: ev.hash });
  }
  args.broadcast({ type: "doc-changed", routePath: entry.routePath, hash: entry.hash });
  return { filePath: resolved.displayPath, routePath: entry.routePath, action: "updated" };
}

type RemoveArgs = {
  config: HotDocsConfig;
  filePath: string;
  index: ContentIndex;
  blogVirtualPages: Map<string, { routePath: string; title: string; html: string; hash: string }>;
  onIndex: (next: ContentIndex) => void;
  onNavHash: (next: string) => void;
  onBlogVirtualPages: (next: Map<string, { routePath: string; title: string; html: string; hash: string }>) => void;
  broadcast: (event: WsEvent) => void;
};

async function handleFileRemove(args: RemoveArgs): Promise<OverlayLastEvent | undefined> {
  if (!isMarkdownFile(args.filePath)) return;

  const resolved = resolveCollectionForFilePath(args.config, args.filePath);
  if (!resolved) return;

  const previous = findEntryByFilePath(args.index, resolved.collectionId, resolved.relativePath);
  if (!previous) return;

  removeEntry(args.index, previous);

  const navChanged = maybeRebuildDocsNav(args.index, args.config, resolved.collectionId, isDocsCollection(args.config, resolved.collectionId));
  if (navChanged) {
    const nextHash = computeNavHash(getDocsNav(args.index, args.config));
    args.onNavHash(nextHash);
    args.broadcast({ type: "nav-updated", hash: nextHash });
  }

  args.onIndex(args.index);
  if (resolved.collection.type === "blog") {
    const next = buildBlogVirtualPageMap(args.config, args.index);
    const diff = diffBlogVirtualPages(args.blogVirtualPages, next);
    args.onBlogVirtualPages(next);
    for (const routePath of diff.removed) args.broadcast({ type: "doc-removed", routePath });
    for (const ev of diff.changed) args.broadcast({ type: "doc-changed", routePath: ev.routePath, hash: ev.hash });
  }
  args.broadcast({ type: "doc-removed", routePath: previous.routePath });
  return { filePath: resolved.displayPath, routePath: previous.routePath, action: "removed" };
}

function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

type ResolvedFile = {
  filePath: string;
  collectionId: string;
  collection: HotDocsConfig["collections"][string];
  relativePath: string;
  displayPath: string;
};

function resolveCollectionForFilePath(config: HotDocsConfig, filePath: string): ResolvedFile | undefined {
  const abs = path.resolve(filePath);
  for (const [collectionId, collection] of Object.entries(config.collections)) {
    const root = path.join(config.contentDir, collection.dir);
    const rootAbs = path.resolve(root);
    if (!isPathInside(rootAbs, abs)) continue;
    const relativePath = path.relative(rootAbs, abs);
    if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) continue;
    return {
      filePath: abs,
      collectionId,
      collection,
      relativePath,
      displayPath: `${collectionId}/${relativePath.split(path.sep).join("/")}`
    };
  }
  return undefined;
}

function findEntryByFilePath(index: ContentIndex, collectionId: string, relativePath: string): ContentEntry | undefined {
  const id = `${collectionId}:${relativePath.split(path.sep).join("/")}`;
  return index.entriesById.get(id);
}

function removeEntry(index: ContentIndex, entry: ContentEntry): void {
  index.entriesById.delete(entry.id);
  index.entriesByRoute.delete(entry.routePath);
}

function upsertEntry(index: ContentIndex, entry: ContentEntry, previous?: ContentEntry): void {
  if (previous) removeEntry(index, previous);

  const conflict = index.entriesByRoute.get(entry.routePath);
  if (conflict && conflict.id !== entry.id) removeEntry(index, conflict);

  index.entriesById.set(entry.id, entry);
  index.entriesByRoute.set(entry.routePath, entry);
}

function isDocsCollection(config: HotDocsConfig, collectionId: string): boolean {
  return config.collections[collectionId]?.type === "docs";
}

function didDocsMetaChange(previous: ContentEntry | undefined, next: ContentEntry): boolean {
  if (!previous) return true;
  return previous.title !== next.title || previous.order !== next.order || previous.routePath !== next.routePath;
}

function maybeRebuildDocsNav(index: ContentIndex, config: HotDocsConfig, collectionId: string, shouldRebuild: boolean): boolean {
  if (!shouldRebuild) return false;
  const collection = config.collections[collectionId];
  if (!collection || collection.type !== "docs") return false;

  const entries = [...index.entriesById.values()].filter((e) => e.collection === collectionId);
  index.navTreeByCollection.set(collectionId, buildDocsNavTree(collection.routeBase, entries));
  return true;
}
