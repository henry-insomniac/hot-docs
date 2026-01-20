import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

function parseArgs(argv) {
  const envPort = typeof process.env.HOT_DOCS_DEPLOY_PORT === "string" ? Number(process.env.HOT_DOCS_DEPLOY_PORT) : undefined;
  const args = {
    host: process.env.HOT_DOCS_DEPLOY_HOST ?? "",
    user: process.env.HOT_DOCS_DEPLOY_USER ?? "",
    port: Number.isFinite(envPort) && envPort ? envPort : 22,
    dest: process.env.HOT_DOCS_DEPLOY_DEST ?? "",
    identity: process.env.HOT_DOCS_DEPLOY_IDENTITY ?? "~/.ssh/id_ed25519"
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
    else if (t === "--help" || t === "-h") args.help = true;
    else throw new Error(`未知参数: ${t}`);
  }
  return args;
}

function usage() {
  // eslint-disable-next-line no-console
  console.log(`用法:
  node scripts/server-setup.mjs --host <HOST> --user <USER> --dest <DEST> [--port 22] [--identity ~/.ssh/id_ed25519]

环境变量（可选，作为默认值）:
  HOT_DOCS_DEPLOY_HOST / HOT_DOCS_DEPLOY_USER / HOT_DOCS_DEPLOY_PORT / HOT_DOCS_DEPLOY_DEST / HOT_DOCS_DEPLOY_IDENTITY

说明:
  - 在服务器上安装并配置 nginx（监听 80）
  - root 指向 --dest
  - 仅做静态站点托管（try_files $uri $uri/ =404）
`);
}

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function exists(p) {
  try {
    await fs.access(p);
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

function runWithStdin(cmd, args, stdinText) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "inherit", "inherit"] });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} 退出码 ${code}`));
    });
    child.on("error", reject);
    child.stdin.end(stdinText);
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

const identity = expandHome(args.identity);
const pubKeyPath = `${identity}.pub`;
if (!(await exists(identity)) || !(await exists(pubKeyPath))) {
  throw new Error(`SSH key 不存在：${identity} / ${pubKeyPath}\n请先执行：ssh-keygen -t ed25519 -f ${identity}`);
}

async function canSshWithKey() {
  const testArgs = [
    "-i",
    identity,
    "-p",
    String(args.port),
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${args.user}@${args.host}`,
    "true"
  ];
  try {
    await run("ssh", testArgs);
    return true;
  } catch {
    return false;
  }
}

async function installKeyByPassword() {
  const pub = (await fs.readFile(pubKeyPath, "utf8")).trim();
  if (!pub) throw new Error(`公钥为空：${pubKeyPath}`);

  // eslint-disable-next-line no-console
  console.log("[hot-docs] 服务器未安装该 SSH key，准备写入 ~/.ssh/authorized_keys（将提示输入服务器密码，仅此一次）...");

  // 这里不要 BatchMode，让 ssh 走交互式密码输入（密码不会出现在命令或日志里）
  const sshArgs = [
    "-p",
    String(args.port),
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${args.user}@${args.host}`,
    "bash",
    "-c",
    'set -euo pipefail; HOME_DIR="${HOME:-/root}"; mkdir -p "$HOME_DIR/.ssh"; chmod 700 "$HOME_DIR/.ssh"; cat >> "$HOME_DIR/.ssh/authorized_keys"; chmod 600 "$HOME_DIR/.ssh/authorized_keys"'
  ];

  await runWithStdin("ssh", sshArgs, `${pub}\n`);
}

if (!(await canSshWithKey())) {
  await installKeyByPassword();
  if (!(await canSshWithKey())) {
    throw new Error(
      `仍无法通过 SSH Key 登录：${args.user}@${args.host}\n` +
        `请确认服务器允许公钥登录（PubkeyAuthentication）且未禁用 AuthorizedKeysFile。`
    );
  }
}

const remoteScript = String.raw`
set -euo pipefail

DEST=${JSON.stringify(args.dest)}
HOST=${JSON.stringify(args.host)}

install_nginx() {
  if command -v nginx >/dev/null 2>&1; then
    return
  fi
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y nginx
    return
  fi
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx
    return
  fi
  if command -v yum >/dev/null 2>&1; then
    yum install -y epel-release || true
    yum install -y nginx
    return
  fi
  echo "无法自动安装 nginx：未识别包管理器" >&2
  exit 1
}

enable_nginx() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now nginx || systemctl restart nginx
  else
    service nginx start || service nginx restart
  fi
}

install_nginx
mkdir -p "$DEST"

# 如果已有一个“IP -> 6875”的反代配置，会抢占 http://IP/，这里自动禁用它
if [ -L /etc/nginx/sites-enabled/proxy6875 ] || [ -f /etc/nginx/sites-enabled/proxy6875 ]; then
  if grep -q "server_name[[:space:]]\\+$HOST" /etc/nginx/sites-enabled/proxy6875 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/proxy6875
  fi
fi

CONF_DIR=""
if [ -d /etc/nginx/conf.d ]; then
  CONF_DIR="/etc/nginx/conf.d"
elif [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
  CONF_DIR="/etc/nginx/sites-available"
else
  echo "找不到 nginx 配置目录" >&2
  exit 1
fi

CONF_PATH=""
if [ "$CONF_DIR" = "/etc/nginx/conf.d" ]; then
  CONF_PATH="$CONF_DIR/hot-docs.conf"
  cat >"$CONF_PATH" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $HOST;
  root $DEST;
  index index.html;
  location / {
    try_files \$uri \$uri/ =404;
  }
}
EOF
else
  CONF_PATH="$CONF_DIR/hot-docs.conf"
  cat >"$CONF_PATH" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $HOST;
  root $DEST;
  index index.html;
  location / {
    try_files \$uri \$uri/ =404;
  }
}
EOF
  ln -sf "$CONF_PATH" /etc/nginx/sites-enabled/hot-docs.conf
fi

nginx -t
enable_nginx
echo "nginx ready: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo ${JSON.stringify(args.host)})/"
`;

const sshArgs = [
  "-i",
  identity,
  "-p",
  String(args.port),
  "-o",
  "StrictHostKeyChecking=accept-new",
  "-o",
  "BatchMode=yes",
  `${args.user}@${args.host}`,
  "bash",
  "-c",
  remoteScript
];

await run("ssh", sshArgs);
