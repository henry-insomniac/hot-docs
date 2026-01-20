import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function parseArgs(argv) {
  const envPort = typeof process.env.HOT_DOCS_DEPLOY_PORT === "string" ? Number(process.env.HOT_DOCS_DEPLOY_PORT) : undefined;
  const args = {
    host: process.env.HOT_DOCS_DEPLOY_HOST ?? "",
    user: process.env.HOT_DOCS_DEPLOY_USER ?? "",
    port: Number.isFinite(envPort) && envPort ? envPort : 22,
    dest: process.env.HOT_DOCS_DEPLOY_DEST ?? "",
    identity: process.env.HOT_DOCS_DEPLOY_IDENTITY ?? "~/.ssh/id_ed25519",
    debounceMs: 1500,
    poll: false,
    pollIntervalMs: 1000,
    scan: true,
    scanIntervalMs: 2000
  };

  const rest = [...argv];
  while (rest.length) {
    const t = rest.shift();
    if (!t) break;
    if (t === "--host") args.host = String(rest.shift() ?? "");
    else if (t === "--user") args.user = String(rest.shift() ?? "");
    else if (t === "--port") args.port = Number(rest.shift() ?? 22);
    else if (t === "--dest") args.dest = String(rest.shift() ?? "");
    else if (t === "--identity") args.identity = String(rest.shift() ?? "");
    else if (t === "--debounce") args.debounceMs = Number(rest.shift() ?? 1500);
    else if (t === "--poll") args.poll = true;
    else if (t === "--poll-interval") args.pollIntervalMs = Number(rest.shift() ?? 1000);
    else if (t === "--scan") args.scan = true;
    else if (t === "--no-scan") args.scan = false;
    else if (t === "--scan-interval") args.scanIntervalMs = Number(rest.shift() ?? 2000);
    else if (t === "--help" || t === "-h") args.help = true;
    else throw new Error(`未知参数: ${t}`);
  }
  return args;
}

