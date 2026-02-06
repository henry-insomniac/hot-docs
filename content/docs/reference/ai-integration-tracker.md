---
title: Hot Docs × Seed Aggregation：AI 接入开发状态跟踪器
summary: 用于落地“强引用 DocQA + 跨语言检索/对照阅读”的状态看板：里程碑进度、任务台账、风险/阻塞、验收记录与发布清单（可直接复制到周会/日报）。
categories: ["AI", "架构", "文档系统"]
tags:
  - hot-docs
  - seed-aggregation
  - doubao
  - doc-qa
  - RAG
  - citations
  - search
  - translation
  - gateway
  - cache
  - observability
  - security
  - tracker
  - project
aliases:
  - AI 接入跟踪器
  - DocQA 状态跟踪
  - RAG Tracker
order: 32
---

# Hot Docs × Seed Aggregation：AI 接入开发状态跟踪器

> 本页面是“可执行的状态看板”。建议每次需求评审/迭代开始时，把《[AI 接入开发计划（v1）](./ai-integration-dev-plan.md)》中的里程碑拆到下面的任务台账，并持续更新状态。

## 1. 基本信息（请按你们团队实际情况填写）

- 项目：Hot Docs × Seed Aggregation（AI 接入）
- 目标：强引用 DocQA + 跨语言检索/对照阅读 + 可治理
- 访问：内网全员
- Seed Aggregation Base URL：`http://101.126.85.14:8082`
- 认证：所有接口必须携带 `X-API-Key`（**不要把真实 key 写入仓库**）
- 前端接入（推荐）：同域反代注入 `X-API-Key`（`/api/` 或 `/seed/`）

### 1.1 状态枚举（统一口径）

- `P0`：必须（阻塞上线）
- `P1`：重要（影响体验/可用性）
- `P2`：优化（可延后）

状态：

- `待办`：未开始
- `进行中`：有人在做
- `评审中`：PR/设计评审中
- `阻塞`：依赖未满足或有故障
- `已完成`：合并/发布完成
- `已取消`：不再做（需写原因）

---

## 2. 里程碑进度（Milestones）

> 这里是“管理层视角”的汇总。每周至少更新一次。

| 里程碑 | 目标 | 计划周期 | 当前状态 | 阻塞点 | 负责人 |
|---|---|---:|---|---|---|
| M0 | 决策与环境准备 | 0.5 天 | 待办 |  | TBD |
| M1 | MVP 跑通（答案+引用） | 1~3 天 | 待办 |  | TBD |
| M2 | v1（体系化强引用） | 1~2 周 | 待办 |  | TBD |
| M3 | v2（语义检索/治理增强） | 迭代 | 待办 |  | TBD |

---

## 3. 任务台账（Backlog Tracker）

> 建议规则：一条任务 = 一个可验收结果；尽量写清“输入/输出/验收标准”。阻塞时必须写“阻塞原因 + 需要谁解决”。

