# Hot Docs 开发计划（执行版）

> 本文档面向：项目维护者/核心开发者。它是“可执行”的计划：以可交付产物为中心，定义优先级、依赖关系、验收标准与风险控制。  
> 配套文档：`docs/product-positioning.md`（方向与边界）、`docs/milestones.md`（版本里程碑）。

## 执行进度（MVP：v0.1）

> 最近更新：2026-01-10

- [x] `hot-docs build`：输出 `dist/` 预渲染 HTML（`dist/<route>/index.html`）
- [x] `hot-docs preview`：可在本地预览 `dist/`（含 `site.base` 子路径）
- [x] Core：统一 `withBase/stripBase` + URL/路径规范化工具
- [x] Core：Markdown 渲染去除 frontmatter，重写链接/图片（md→route、相对资源→站内绝对 URL）
- [x] DevServer：支持从 `contentDir` 提供静态资源（图片/附件）访问
- [x] Build：拷贝非 Markdown 资源并确保 dev/build 引用一致
- [x] MVP 验收：`pnpm typecheck` 通过；`site.base` 子路径用例可访问
- [x] 根脚本可用：`pnpm dev` / `pnpm site:build` / `pnpm site:preview`

## 0. 计划约束与假设

### 0.1 约束
- **静态优先**：默认产物为 `dist/` 纯静态站点，SSR/Server 作为可选 adapter。
- **轻运行时**：尽量把 Markdown 渲染、索引构建、路由生成放在构建期；运行时只保留最小增强。
- **契约治理优先**：对外稳定的是 config/types/hooks，而不是内部实现细节。
- **dev/build/preview 一致**：`site.base`、路由策略、资源路径与内部链接重写必须一致（这是早期最大风险源）。

### 0.2 资源假设（用于估算）
- 以 **1~2 名工程师**为基准给出节奏建议；若人力增加，可并行推进主题与插件示例。
- 若需要更精确的排期，需要补充：目标发布时间、团队人数、是否必须支持 Windows、是否必须支持 i18n。

## 1. 当前实现基线（截至当前仓库）

已完成 M0（dev 最小闭环），核心能力包含：
- core：配置加载（json/js）、内容扫描（collections + frontmatter）、docs navTree、Markdown→HTML（unified）。
- dev-server：HTTP 壳 + page/nav endpoints + chokidar watch + ws 推送。
- cli：仅 `dev` 命令入口。

不足与技术债（短期必须补）
- 缺少 `build/preview`，无法形成“可部署产物闭环”。
- `site.base` 在 dev/build 的一致性尚未系统化验证（后续容易踩坑）。
- dev 更新策略仍偏全量 rescan，缺少 overlay 与可观测性。

## 2. 总体交付路径（从能跑到能用再到可扩展）

推荐路线（严格按依赖顺序）：
1) **Build/Preview**（让产品可部署、可被真实使用）  
2) **Dev DX + 增量更新**（让系统可诊断、可优化、可扩展）  
3) **Theme 最小契约**（让默认主题与定制路径清晰）  
4) **Plugin Host 最小可用**（让生态“能长出来”）  
5) **Blog 完整度**（让 Docs + Blog 成为真实产品）  
6) **开源工程化 + v1.0 契约稳定**（让外部贡献可持续）

## 3. 工作分解（按模块与交付物）

### 3.1 Core（@hot-docs/core）

**目标**：把“内容 → 索引 → 路由 → 渲染”的核心能力沉到 core，减少 dev/build 的分叉逻辑。

**近期任务（为 v0.1/v0.2 服务）**
- 路由与 base 统一工具：`withBase/stripBase`、route join/normalize、资源 URL 重写策略。
- 资源解析：相对路径（以 md 文件所在目录为基准）→ dev 读取/ build 拷贝/重写。
- PageData 最小模型：title/description/toc/prev-next（先做最小字段，避免过度设计）。
- 配置校验：对 `collections`、`site.base` 做最小校验并给出可读错误信息。

**验收**
- 同一套路径/路由工具在 dev 与 build 复用，避免“各写一份”导致不一致。

### 3.2 Dev Server（@hot-docs/dev-server）

**目标**：让 dev 成为“可诊断的系统”，并为插件系统预留最小 hook。

**任务**
- overlay（v0.2）：错误归因（文件/阶段/栈）、耗时（scan/render/nav）可视化。
- 增量更新（v0.2）：单文件变更 → 更新对应 entry/page；必要时更新 nav（新增/删除/影响 order）。
- WS 协议版本化与事件收敛：只保留稳定字段，避免后续兼容问题。

**验收**
- 单文件改动不触发全量 rescan（除非 fallback）；overlay 能说明本次行为与耗时。