function usage() {
  // eslint-disable-next-line no-console
  console.log(`用法:
  node scripts/deploy-watch.mjs --host <HOST> --user <USER> --dest <DEST> [--port 22] [--identity ~/.ssh/id_ed25519] [--debounce 1500] [--poll] [--poll-interval 1000] [--scan|--no-scan] [--scan-interval 2000]

环境变量（可选，作为默认值）:
  HOT_DOCS_DEPLOY_HOST / HOT_DOCS_DEPLOY_USER / HOT_DOCS_DEPLOY_PORT / HOT_DOCS_DEPLOY_DEST / HOT_DOCS_DEPLOY_IDENTITY

行为:
  - 监听 content/ 与 hot-docs.config.json 变化
  - 自动执行 pnpm site:build
  - 自动 rsync dist/ 到服务器

注意:
  - 默认优先使用 chokidar（更适合 pm2/docker）；若未安装则回退到 fs.watch(recursive)（macOS 可用）
`);
}

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function exists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadChokidar() {
  try {
    const mod = await import("chokidar");
    return mod.default ?? mod;
  } catch {
    return undefined;
  }
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} 退出码 ${code}`));
    });
    child.on("error", reject);
  });
}

async function deployOnce({ host, user, port, dest, identity }) {
  await run("pnpm", ["-s", "site:build"]);

  const distDir = path.join(process.cwd(), "dist");
  if (!(await exists(distDir))) throw new Error("dist/ 不存在（site:build 失败？）");

  const sshArgs = ["-i", identity, "-p", String(port), "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
  const rsyncArgs = [
    "-az",
    "--delete",
    "--delay-updates",
    "-e",
    ["ssh", ...sshArgs].join(" "),
    `${distDir}${path.sep}`,
    `${user}@${host}:${dest.replace(/\/+$/, "")}/`
  ];
  await run("rsync", rsyncArgs);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

if (!args.host) throw new Error("--host 不能为空");
if (!args.user) throw new Error("--user 不能为空");
if (!Number.isFinite(args.port) || args.port < 1) throw new Error("--port 必须是合法端口");
if (!args.dest) throw new Error("--dest 不能为空");
if (!Number.isFinite(args.debounceMs) || args.debounceMs < 0) throw new Error("--debounce 必须是非负数");
if (args.pollIntervalMs !== undefined && (!Number.isFinite(args.pollIntervalMs) || args.pollIntervalMs < 50)) {
  throw new Error("--poll-interval 必须是 >= 50 的毫秒数");
}
if (args.scanIntervalMs !== undefined && (!Number.isFinite(args.scanIntervalMs) || args.scanIntervalMs < 200)) {
  throw new Error("--scan-interval 必须是 >= 200 的毫秒数");
}

const identity = expandHome(args.identity);
if (!(await exists(identity))) {
  throw new Error(`SSH identity 不存在：${identity}\n请先执行：ssh-keygen -t ed25519 -f ${identity}`);
}

// eslint-disable-next-line no-console
console.log(`[hot-docs] watching content/ -> deploy to ${args.user}@${args.host}:${args.dest} (debounce ${args.debounceMs}ms)`);

let timer = undefined;
let running = false;
let rerun = false;

async function kick(reason) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      // eslint-disable-next-line no-console
      console.log(`[hot-docs] change detected (${reason}) -> build + sync...`);
      await deployOnce({ host: args.host, user: args.user, port: args.port, dest: args.dest, identity });
      // eslint-disable-next-line no-console
      console.log(`[hot-docs] deployed at ${new Date().toLocaleString()}`);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      // eslint-disable-next-line no-console
      console.error(`[hot-docs] deploy failed: ${err.message}`);
    } finally {
      running = false;
      if (rerun) {
        rerun = false;
        kick("queued");
      }
    }
  }, args.debounceMs);
}

function safeWatch(fileOrDir, options) {
  try {
    return fs.watch(fileOrDir, options, (eventType, filename) => {
      const name = filename ? String(filename) : "";
      void kick(`${eventType}${name ? `:${name}` : ""}`);
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    // eslint-disable-next-line no-console
    console.error(`[hot-docs] watch failed: ${fileOrDir}: ${err.message}`);
    return undefined;
  }
}

const watchers = [];
const contentDir = path.join(process.cwd(), "content");
const configPath = path.join(process.cwd(), "hot-docs.config.json");

const chokidar = await loadChokidar();
if (chokidar) {
  const usePolling = !!args.poll;
  // eslint-disable-next-line no-console
  console.log(`[hot-docs] watcher: chokidar (poll=${usePolling ? "on" : "off"} interval=${args.pollIntervalMs}ms)`);

  const w = chokidar.watch([contentDir, configPath], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
    usePolling,
    interval: args.pollIntervalMs
  });

  w.on("all", (event, p) => void kick(`${event}:${p}`));
  w.on("ready", () => {
    // eslint-disable-next-line no-console
    console.log("[hot-docs] watcher ready");
  });
  watchers.push({ close: () => w.close() });
} else {
  // eslint-disable-next-line no-console
  console.log("[hot-docs] watcher: fs.watch(recursive)（未安装 chokidar）");
  watchers.push(safeWatch(contentDir, { recursive: true }));
  watchers.push(safeWatch(configPath, {}));
}

let scanTimer = undefined;
let lastFingerprint = undefined;
let scanning = false;

async function computeFingerprint() {
  let maxMtimeMs = 0;
  let fileCount = 0;
  let totalSize = 0;

  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!ent.isFile()) continue;
      try {
        const st = await fsp.stat(full);
        fileCount += 1;
        totalSize += st.size;
        if (st.mtimeMs > maxMtimeMs) maxMtimeMs = st.mtimeMs;
      } catch {
        // ignore
      }
    }
  }

  await walk(contentDir);
  try {
    const st = await fsp.stat(configPath);
    if (st.mtimeMs > maxMtimeMs) maxMtimeMs = st.mtimeMs;
    totalSize += st.size;
  } catch {
    // ignore
  }

  return `${fileCount}:${totalSize}:${Math.floor(maxMtimeMs)}`;
}

if (args.scan) {
  // eslint-disable-next-line no-console
  console.log(`[hot-docs] watcher: fallback scan (interval=${args.scanIntervalMs}ms)`);
  lastFingerprint = await computeFingerprint();
  scanTimer = setInterval(async () => {
    if (scanning) return;
    scanning = true;
    try {
      const next = await computeFingerprint();
      if (next !== lastFingerprint) {
        lastFingerprint = next;
        void kick("scan");
      }
    } finally {
      scanning = false;
    }
  }, args.scanIntervalMs);
}

function shutdown() {
  for (const w of watchers) w?.close?.();
  if (scanTimer) clearInterval(scanTimer);
}

process.on("SIGINT", () => {
  shutdown();
  // eslint-disable-next-line no-console
  console.log("\n[hot-docs] stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
