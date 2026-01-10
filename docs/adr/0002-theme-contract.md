# ADR-0002：Theme 契约（Theme as Plugin）

状态：Accepted（2026-01-10）

## Context

主题需要做到“可替换、可覆盖、可治理”。早期如果主题和渲染壳耦合过深，会导致后续扩展（多主题、用户 token 覆盖、主题包分发）难以维护。

## Decision

- 主题以独立包形式交付，在 `package.json#hotDocs` 声明：
  - `type = "theme"`
  - `apiVersion = 1`
  - `style = <css path>`
- CSS 变量作为“稳定扩展点”，token 覆盖生成 `:root{--hd-...}`
- theme 加载顺序：默认主题 → theme.css → 用户 tokens 覆盖

## Consequences

- ✅ 主题替换不影响路由与 build 产物
- ✅ token 覆盖成本低，适合长期维护
- ⚠️ 默认主题仍需持续打磨（可用性与审美需要迭代）

