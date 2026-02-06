# 搜索 / 分类 / 流程图解析 开发任务拆解（按 Commit 粒度）

> 版本：v1  
> 创建日期：2026-02-06  
> 适用仓库：`/Users/Zhuanz/work-space/hot-docs`

## 0. 开工前准备（一次性）

- 创建功能分支：`codex/feat-search-taxonomy-mermaid`
- 建议先跑一次基线：
  - `pnpm install`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm site:build`
- 目标：确认基线通过后，再按下述 commit 顺序推进。

---

## 1. Commit 计划总览

| ID | 建议 Commit Message | 目标 |
|---|---|---|
| C00 | `docs(plan): add commit-level implementation plan and tracker` | 落地计划与跟踪器文档 |
| C01 | `feat(search): add section-level index model` | 搜索索引升级为“文档 + 小节”粒度 |
| C02 | `feat(search): improve ranking and facet filtering` | 提升相关性排序与筛选 |
| C03 | `feat(search): render anchor hits with snippet highlight` | 搜索结果支持锚点跳转与片段高亮 |
| C04 | `test(search): cover section recall and ranking behavior` | 搜索关键行为测试补齐 |
| C05 | `feat(taxonomy): scaffold plugin package and manifest` | 新增分类插件骨架 |
| C06 | `feat(taxonomy): generate category virtual pages for docs/blog` | 生成全站分类聚合页 |
| C07 | `test(taxonomy): cover category routes and page output` | 分类插件测试补齐 |
| C08 | `feat(mermaid): scaffold plugin and transform mermaid code blocks` | 新增 Mermaid 解析插件 |
| C09 | `feat(mermaid): add runtime render script with safe fallback` | 前端渲染流程图并支持失败回退 |
| C10 | `test(mermaid): cover transform output and fallback behavior` | 流程图解析测试补齐 |
| C11 | `chore(config): wire plugins and update reference docs` | 配置接入与文档更新 |
| C12 | `chore(release): final regression for search taxonomy mermaid` | 收口回归与交付检查 |

---

## 2. 逐 Commit 可执行清单

## C00

### 目标
- 新增本计划文档与状态跟踪器文档。

### 文件范围
- `docs/search-taxonomy-mermaid-commit-plan.md`
- `docs/search-taxonomy-mermaid-tracker.md`

### 验收
- 文档存在且可直接用于执行和跟踪。

---

## C01

### 目标
- 在 `plugin-search` 中引入“小节级索引模型”，每篇文档可拆分成多个可检索单元。

### 文件范围
- `packages/plugin-search/src/index.ts`

### 关键改动
- 扩展索引结构：保留文档级字段，并新增 section 级字段（如 `anchor`、`sectionTitle`、`sectionText`）。
- 从 Markdown 解析标题结构，构造 section 索引条目。
- 兼容原有 `search-index.json` 输出格式，新增 `version` 升级字段（例如 `version: 2`）。

### 验收
- `pnpm site:build` 后 `dist/search-index.json` 可看到 section 粒度数据。
- 不破坏原有页面构建流程。

---

## C02

### 目标
- 增强搜索排序与筛选能力，提升“大文档量”下的前排命中质量。

### 文件范围
- `packages/plugin-search/src/index.ts`

### 关键改动
- 排序加权明确化：`title > aliases > tags/categories > headings > summary > body`。
- Facet 筛选继续支持并优化：`collection`、`categories`、`tags`。
- 在 section 命中时提高有锚点结果权重。

### 验收
- 同一关键词下，标题或标签精确命中应优先于正文弱命中。
- Facet 筛选后结果稳定收敛。

---

## C03

### 目标
- 搜索结果支持锚点跳转与高亮片段，减少用户二次定位成本。

### 文件范围
- `packages/plugin-search/src/index.ts`

### 关键改动
- 结果 URL 支持 `routePath + #anchor`。
- 渲染摘要片段时做命中高亮。
- 保证无锚点结果仍可兼容显示。

### 验收
- 点击结果可直接跳到目标文档小节。
- 高亮逻辑对中英文关键词均可用。

---

## C04

### 目标
- 为搜索增强能力补齐回归测试。

### 文件范围
- `tests/plugin-search.test.mjs`（扩展）
- 必要时新增 `tests/plugin-search-ranking.test.mjs`

### 测试点
- section 索引生成是否正确。
- 排序优先级是否符合预期。
- facet 过滤是否生效。
- 锚点链接是否正确拼接。

### 验收
- `pnpm test` 全通过。

---

## C05

### 目标
- 新增分类插件包骨架（建议命名：`@hot-docs/plugin-taxonomy`）。

