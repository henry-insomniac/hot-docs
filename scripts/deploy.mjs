import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function parseArgs(argv) {
  const envPort = typeof process.env.HOT_DOCS_DEPLOY_PORT === "string" ? Number(process.env.HOT_DOCS_DEPLOY_PORT) : undefined;
  const identityFromEnv =
    typeof process.env.HOT_DOCS_DEPLOY_IDENTITY === "string" && process.env.HOT_DOCS_DEPLOY_IDENTITY.trim().length > 0;
  const args = {
    host: process.env.HOT_DOCS_DEPLOY_HOST ?? "",
    user: process.env.HOT_DOCS_DEPLOY_USER ?? "",
    port: Number.isFinite(envPort) && envPort ? envPort : 22,
    dest: process.env.HOT_DOCS_DEPLOY_DEST ?? "",
    identity: process.env.HOT_DOCS_DEPLOY_IDENTITY ?? "~/.ssh/hot-docs_deploy",
    identityFromEnv,
    identityExplicit: false,
    build: true
  };

  const rest = [...argv];
  while (rest.length) {
    const t = rest.shift();
    if (!t) break;
    if (t === "--host") args.host = String(rest.shift() ?? "");
    else if (t === "--user") args.user = String(rest.shift() ?? "");
    else if (t === "--port") args.port = Number(rest.shift() ?? 22);
    else if (t === "--dest") args.dest = String(rest.shift() ?? "");
    else if (t === "--identity") {
      args.identity = String(rest.shift() ?? "");
      args.identityExplicit = true;
    }
    else if (t === "--no-build") args.build = false;
    else if (t === "--help" || t === "-h") args.help = true;
    else throw new Error(`未知参数: ${t}`);
  }
  return args;
}

function usage() {
  // eslint-disable-next-line no-console
  console.log(`用法:
  node scripts/deploy.mjs --host <HOST> --user <USER> --dest <DEST> [--port 22] [--identity ~/.ssh/hot-docs_deploy]

环境变量（可选，作为默认值）:
  HOT_DOCS_DEPLOY_HOST / HOT_DOCS_DEPLOY_USER / HOT_DOCS_DEPLOY_PORT / HOT_DOCS_DEPLOY_DEST / HOT_DOCS_DEPLOY_IDENTITY

说明:
  - 默认会执行 pnpm site:build，然后 rsync dist/ 到服务器
  - 可用 --no-build 跳过构建（仅同步已有 dist/）
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
    await fs.access(filePath);
    return true;
  } catch {
    return false;
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

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

if (!args.host) throw new Error("--host 不能为空");
if (!args.user) throw new Error("--user 不能为空");
if (!Number.isFinite(args.port) || args.port < 1) throw new Error("--port 必须是合法端口");
if (!args.dest) throw new Error("--dest 不能为空");

let identity = expandHome(args.identity);
if (!(await exists(identity)) && !args.identityExplicit && !args.identityFromEnv) {
  const fallback = expandHome("~/.ssh/id_ed25519");
  if (await exists(fallback)) identity = fallback;
}
if (!(await exists(identity))) {
  throw new Error(`SSH identity 不存在：${identity}\n请先执行：ssh-keygen -t ed25519 -f ${identity}`);
}

if (args.build) {
  await run("pnpm", ["-s", "site:build"]);
}

const distDir = path.join(process.cwd(), "dist");
if (!(await exists(distDir))) throw new Error("dist/ 不存在，请先运行 pnpm site:build");

const sshArgs = ["-i", identity, "-p", String(args.port), "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new"];
const rsyncArgs = [
  "-az",
  "--delete",
  "--delay-updates",
  "-e",
  ["ssh", ...sshArgs].join(" "),
  `${distDir}${path.sep}`,
  `${args.user}@${args.host}:${args.dest.replace(/\/+$/, "")}/`
];

await run("rsync", rsyncArgs);
