# Hot Docs 发布流程（v1.0 起）

> 目标：把“版本号、变更日志、Tag、发包”形成可重复的操作流程，避免每次发布临时决定导致不一致。

## 0. 约定

- **主分支**：所有发布都基于 `main`。
- **Tag 规则**：使用 `v<semver>`（例如 `v1.0.0`）。
- **变更日志**：使用仓库根目录 `CHANGELOG.md`。
- **版本策略**：参考 `docs/versioning.md`（SemVer + `apiVersion`）。

## 1. 发布前检查（必做）

在 `main` 上确保工作区干净：

```bash
git checkout main
git pull
git status
```

本地回归：

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm site:build
pnpm -r build
```

## 2. 确定版本号与范围

1. 确定本次发布版本（例如 `1.0.0`）。
2. 明确要发布的包：
   - `@hot-docs/core`
   - `@hot-docs/dev-server`
   - `@hot-docs/cli`
   - `@hot-docs/plugin-sitemap`
   - `@hot-docs/plugin-feed`
   - `@hot-docs/theme-neon-dark` 当前为 `private: true`（不发布到 npm）

## 3. 更新版本号与变更日志

### 3.1 版本号

本仓库采用“workspace 协议依赖”（`workspace:*`），发布时会由 pnpm 替换为真实版本号。

更新版本号的最小做法（固定版本，建议 v1.0 起保持一致）：
- 修改 `packages/*/package.json` 中的 `version`
- 如涉及对外行为变更，更新 `docs/versioning.md` 与对应 ADR/文档

### 3.2 变更日志（CHANGELOG）

在 `CHANGELOG.md` 的 `Unreleased` 下整理本次发布内容，按模块分组：
- core
- dev-server
- cli
- plugins

## 4. 打 Tag 与推送

```bash
git add -A
git commit -m "chore(release): v1.0.0"
git tag v1.0.0
git push origin main --tags
```

## 5. 发包（npm）

前置条件：
- 已登录 npm（`npm login`）或在 CI 中配置 token
- `@hot-docs/*` 为 scope 包，通常需要 `--access public`

发布（会跳过 `private: true` 的包）：

```bash
pnpm -r publish --access public
```

如果只想发布部分包：

```bash
pnpm --filter @hot-docs/core publish --access public
pnpm --filter @hot-docs/dev-server publish --access public
pnpm --filter @hot-docs/cli publish --access public
pnpm --filter @hot-docs/plugin-sitemap publish --access public
pnpm --filter @hot-docs/plugin-feed publish --access public
```

## 6. GitHub Release

在 GitHub 上基于 `v1.0.0` 创建 Release，正文直接复用 `CHANGELOG.md` 中对应版本的内容。

## 7. 发布后校验

- `npm view @hot-docs/core version` 等确认版本已生效
- 新建空目录按文档快速跑通：`pnpm install && pnpm dev && pnpm site:build`
- 如有 breaking change，补充迁移指南（见 `docs/versioning.md` 的模板）

