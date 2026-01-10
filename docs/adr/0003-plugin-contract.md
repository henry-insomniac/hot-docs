# ADR-0003：Plugin 契约（最小可用）

状态：Accepted（2026-01-10）

## Context

插件系统是 Hot Docs 的长期差异化能力，但过早设计“万能 API”会导致复杂度暴涨与兼容性不可控。

## Decision

- 插件以独立包形式交付，在 `package.json#hotDocs` 声明：
  - `type = "plugin"`
  - `apiVersion = 1`
  - `entry = <entry path>`
- 0.x 阶段先落地最小能力：
  - Markdown 渲染阶段注入 remark/rehype 扩展
  - build 阶段 hook 可生成额外产物（如 sitemap/feed）
- loader 负责 discovery/validate/load，并在错误信息中包含插件名与阶段

## Consequences

- ✅ 插件可以独立演进与发布
- ✅ 通过官方参考插件倒推契约（sitemap/feed）更可控
- ⚠️ routes/search 等能力后续需要以“最小可用”为原则逐步扩展

