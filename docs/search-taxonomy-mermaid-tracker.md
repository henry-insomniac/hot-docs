# 搜索 / 分类 / 流程图解析 开发状态跟踪器

> 创建日期：2026-02-06  
> 对应计划：`/Users/Zhuanz/work-space/hot-docs/docs/search-taxonomy-mermaid-commit-plan.md`  
> 建议分支：`codex/feat-search-taxonomy-mermaid`

---

## 1. 状态规范

### 1.1 任务状态枚举

- `todo`：未开始
- `in_progress`：开发中
- `review`：已提 PR，评审中
- `blocked`：阻塞中
- `done`：已完成并合并

### 1.2 优先级枚举

- `P0`：阻塞主目标
- `P1`：核心能力
- `P2`：体验优化

---

## 2. 总体里程碑看板

| 里程碑 | 范围 | 优先级 | 状态 | 进度 | 负责人 | 备注 |
|---|---|---|---|---:|---|---|
| M1 搜索增强 | section 索引、排序、facet、锚点跳转 | P0 | todo | 0% | TBD | 对应 C01-C04 |
| M2 分类导航 | taxonomy 插件、分类聚合页 | P1 | todo | 0% | TBD | 对应 C05-C07 |
| M3 流程图解析 | mermaid 插件、渲染与回退 | P1 | todo | 0% | TBD | 对应 C08-C10 |
| M4 收口交付 | 配置接入、文档、回归 | P0 | todo | 0% | TBD | 对应 C11-C12 |

---

## 3. Commit 级跟踪表（主表）

| ID | Commit Message | 优先级 | 状态 | 分支 | PR | 开始时间 | 完成时间 | 风险/备注 |
|---|---|---|---|---|---|---|---|---|
| C00 | docs(plan): add commit-level implementation plan and tracker | P0 | done | - | - | 2026-02-06 | 2026-02-06 | 已创建计划与跟踪器 |
| C01 | feat(search): add section-level index model | P0 | todo |  |  |  |  |  |
| C02 | feat(search): improve ranking and facet filtering | P0 | todo |  |  |  |  |  |
| C03 | feat(search): render anchor hits with snippet highlight | P1 | todo |  |  |  |  |  |
| C04 | test(search): cover section recall and ranking behavior | P0 | todo |  |  |  |  |  |
| C05 | feat(taxonomy): scaffold plugin package and manifest | P1 | todo |  |  |  |  |  |
| C06 | feat(taxonomy): generate category virtual pages for docs/blog | P1 | todo |  |  |  |  |  |
| C07 | test(taxonomy): cover category routes and page output | P1 | todo |  |  |  |  |  |
| C08 | feat(mermaid): scaffold plugin and transform mermaid code blocks | P1 | todo |  |  |  |  |  |
| C09 | feat(mermaid): add runtime render script with safe fallback | P1 | todo |  |  |  |  |  |
| C10 | test(mermaid): cover transform output and fallback behavior | P1 | todo |  |  |  |  |  |
| C11 | chore(config): wire plugins and update reference docs | P0 | todo |  |  |  |  |  |
| C12 | chore(release): final regression for search taxonomy mermaid | P0 | todo |  |  |  |  |  |

---

## 4. 验收检查清单（DoD）

## 4.1 搜索能力

- [ ] 能按小节命中（非仅文档级）
- [ ] 排序优先级符合预期（标题、标签优先）
- [ ] 支持 facet 筛选（collection/categories/tags）
- [ ] 结果支持锚点跳转与高亮片段

## 4.2 分类能力

- [ ] 存在 `/categories/`
- [ ] 存在 `/categories/<slug>/`
- [ ] docs + blog 均可参与分类聚合

## 4.3 流程图解析

- [ ] Mermaid fenced code block 能渲染
- [ ] 渲染失败可回退显示代码
- [ ] dev/build/preview 行为一致

## 4.4 工程质量

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm site:build` 通过

---

## 5. 风险与阻塞记录

| 日期 | 模块 | 级别 | 描述 | 影响 | 处理人 | 处理状态 |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

---

## 6. 每日更新日志模板

### YYYY-MM-DD HH:mm

- 今日完成：
- 当前进行中：
- 阻塞项：
- 下一步（按 commit ID）：

---

## 7. 使用说明（执行建议）

- 每完成一个 commit，先更新本跟踪器，再进入下一个 commit。
- 若 commit 拆分，新增行使用 `C06a/C06b` 命名并在备注写明原因。
- 任何 `blocked` 状态必须在“风险与阻塞记录”中补充处理动作。

