---
title: Hot Docs × Seed Aggregation：AI 接入开发计划（v1）
summary: 以“强引用 DocQA + 跨语言检索/对照阅读”为目标的端到端开发计划：里程碑、任务拆分、验收标准、风险与回滚策略。
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
  - roadmap
aliases:
  - AI 接入开发计划
  - DocQA 开发计划
  - RAG Roadmap
order: 31
---

# Hot Docs × Seed Aggregation：AI 接入开发计划（v1）

> 本计划以《[AI 接入方案（内网、强引用）](./ai-integration.md)》为唯一需求来源，目标是在**内网全员可访问**前提下，交付“可审计、可回跳、可治理”的文档 AI 能力。

## 0. 范围与原则（项目约束）

### 0.1 必须达成（硬性验收口径）

1. **强引用 DocQA**：任何答案必须带 citations；每条关键结论可回跳到 `routePath + anchor`；引用需可核对（展示证据片段 quote）。
2. **跨语言检索 + 对照阅读**：中文搜英文、英文搜中文可用；段落级翻译与术语一致（可先依赖翻译缓存）。
3. **可治理**：限流/缓存/观测/审计日志齐备；默认“不确定就说不确定”，不能胡编。

### 0.2 非目标（避免扩散）

- 不做互联网开放域问答；`web_search` 默认关闭（如需也必须显式开关/授权）。
- v1 不强依赖 embedding/向量库；先用 `search-index.json + chunks/manifest` 完成可用体验（v2 再升级）。

### 0.3 安全红线（必须遵守）

- `X-API-Key` 不允许出现在：仓库文档、前端源码、浏览器可见请求头里（推荐同域反代注入）。
- 审计日志不落地敏感原文；仅记录必要元信息（route/anchor、命中数、耗时、tokens 等）。

---

## 1. 交付物清单（端到端）

### 1.1 Hot Docs（静态站点侧）

- `dist/search-index.json`：字段完善（title/headings/summary/text/tags/categories/aliases…）
- `dist/__raw__/.../*.md`：原始 Markdown（含 frontmatter）可下载（已具备则保持）
- `dist/ai/manifest.json`：文档清单与 chunk 元信息（hash/anchor/标题…）
- `dist/ai/chunks*.json`：可召回的证据分块（按 H2/H3）
- 页面内 AI 交互 UI（可插件化注入）：
  - “问本文档 / 问全站 / 总结 / 生成 checklist / 翻译本段（对照）”
  - 引用渲染：可回跳、可展开 quote、复制引用链接

### 1.2 Seed Aggregation（网关/服务侧）

- DocQA API：
  - `POST /api/v1/docqa/ask`
  - `POST /api/v1/docqa/page`
- 文档数据源：
  - 读取 Hot Docs `dist/`（推荐同机挂载）或 HTTP 拉取（ETag/If-Modified-Since）
- 检索与证据：
  - 召回 + 重排 + 证据选择（去重/多样性/截断）
  - prompt 模板版本化 + 注入防护 + 输出 citations 结构化与校验
- 治理：
  - 缓存（translate/docqa）
  - 限流（按 key/ip/path）
  - 观测（耗时、tokens、缓存命中、错误码）
  - 审计日志（请求元数据 + 引用列表）

### 1.3 Nginx/同域聚合（推荐）

- `hot-docs` 静态站点与 `seed-aggregation` API 同域（例如 `/api/` 或 `/seed/`）
- 由 Nginx 注入 `X-API-Key`（前端不持有密钥）

---

## 2. 里程碑（Milestones）与验收标准

> 时间仅给“相对周期”，请在你们的排期里填充具体日期（建议按 1~2 周冲刺）。

### M0：准备与决策（0.5 天）

- 决策项（必须落表）：
  - API 前缀：`/api/` 还是 `/seed/`
  - Seed Aggregation 读取数据方式：同机挂载 / HTTP 拉取
  - 是否支持流式输出：v1 默认“非流式”（降低前端复杂度）
  - 文档 chunk 策略：按 H2/H3；是否剔除代码块（默认可配置）
- 验收：
  - 关键参数在配置里可见（不靠口头约定）
  - 安全方案确定（Nginx 注入 `X-API-Key`）

### M1：MVP（1～3 天，先跑通体验）

#### Hot Docs（MVP）

- 页面内最小 AI 面板（按钮 + 结果区）：
  - 翻译（调用 `/api/v1/translate`）
  - 问答（临时可复用 `/api/v1/chat` 拼 prompt）
- 引用最小闭环：
  - 允许先“引用页面链接 + 小节标题”，但必须可回跳

#### Seed Aggregation（MVP）

- 复用现有 `/api/v1/chat` 与 `/api/v1/translate`
- 约束输出格式（prompt 层）：
  - 必须包含引用列表（哪怕是文本形式）

验收（MVP）：

- 任意文档页：用户提问 → 返回“答案 + ≥1 条可回跳引用”
- 不可用降级：AI 服务不可达时，UI 提示且不影响本地搜索

### M2：v1（1～2 周：把强引用做成体系）

#### Hot Docs（v1）

- `plugin-ai-pack`：构建期输出 `dist/ai/manifest.json` 与 `dist/ai/chunks*.json`
  - 统一 heading id 与 anchor 生成（必须与页面一致）
  - chunk 稳定 id/hash（用于缓存与失效）
- `plugin-ai-ui`：在 docs/blog 页注入 AI UI（或核心注入全局脚本）
  - 支持 citations 渲染：`routePath + anchor + quote + score`
  - “问本文档（/docqa/page）”与“问全站（/docqa/ask）”
