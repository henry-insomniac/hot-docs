# ADR-0001：静态优先产物策略（Static-first）

状态：Accepted（2026-01-10）

## Context

Hot Docs 的核心定位是“静态优先、轻运行时”。在 0.x 阶段，如果产物形态不稳定，将会在 `site.base`、路由策略、资源重写、preview/部署等方面产生大量返工成本。

## Decision

- 默认产物为纯静态站点 `dist/`
- 路由输出采用 `dist/<route>/index.html`（根路由输出 `dist/index.html`）
- 资源（非 Markdown）按集合 `routeBase + 相对路径` 拷贝到 `dist/`，并在渲染阶段统一重写链接/图片/附件 URL
- `site.base` 作为“部署前缀”，在 dev/build/preview 保持一致行为

## Consequences

- ✅ 部署环境不挑（任意静态服务器即可）
- ✅ SEO 与可缓存性更好
- ✅ 约束了后续 SSR/adapter 的演进路径（作为可选扩展，而不是默认）

