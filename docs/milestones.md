# Hot Docs 里程碑（Roadmap）

> 本文档面向：项目维护者、贡献者。目标是把 `docs/todo.md` 的方向拆成可发布的版本里程碑，并给出每个阶段的“退出标准（验收）”。

## 0. 里程碑约定

- 版本号建议：`0.x` 阶段快速迭代，但仍尽量保持“可迁移”；`1.0` 目标是对外契约稳定（config / theme / plugin）。
- 每个里程碑包含：
  - **范围**：必须做的交付物
  - **不做**：明确延后项，防止范围蔓延
  - **验收**：可验证的退出标准（Definition of Done）

## 1. 当前状态（基线）

当前仓库已具备 M0 的最小闭环（dev 可用）：
- monorepo + TS + CLI（仅 `dev`）
- core：内容扫描（collections + frontmatter）+ docs navTree
- core：Markdown → HTML（GFM + heading slug）
- dev-server：壳 + `/__hot_docs__/page` + `/__hot_docs__/nav`
- dev-server：watch + ws 事件（doc-changed/nav-updated）

## 2. Roadmap（建议版本里程碑）

### v0.1 — Build/Preview 闭环（静态优先落地）

**范围**
- `hot-docs build`：输出 `dist/` 静态产物（建议路由形态：`dist/<route>/index.html`）。
- `hot-docs preview`：本地预览 `dist/`。
- `site.base`：dev/build/preview 行为一致（路由、资源前缀、内部链接）。
- 资源处理：图片/附件等相对路径可用（至少 dev 与 build 一致）。

**不做**
- 完整插件系统、完整主题系统、复杂 Blog taxonomy（留到后续）。

**验收（退出标准）**
- `pnpm dev` 正常；`pnpm build` 生成 `dist/`；`pnpm --filter @hot-docs/cli preview` 可访问。
- 子路径部署验证：`site.base="/docs/"` 时访问路径/资源无 404。
- 任意 `.md` 中的相对图片在 dev 与 build 均可展示。

### v0.2 — Dev DX 与增量更新（可诊断、可扩展的基础）

**范围**
- dev overlay：展示错误（包含文件路径/栈/触发阶段）与最近一次更新耗时。
- 增量更新：从“全量 rescan”优化到“单文件增量更新”，并正确触发 nav/page/search（若有）更新。
- watch 稳定性：跨平台路径规范化与忽略规则完善（.git/node_modules 等）。

**不做**
- 插件 capabilities 全量设计（只做 overlay 与增量的最小接口）。

**验收**
- 编辑当前页面：仅刷新当前页面，不触发全量扫描；可在 overlay 看到本次耗时。
- 人为制造渲染错误（非法 frontmatter / 解析失败）：overlay 可见、且不会让 dev-server 崩溃。

### v0.3 — Theme as Plugin（最小主题契约稳定）

**范围**
- 主题 manifest（`package.json#hotDocs`）与加载规则。
- token 合并顺序与覆盖规则：默认 → theme.css → 用户 tokens 覆盖 → 用户自定义 CSS（若支持）。
- 默认主题（Neon Dark）达到“可作为卖点”的完成度（导航、正文、代码块、表格、链接、focus/hover）。

**不做**
- 复杂组件体系（React/Vue）；优先 token + 模板壳策略。

**验收**
- 更换主题包/主题 CSS 后，站点外观发生预期变化，且不影响路由/构建产物。
- 用户 tokens 覆盖能影响强调色/背景层级等关键变量。

### v0.4 — Plugin Host（capabilities + pipeline 最小可用）

**范围**
- 插件 loader：discovery/validate/load（包插件 + 本地插件）。
- capabilities 与分阶段 pipeline（scan/index/render/routes/client/dev/deploy 取最小子集先落地）。
- 官方参考插件（至少 2 个）：`sitemap`、`feed` 或 `search`（按依赖优先级选择）。
- 插件诊断：插件链顺序可见、错误归因到插件名。

**不做**
- 远程安装、签名/沙箱隔离（后续安全治理）。

**验收**
- 插件能通过配置启用/禁用，且产物/行为发生可验证变化（如生成 sitemap 或 feed）。
- 插件抛错时 overlay 能指明插件名与阶段。

### v0.5 — Blog 信息架构完善（可用的 Blog）

**范围**
- `/blog` 列表分页、文章页路由策略可配置（扁平 vs 日期分层二选一）。
- tags/category/archive 生成（最小可用即可）。
- draft 策略：dev 可见、build 默认排除（可配置）。

**验收**
- build 产物包含 blog 列表与文章页，且 sitemap/feed 与 blog 路由一致。
- `draft: true` 的文章在 build 产物中不可访问。

### v0.6 — 开源工程化（让外部贡献“进得来、跑得通”）

**范围**
- LICENSE、贡献指南、行为准则、issue/PR 模板。
- 版本策略文档：SemVer + `apiVersion` + 迁移指南模板。
- 示例站点与插件/主题开发指南（最小可用）。

**验收**
- 新贡献者按文档 30 分钟内能跑起 dev/build，并理解如何新增一个本地插件/主题。

### v1.0 — 对外契约稳定（可长期维护）

**范围**
- config schema 稳定（含校验与错误信息）。
- theme/plugin 契约稳定（`apiVersion` 机制可用）。
- 关键回归测试覆盖：base/path/route、frontmatter、nav、build 输出结构。

**验收**
- 发布 v1.0 后，官方示例主题/插件在同一大版本内可持续兼容；破坏性变更有明确迁移路径。

