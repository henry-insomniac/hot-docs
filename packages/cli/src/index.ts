#!/usr/bin/env node
import { startDevServer } from "@hot-docs/dev-server";

type Args = {
  command?: string;
  config?: string;
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

说明:
  - 默认读取 hot-docs.config.(json|mjs|js|cjs)，否则使用内置默认配置
`);
}

const args = parseArgs(process.argv.slice(2));

if (!args.command || args.command === "help") {
  printHelp();
  process.exit(0);
}

if (args.command === "dev") {
  await startDevServer({ configPath: args.config });
} else {
  // eslint-disable-next-line no-console
  console.error(`未知命令: ${args.command}`);
  printHelp();
  process.exit(1);
}
