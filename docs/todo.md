# Hot Docs 实现 TODO（按架构分层）

> 目标：把 `docs/architecture.md` 中的分层与数据流落成可跑的最小系统（先 dev，再 build），并逐步开放主题/插件生态。

## M0：Dev 可用（最小闭环）
- [x] 工程骨架：monorepo + TS + CLI 包
- [x] Core：内容扫描（collections）+ frontmatter + docs navTree
- [x] Core：Markdown → HTML（GFM + heading slug）
- [x] DevServer：HTTP 壳 + `/__hot_docs__/page` + `/__hot_docs__/nav`
- [x] DevServer：watch + ws 事件（doc-changed/nav-updated）
- [ ] Dev 体验：overlay 面板（错误/耗时/插件链）真正落地（目前仅 console）
- [ ] 增量更新：从“全量 rescan”优化到“单文件增量更新”（含 nav/search 影响分析）

## M1：Build（静态产物）
- [ ] Build adapter：扫描 → 索引 → 路由 → 预渲染 HTML 输出 `dist/`
- [ ] `site.base` 子路径构建与资源前缀（与 dev 行为一致）
- [ ] `preview`：本地预览 `dist/`
- [ ] 产物：`sitemap.xml`（插件或内置）
- [ ] 产物：feed（RSS/Atom/JSON Feed，插件）
- [ ] 草稿策略：`draft: true` build 默认排除（可配置）

## M2：主题系统（Theme as Plugin）
- [ ] 主题 manifest 规范（`package.json#hotDocs`）
- [ ] token 合并：默认主题 → theme.css → 用户覆盖
- [ ] 主题布局模板：Docs（sidebar/main/toc），Blog（index/post/taxonomy）
- [ ] 默认主题（Neon Dark）细节完善：卡片层级、hover、高亮、代码块、表格、图表配色

## M3：插件系统（Ecosystem）
- [ ] 插件 loader：discovery/validate/load（包插件 + 本地插件）
- [ ] capabilities 与分阶段 pipeline（scan/index/render/routes/client/dev/deploy）
- [ ] 插件诊断：耗时、错误归因、顺序可视化
- [ ] 示例插件：search / feed / sitemap / deploy（headers/redirects）

## M4：Blog 信息架构完善
- [ ] 列表页分页
- [ ] tag/category/archive 路由生成
- [ ] 文章 slug 策略可配置（扁平 vs 日期分层）
- [ ] 文章摘要与封面图（frontmatter）渲染与样式

## M5：开源工程化
- [ ] LICENSE（MIT/Apache-2.0 二选一）
- [ ] CONTRIBUTING/CODE_OF_CONDUCT/issue&PR 模板
- [ ] 版本策略：SemVer + 插件 `apiVersion` 兼容策略与迁移指南模板