### 文件范围
- `packages/plugin-taxonomy/package.json`
- `packages/plugin-taxonomy/src/index.ts`
- `packages/plugin-taxonomy/tsconfig.json`
- 根 `package.json`（workspace devDependencies 视需要接入）

### 关键改动
- manifest 声明 `type=plugin`、`apiVersion=1`、`entry`。
- 导出最小插件对象与 options 类型。

### 验收
- 插件可被 loader 正常发现与加载（空实现可通过）。

---

## C06

### 目标
- 分类插件生成全站分类虚拟页（docs + blog）。

### 文件范围
- `packages/plugin-taxonomy/src/index.ts`

### 关键改动
- 根据 `ContentIndex` 聚合 categories。
- 输出虚拟路由：
  - `/categories/`
  - `/categories/<category>/`
- 支持配置参与集合（默认 docs + blog）。
- 与真实 Markdown 路由冲突时遵循现有“真实页优先”策略。

### 验收
- `pnpm site:build` 后可访问分类页。
- 分类页中文档条目链接正确。

---

## C07

### 目标
- 分类插件行为测试补齐。

### 文件范围
- 新增 `tests/plugin-taxonomy.test.mjs`

### 测试点
- 分类页路由生成是否正确。
- 条目聚合是否正确（含重复分类去重）。
- route 冲突策略是否符合预期。

### 验收
- `pnpm test` 全通过。

---

## C08

### 目标
- 新增 Mermaid 插件骨架与 Markdown 转换逻辑。

### 文件范围
- `packages/plugin-mermaid/package.json`
- `packages/plugin-mermaid/src/index.ts`
- `packages/plugin-mermaid/tsconfig.json`

### 关键改动
- 识别 fenced code block 中的 `mermaid` 语言块。
- 转换为渲染容器节点（例如 `<div class="hd-mermaid" data-code="...">`）。
- 保留原始代码用于失败回退。

### 验收
- build 后 HTML 中出现可识别的 mermaid 容器结构。

---

## C09

### 目标
- 接入 Mermaid 前端渲染脚本，并具备安全回退。

### 文件范围
- `packages/plugin-mermaid/src/index.ts`

### 关键改动
- 注入客户端脚本：页面加载后扫描 `hd-mermaid` 容器并渲染。
- 渲染失败时回退显示原始代码块文本。
- 兼容 dev 模式动态换页（重复渲染时去重处理）。

### 验收
- dev/build/preview 三模式均能渲染流程图。
- 无法解析时页面不白屏，能看到原始代码。

---

## C10

### 目标
- Mermaid 插件测试补齐。

### 文件范围
- 新增 `tests/plugin-mermaid.test.mjs`

### 测试点
- `mermaid` 代码块是否被正确转换。
- 非 `mermaid` 代码块不受影响。
- 失败回退结构是否存在。

### 验收
- `pnpm test` 全通过。

---

## C11

### 目标
- 配置接入新插件并更新项目文档。

### 文件范围
- `hot-docs.config.json`
- `content/docs/reference/plugins.md`
- 可选：`content/docs/index.md` 增加入口链接

### 关键改动
- 在 `plugins` 中接入：
  - `@hot-docs/plugin-taxonomy`
  - `@hot-docs/plugin-mermaid`
- 文档补充插件使用说明与示例。

### 验收
- 本地 `pnpm dev` 能直接看到新增能力入口。

---

## C12

### 目标
- 最终回归验证与交付收口。

### 文件范围
- 如无代码问题，可只更新跟踪器状态与必要说明文档。

### 必做命令
- `pnpm typecheck`
- `pnpm test`
- `pnpm site:build`

### 验收
- 三条命令全通过。
- 功能可演示：搜索、分类、流程图解析均可用。

---

## 3. 提交节奏建议

- 每个 commit 只做一个逻辑目标，避免大杂烩提交。
- 每完成一个 commit，立即更新跟踪器状态。
- 若某 commit 超过 2 小时仍未完成，拆分为子 commit（例如 `C06a/C06b`）并写入跟踪器备注。

---

## 4. 最终交付定义（DoD）

- 搜索：
  - 支持 section 粒度命中
  - 支持 facet 筛选
  - 结果可锚点跳转且片段高亮
- 分类：
  - 存在 `/categories/` 与 `/categories/<slug>/`
  - 可覆盖 docs + blog 内容
- 流程图：
  - Mermaid 代码块可渲染
  - 失败可回退
- 工程质量：
  - `typecheck/test/build` 全通过
  - 跟踪器状态完整可审计