- 配置项落地：
  - `ai.enabled`、`ai.endpointBase`、`ai.features`、`ai.defaultScope`（collections/tags/categories）

#### Seed Aggregation（v1）

- 新增 DocQA API：
  - `/api/v1/docqa/ask`：支持 scope filters、TopK、mustCite
  - `/api/v1/docqa/page`：针对当前页面的 summary/faq/checklist/steps
- 证据链与校验：
  - 服务端生成 `citations[]`（结构化）
  - `mustCite=true` 时：无 citations 或 citations 无法定位 → 返回“证据不足”并附候选页面
- 治理：
  - 缓存：`translate:{src}:{tgt}:{hash}`、`docqa:{queryHash}:{evidenceHash}:{promptVersion}:{model}`
  - 限流：按 key/ip/path
  - 观测：请求耗时、tokens、缓存命中率、错误码
  - 审计：route/anchor 命中列表（不落 quote 原文）

验收（v1）：

- DocQA：
  - 返回结构满足：`answer + citations[] + meta`
  - citations 可点击回到原文锚点，且 quote 与原文可核对
- 跨语言：
  - “中文搜英文/英文搜中文”能召回正确页面（至少 Top10 可见）
  - 段落翻译有缓存，重复翻译明显加速
- 治理：
  - 有限流与缓存（可在日志/指标中看到命中）
  - 审计日志可按请求追溯引用与模型元信息

### M3：v2（后续：治理与语义检索增强）

- embedding/向量召回（可选）
- 文档健康度（缺 summary/tags/cats、过期预警、重复聚类）
- 自动生成 FAQ/Runbook 草稿并提交 PR（需要 SCM 集成与权限流程）

---

## 3. 任务拆分（Backlog）与依赖关系

### 3.1 Hot Docs 任务包（建议拆成 3 条主线）

#### A. AI 数据包（`plugin-ai-pack`）

- 产物：
  - `dist/ai/manifest.json`
  - `dist/ai/chunks*.json`（按大小分片，避免单文件过大）
- 输入依赖：
  - 文档 raw md：`dist/__raw__/.../*.md`
  - 页面 routePath 与 heading id 生成规则（必须稳定）
- 关键设计点：
  - chunk 粒度：H2/H3
  - chunk 字段：`id/hash/routePath/anchor/title/text/tags/categories/aliases`
  - 是否保留代码块：默认“可配置”，DocQA 默认剔除代码块以降低噪声

#### B. AI UI（`plugin-ai-ui`）

- 页面注入点：
  - 文档页顶部：问本文档/总结/翻译
  - 全站快捷入口：`Ctrl/⌘+K` 新增 Tab（搜索 + 提问）
- UI 验收要点：
  - 引用可回跳（click → 滚到锚点）
  - 引用可核对（quote 折叠/展开）
  - 失败降级（服务不可用/证据不足/限流）

#### C. 搜索/索引补强（为检索与 RAG 服务）

- `search-index.json` 字段补齐与规范化：
  - `categories[]/tags[]/aliases[]/headings[]/summary`
  - 中英混合：中文 2-gram、英文 token
-（可选）在 Hot Docs 侧实现“召回 + 证据片段截取”，作为 Seed Aggregation 的备用方案

### 3.2 Seed Aggregation 任务包（建议拆成 4 条主线）

#### A. 文档数据源与刷新

- 同机挂载：
  - 读取 `dist/search-index.json` 与 `dist/ai/*`
  - 文件变化触发 reload（或定时 reload）
- HTTP 拉取：
  - 支持 ETag/If-Modified-Since
  - 拉取失败不影响已加载的旧版本（双缓冲）

#### B. 检索、重排与证据选择

- 召回：
  - 使用 `chunks` 做主召回；`search-index` 做补充召回（标题/摘要）
- 证据选择：
  - 相邻 chunk 去重（同页 Top2）
  - 多样性（不同页面覆盖）
  - token/字数截断（证据预算）

#### C. 生成与引用校验

- prompt 模板版本化（`promptVersion`）
- 注入防护（system 约束 + 证据清洗）
- 输出结构化：
  - 服务端解析 citations（JSON 或可解析文本块）
  - 必须校验 citations 可定位（routePath/anchor 存在）

#### D. 治理：缓存/限流/观测/审计

- 缓存键：见上
- 限流：按 key/ip/path，必要时按接口分配额
- 观测：
  - 请求耗时 p50/p95
  - tokens（input/output/total）
  - 缓存命中率（translate/docqa）
- 审计：请求与引用列表（不落原文）

---

## 4. 风险清单与应对（建议提前写进 PRD/评审）

1. **锚点不稳定导致引用失效**
   - 应对：统一 heading id 生成规则；manifest 中记录 anchor；服务端校验引用可定位。
2. **Prompt 注入与胡编**
   - 应对：系统提示强约束 + mustCite 校验 + 证据不足降级。
3. **成本失控（内网也可能被刷）**
   - 应对：限流 + 缓存 + 观测；默认不开 web_search；预设配额。
4. **跨域/密钥泄露**
   - 应对：同域反代 + 服务端注入 `X-API-Key`；前端不保存密钥。
5. **数据同步与版本漂移**
   - 应对：manifest version/hash；Seed Aggregation 双缓冲 reload；回答 meta 返回 dataVersion。

---

## 5. 回滚策略（上线必须可回退）

- Hot Docs：
  - `ai.enabled=false` 一键关闭 UI
  - 保持本地搜索可用
- Seed Aggregation：
  - DocQA 失败降级：只返回候选页面列表（不生成答案）
  - 临时切回 `/api/v1/chat`（仅在已明确风险的情况下）

