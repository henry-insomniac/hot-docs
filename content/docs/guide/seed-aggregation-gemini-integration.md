---
title: Gemini 模型接入方案（Seed Aggregation）
---

# 背景
- 原有服务 `seed-aggregation` 只接入豆包（Doubao）模型，`/api/v1/chat`、`/api/v1/translate` 均依赖 DoubaoKey。
- 新需求是“在服务中调用 Gemini 接口”，且要在不破坏现有 API 的前提下，保留 DocQA 与 webhook 的联动。
- 约束条件：部分环境可能只提供 Gemini key，DocQA 仍需复用 ChatService 输出。

# 总体方案
1. **多 Provider 架构**：在 `ChatOptions` 中引入 `provider` 字段，可选 `doubao` 或 `gemini`，默认由服务器在缺省情况下选取（优先 Doubao，Doubao 不可用时回退 Gemini）。
2. **配置注册**：配置层新增 `gemini` 段；启动时根据 `api_key` 是否存在分别初始化 Doubao 和 Gemini 客户端。验证配置时要求至少提供一种 provider key。
3. **适配器扩展**：新增 Gemini client 与 `generateContent` 适配器，使用 `x-goog-api-key` header 发送请求，不将 key 写入 query，防止被链路记录。
4. **服务层路由**：`ChatService` 按 provider 调用不同 adapter，并在内部填充各自的默认模型/温度/TopP；同时限制联网搜索仅适用于 Doubao。
5. **文档与示例**：更新 OpenAPI 与集成指南，说明 `provider` 字段和环境变量 `GEMINI_API_KEY`，并提示调用示例。
6. **测试保障**：新增配置校验单测和 service 默认值单测，确保 provider 路由行为通过 `go test ./...`。

# 已完成的关键改动（可作为落地清单）
- `internal/config`：新增 `GeminiConfig`、默认值、校验逻辑，以及 `config.Validate()` 中的 provider-key 检查。`
- `internal/adapter/gemini`：实现与 Gemini `generateContent` 接口的请求/响应转换，实现 role 映射并记录 token 消耗。
- `internal/service/chat`：引入 `chooseProvider`、provider-specific 默认值、错误映射（含 `base.APIError` 处理），并根据配置初始化哪种 Adapter。
- `internal/router`：按照 Doubao/Gemini key 条件初始化 Clients，翻译接口只在 Doubao 可用时注册，DocQA 继续复用 ChatService。
- `docs/openapi.yaml`、`docs/CHAT_WEBSEARCH_INTEGRATION.md`、`README.md`：补充 `provider` 字段、示例、环境变量说明。

# 运行/使用建议
1. 将 Gemini Key 通过环境变量 `GEMINI_API_KEY` 注入（或写入 configs 配置），避免在仓库记录真实密钥。
2. 调用 `/api/v1/chat` 时：
   - 不传 `provider` → 默认优先 Doubao；如果 Doubao key 为空则自动使用 Gemini。
   - `options.provider="gemini"` → 强制走 Gemini；`enable_web_search` 只能与 Doubao 搭配。
3. DocQA 继续调用 ChatService，不需要额外改动；但若希望 DocQA 也调用 Gemini，可在运行环境中关闭 Doubao key 使服务回退。

# 后续扩展建议
- 增加 provider 层面的使用率监控（按 `provider/model` 统计 token、错误、429）。
- 若需要 Gemini stream 或联网 search，则可在 `adapter/gemini` 中接入 `streamGenerateContent` / tool ingestions，并将 `response.ChatResponse.Sources` 填充。
- 把 `seed-aggregation` 的 `configs/config.yaml` 中示例 key 替换为占位符，防止误提交。

