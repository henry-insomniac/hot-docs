import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import chokidar from "chokidar";
import WebSocket, { WebSocketServer } from "ws";

import { loadConfig, renderMarkdownToHtml, scanContent, type HotDocsConfig } from "@hot-docs/core";

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
        res.end(THEME_CSS);
        return;
      }
      if (url.pathname === "/__hot_docs__/nav") {
        const nav = index.navTreeByCollection.get("docs") ?? null;
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ nav, hash: navHash }));
        return;
      }
      if (url.pathname === "/__hot_docs__/page") {
        const route = url.searchParams.get("route") ?? "/";
        const entry = index.entriesByRoute.get(route);
        if (!entry) {
          res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }
        const fullPath = path.join(config.contentDir, config.collections[entry.collection]!.dir, entry.relativePath);
        const raw = await fs.readFile(fullPath, "utf8");
        const html = await renderMarkdownToHtml(raw);
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ routePath: entry.routePath, title: entry.title, html, hash: entry.hash }));
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

function filePathToRoute(config: HotDocsConfig, filePath: string): string | undefined {
  const abs = path.resolve(filePath);
  for (const [id, c] of Object.entries(config.collections)) {
    const root = path.join(config.contentDir, c.dir);
    if (!abs.startsWith(path.resolve(root) + path.sep)) continue;
    const rel = path.relative(root, abs);
    const posixRel = rel.split(path.sep).join("/");
    const withoutExt = posixRel.replace(/\.(md|markdown)$/i, "");
    const trimmed = withoutExt.endsWith("/index") ? withoutExt.slice(0, -"/index".length) : withoutExt;
    const base = c.routeBase === "/" ? "" : c.routeBase;
    const joined = `${base}/${trimmed}`.replace(/\/+/g, "/");
    return joined === "" ? "/" : joined;
  }
  return undefined;
}

const CLIENT_JS = `
const base = (window.__HOT_DOCS_BASE__ || "/");
function withBase(p) {
  if (base === "/") return p;
  if (p === "/") return base.endsWith("/") ? base.slice(0, -1) : base;
  return (base.endsWith("/") ? base.slice(0, -1) : base) + p;
}
function stripBase(p) {
  if (base === "/") return p || "/";
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  if (p === b) return "/";
  if (p.startsWith(b + "/")) return p.slice(b.length) || "/";
  return p || "/";
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
    const href = withBase(node.routePath);
    const active = href === location.pathname ? " hd-active" : "";
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
await loadPage(stripBase(location.pathname));

const ws = new WebSocket(wsUrl);
ws.addEventListener("message", async (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    const currentRoute = stripBase(location.pathname);
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

const THEME_CSS = `
:root{
  --hd-bg-0:#0b0f14;
  --hd-bg-1:#0f1620;
  --hd-bg-2:#121b26;
  --hd-bg-3:#172234;
  --hd-fg-0:#e6edf3;
  --hd-fg-1:#a6b3c2;
  --hd-fg-2:#7f8b99;
  --hd-border-0:rgba(255,255,255,.08);
  --hd-border-1:rgba(255,255,255,.12);
  --hd-accent:#7c3aed;
  --hd-accent-2:#22d3ee;
  --hd-glow:rgba(124,58,237,.25);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  background:radial-gradient(1200px 600px at 10% 0%, rgba(124,58,237,.12), transparent 55%),
             radial-gradient(900px 500px at 100% 30%, rgba(34,211,238,.10), transparent 60%),
             var(--hd-bg-0);
  color:var(--hd-fg-0);
  font:14px/1.65 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
}
a{color:var(--hd-accent-2); text-decoration:none}
a:hover{color:#7ef0ff}
#hd-app{
  display:grid;
  grid-template-columns: 280px 1fr;
  min-height:100vh;
}
#hd-sidebar{
  padding:16px;
  background:linear-gradient(180deg, rgba(18,27,38,.92), rgba(15,22,32,.92));
  border-right:1px solid var(--hd-border-0);
}
#hd-main{
  padding:16px 22px 60px;
}
#hd-header{
  position:sticky;
  top:0;
  backdrop-filter: blur(10px);
  background:rgba(11,15,20,.6);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(124,58,237,.06), 0 10px 30px rgba(0,0,0,.35);
  border-radius:12px;
  padding:10px 14px;
  margin-bottom:16px;
}
#hd-brand{
  font-weight:600;
  letter-spacing:.2px;
  color:var(--hd-fg-0);
}
#hd-content{
  max-width: 980px;
  background:rgba(18,27,38,.60);
  border:1px solid var(--hd-border-0);
  box-shadow:0 0 0 1px rgba(34,211,238,.05), 0 18px 60px rgba(0,0,0,.35);
  border-radius:14px;
  padding:22px 22px;
}
.hd-list{list-style:none; padding-left:0; margin:0}
.hd-root{display:flex; flex-direction:column; gap:10px}
.hd-dir-title{
  font-size:12px;
  color:var(--hd-fg-2);
  text-transform:uppercase;
  letter-spacing:.12em;
  margin:8px 0 6px;
}
.hd-item a{
  display:block;
  padding:8px 10px;
  border:1px solid transparent;
  border-radius:10px;
  color:var(--hd-fg-1);
}
.hd-item a:hover{
  background:rgba(23,34,52,.65);
  border-color:rgba(34,211,238,.18);
  box-shadow:0 0 0 1px rgba(124,58,237,.10), 0 0 20px rgba(124,58,237,.10);
  color:var(--hd-fg-0);
}
.hd-active a{
  background:rgba(23,34,52,.85);
  border-color:rgba(124,58,237,.35);
  box-shadow:0 0 0 1px rgba(124,58,237,.18), 0 0 22px rgba(124,58,237,.18);
  color:var(--hd-fg-0);
}
article h1,article h2,article h3{scroll-margin-top:90px}
article h1{font-size:28px; margin:0 0 12px}
article h2{font-size:20px; margin:28px 0 10px}
article p{color:var(--hd-fg-1)}
article code{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.08);
  padding:2px 6px;
  border-radius:8px;
}
article pre{
  background:rgba(0,0,0,.35);
  border:1px solid rgba(255,255,255,.10);
  border-radius:12px;
  padding:14px;
  overflow:auto;
}
`;
