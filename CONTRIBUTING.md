# 贡献指南（Hot Docs）

感谢你对 Hot Docs 的兴趣！本仓库是一个 pnpm + TypeScript 的 monorepo，目标是做一个静态优先、轻运行时、可扩展（theme/plugin）的 Docs + Blog 系统。

## 本地开发

要求：Node.js >= 20，pnpm >= 9

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm typecheck
pnpm test
pnpm site:build
pnpm site:preview
```

## 仓库结构

- `packages/core`：核心能力（配置、扫描、渲染、build、theme/plugin 契约）
- `packages/dev-server`：开发服务器（watch/ws/overlay）
- `packages/cli`：命令行入口（dev/build/preview/init/new）
- `packages/plugin-*`：官方参考插件（sitemap/feed）
- `packages/theme-*`：官方参考主题
- `content/`：示例站点内容（docs/blog/pages）
- `docs/`：产品/架构/里程碑/ADR

## 改动范围建议

- 优先修复“根因”，避免仅打补丁
- dev/build/preview 必须保持 `site.base` 与资源/链接重写一致
- 插件/主题属于对外契约，改动需考虑兼容性（建议补 ADR）

## 新增主题/插件

主题包（Theme）要求在 `package.json#hotDocs` 声明：

```json
{ "hotDocs": { "type": "theme", "apiVersion": "1", "style": "./theme.css" } }
```

插件包（Plugin）要求在 `package.json#hotDocs` 声明：

```json
{ "hotDocs": { "type": "plugin", "apiVersion": "1", "entry": "./dist/index.js" } }
```

## 提交与 PR

- PR 请附带：动机、影响范围、验证方式（截图或命令输出）
- 如果变更涉及对外契约（config/theme/plugin），请在 `docs/adr/` 增加或更新 ADR
- 请确保 `pnpm typecheck` 与 `pnpm test` 通过