| ID | 任务 | 子系统 | 优先级 | 状态 | 依赖 | 负责人 | 开始 | 截止 | 验收标准（最小） |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | 同域反代 `/api` 或 `/seed` 并注入 `X-API-Key` | Nginx/网关 | P0 | 已完成 |  | TBD |  |  | 前端无需持有 key；无 CORS；接口可用 |
| 2 | 明确是否支持流式输出（v1 默认非流式） | 全局 | P0 | 待办 |  | TBD |  |  | 文档与实现一致；接口契约固定 |
| 3 | Hot Docs：输出 AI 数据包 `dist/ai/manifest.json` | Hot Docs | P0 | 已完成 | heading id 规则 | TBD |  |  | build 后产物存在且可被服务读取 |
| 4 | Hot Docs：输出 `dist/ai/chunks*.json`（H2/H3 分块） | Hot Docs | P0 | 已完成 | 3 | TBD |  |  | chunk 可定位 `routePath+anchor`；字段完整 |
| 5 | Seed：加载 `dist/ai/*`（挂载或 HTTP 拉取） | Seed | P0 | 已完成 | 3/4 | TBD |  |  | 可热更新；失败不破坏旧数据（双缓冲） |
| 6 | Seed：实现 `/api/v1/docqa/ask`（scope+mustCite） | Seed | P0 | 已完成 | 5 | TBD |  |  | 返回 `answer+citations[]+meta`；无 citations 自动降级 |
| 7 | Seed：实现 `/api/v1/docqa/page`（summary/faq/checklist/steps） | Seed | P0 | 已完成 | 5 | TBD |  |  | 对指定页面输出带引用的结果 |
| 8 | Seed：证据选择（去重/多样性/截断） | Seed | P0 | 已完成 | 6 | TBD |  |  | 证据预算稳定；答案引用更聚焦 |
| 9 | Seed：引用校验（citations 可定位） | Seed | P0 | 已完成 | 6/7 | TBD |  |  | citations 无法定位则失败/降级 |
| 10 | Seed：DocQA 缓存（`docqa:{queryHash}:{evidenceHash}:...`） | Seed | P1 | 已完成 | 6/8 | TBD |  |  | 热点问题命中缓存；命中率可观测 |
| 11 | Seed：翻译缓存（补齐批量/TTL 策略） | Seed | P1 | 待办 | translate 已有 | TBD |  |  | 重复翻译明显加速；可观测 |
| 12 | Seed：限流（key/ip/path） | Seed | P0 | 待办 | 6 | TBD |  |  | 被刷时保护模型与网关；返回明确错误码 |
| 13 | Seed：观测（耗时/tokens/命中率/错误码） | Seed | P0 | 待办 | 6 | TBD |  |  | 有指标/日志；可按 request-id 追踪 |
| 14 | Seed：审计日志（不落原文） | Seed | P0 | 待办 | 6 | TBD |  |  | 可追溯引用列表与模型元信息 |
| 15 | Hot Docs：文档页注入 AI 面板（问本文档/总结/翻译） | Hot Docs | P0 | 已完成 | 1/6/7 | TBD |  |  | 页面可用；失败降级；引用可回跳 |
| 16 | Hot Docs：引用渲染组件（quote 折叠、复制链接） | Hot Docs | P0 | 已完成 | 15 | TBD |  |  | 引用可核对；支持复制 |
| 17 | Hot Docs：全站 `Ctrl/⌘+K` 增加“提问”Tab | Hot Docs | P1 | 待办 | 15 | TBD |  |  | 键盘可用；结果可筛选 scope |
| 18 | 跨语言：中文搜英文/英文搜中文召回验证（用例集） | QA | P0 | 待办 | 4/6 | TBD |  |  | 用例 ≥20；Top10 命中率达标（定义阈值） |
| 19 | 注入防护：prompt 约束 + 证据清洗策略 | Seed | P0 | 待办 | 6 | TBD |  |  | 典型注入用例不越权、不泄露 |
| 20 | 发布清单与回滚开关（`ai.enabled`） | 全局 | P0 | 待办 | 15 | TBD |  |  | 一键关 AI；不影响搜索与阅读 |
| 21 | Hot Docs：AI 面板按钮无响应修复（脚本语法错误） | Hot Docs | P0 | 已完成 | 15/16 | TBD |  |  | 点击按钮可触发请求；失败时有错误提示 |

> 说明：你们可以把上表拆成 2 份（Hot Docs / Seed）分别维护；也可以在同一个表里用 “子系统” 聚合。

---

## 4. 阻塞与风险（每次站会必须更新）

| 日期 | 类型 | 描述 | 影响 | 当前状态 | 解决人/协作方 | 预期解除时间 |
|---|---|---|---|---|---|---|
|  | 阻塞 |  |  |  |  |  |
|  | 风险 |  |  |  |  |  |

---

## 5. 验收记录（Acceptance Log）

> 验收要点建议直接引用《AI 接入开发计划（v1）》的“验收标准”条目。

| 日期 | 验收项 | 结果 | 证据链接（页面/日志/截图） | 备注 |
|---|---|---|---|---|
|  | 强引用 DocQA：答案 + citations |  |  |  |
|  | 引用可回跳 + quote 可核对 |  |  |  |
|  | 跨语言检索可用 |  |  |  |
|  | 限流/缓存/观测/审计齐备 |  |  |  |

---

## 6. 发布清单（Release Checklist）

### 6.1 上线前（必须）

- [ ] Nginx 同域反代已生效（前端不持有 `X-API-Key`）
- [ ] `ai.enabled` 可一键关闭（回滚开关）
- [ ] DocQA 返回结构稳定：`answer + citations[] + meta`
- [ ] `mustCite` 校验生效：无证据 → 明确降级输出
- [ ] 限流策略生效（关键接口 P0）
- [ ] 缓存策略生效（至少 translate）
- [ ] 观测与审计：可按 request-id 追踪一次请求全链路

### 6.2 上线后（建议 24h 内）

- [ ] 观察错误码分布与 p95 延迟
- [ ] 观察 tokens 与缓存命中率
- [ ] 收集 Top20 热门问题与误答案例，补充文档或优化召回/证据选择