### 3.3 CLI（@hot-docs/cli）

**目标**：对外体验统一入口，降低上手门槛。

**任务**
- v0.1：新增 `build`、`preview` 命令。
- v0.3+：新增 `init`（生成最小站点骨架）、`new doc/post`（模板生成）。

**验收**
- 新用户仅需 `pnpm install && pnpm dev`/`pnpm build` 即可完成完整闭环（后续再引导 init）。

### 3.4 Build Adapter（建议新增包或在 core 内实现）

**目标**：实现静态产物生成（这是产品可用性的分水岭）。

**任务（v0.1）**
- 扫描 → 索引 → 路由 → 预渲染 HTML 输出 `dist/`。
- 产物结构：推荐 `dist/<route>/index.html`（含根路由 `/`）。
- 资源拷贝：图片/附件进入 `dist/assets/...` 或就地结构，并完成引用重写。
- `site.base`：生成 `<base>` 或运行时 base 注入策略统一（与 dev 统一）。

**验收**
- 产物可在任意静态服务器下访问（含子路径部署）。

### 3.5 Theme（默认主题 + Theme as Plugin）

**目标**：把主题从“内联 CSS”演进到“可替换、可覆盖、可治理”。

**任务（v0.3）**
- theme manifest（`package.json#hotDocs`）与加载机制。
- token 合并：默认 token + theme token + 用户覆盖。
- 默认主题完成度：布局、导航、正文、代码块、表格、链接、focus/hover。

**验收**
- 主题替换不影响构建与路由；用户 token 覆盖能改变关键视觉变量。

### 3.6 Plugin Host（Ecosystem）

**目标**：先小后大，建立最小可用的插件装载与管线，配套参考实现。

**任务（v0.4）**
- loader：包插件 + 本地插件，manifest 校验（type/apiVersion/entry/capabilities）。
- pipeline：至少覆盖 render/routes（再逐步扩展 scan/index/dev）。
- 官方参考插件：优先 `sitemap`、`feed`（依赖最少，验收清晰）；搜索可作为后续增强。

**验收**
- 插件启用/禁用导致产物或行为发生可验证变化；错误可归因到插件。

### 3.7 Blog（信息架构完善）

**目标**：让 Blog 达到“可真实使用”的最小可用程度。

**任务（v0.5）**
- list/pagination、tags/category/archive 路由生成。
- draft 策略：dev 可见、build 默认排除（可配置）。

**验收**
- build 产物包含 Blog 完整链路：列表 → 文章 → taxonomy 页面；sitemap/feed 同步正确。

### 3.8 质量与工程化（贯穿）

**目标**：在快速迭代中保持稳定与可回归。

**最低要求（建议从 v0.1 开始）**
- `pnpm typecheck` 作为发布前门禁。
- 引入最小回归测试（建议 Node 内置 `node:test`）：覆盖 base/path/route、nav 构建、draft 过滤、build 输出路径规则。
- 记录关键 ADR（框架选择、产物策略、插件契约）以减少反复讨论成本。

## 4. 发布节奏建议（按 1~2 人团队）

> 下面是“范围优先级”驱动的节奏建议，不是硬承诺。实际应根据每个里程碑验收完成度决定是否发布。

- 第 1~2 周：v0.1（build/preview + base/资源最小闭环）
- 第 3 周：v0.2（overlay + 增量更新 + watch 稳定性）
- 第 4~5 周：v0.3（theme manifest + token 合并 + 默认主题完善）
- 第 6~7 周：v0.4（plugin host 最小可用 + 2 个参考插件）
- 第 8 周：v0.5（blog taxonomy/pagination + draft 策略完善）
- 随后：v0.6（开源工程化），准备 v1.0（契约稳定）

## 5. 风险清单与控制策略

- **base/路由/资源重写不一致**：优先沉到 core，配套回归测试覆盖子路径部署。
- **增量更新复杂度过高**：先实现“单文件增量 + fallback 全量”，并把 fallback 明确可见（overlay）。
- **插件 API 过度设计**：先以官方参考插件倒推最小接口；先覆盖 render/routes 两个阶段。
- **Windows/watch 差异**：尽早引入路径规范化与 ignore 策略；避免直接使用平台相关分隔符判断。

## 6. 开放问题（需要尽早决策）

- build 输出策略：全量预渲染 HTML（默认） vs 输出 JSON/AST（可选）如何共存？
- 主题交付形态：纯 CSS + 模板壳 vs 引入框架组件（作为可选 runtime adapter）？
- 搜索方案：构建期索引 + 轻量查询库（minisearch/flexsearch）与 i18n/分词策略如何规划？
- 插件安全边界：是否计划远程安装、签名、白名单或沙箱隔离？（短期先本地可信）
