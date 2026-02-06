---
title: 云数据库接入系统（HTTP 网关）技术设计（v1）
summary: 面向单机 + 单云 MySQL 的数据库接入网关技术落地文档：模块拆分、数据模型、鉴权/限流、连接池、DDL 守护、错误码、配置、部署、观测与测试。
categories: ["数据库", "架构", "后端"]
tags:
  - cloud-db
  - mysql
  - gateway
  - technical-design
  - api
  - security
  - observability
order: 41
---

# 云数据库接入系统（HTTP 网关）技术设计（v1）

> 本文是对《[云数据库接入系统（HTTP 网关）MVP 需求](./cloud-db-access-gateway-requirements.md)》的技术落地补充。

## 1. 设计目标与约束

### 1.1 目标

- **统一入口**：应用通过 HTTP API 使用数据库能力（读、写、DDL）。
- **可治理**：应用级别鉴权、禁用/轮换、限流、超时、结果集/影响行数限制。
- **可观测**：可按 `app_id` 追踪请求、延迟、错误与变更（尤其 DDL）。
- **低额外延迟**：同机部署场景下，网关附加开销目标 P95 ≤ 5–10ms（压测校准）。

### 1.2 关键约束

- **单机 + 单云 MySQL**：先做到“稳、可控、可审计”，不做多实例路由。
- **中等流量**：10–200 QPS、50–500 并发（按你当前假设）。
- **安全底线**：不落明文 key/token；默认不记录明文 SQL；DDL 需要更严格护栏。

## 2. 总体架构

### 2.1 组件与边界

- **Gateway**：HTTP 服务（对外暴露 `/admin/*` 与 `/v1/*`）。
- **State Store（网关元数据存储）**：存储 App、Key hash、状态、审计索引（MVP 可用 SQLite/本地文件）。
- **MySQL**：云数据库。

### 2.2 请求处理管线

```mermaid
flowchart TD
  clientApp[AppClient] -->|HTTPRequest| httpServer[HTTPServer]
  httpServer --> reqId[RequestIdMiddleware]
  reqId --> auth[AuthMiddleware(ApiKey)]
  auth --> appCtx[LoadAppContext]
  appCtx --> rateLimit[RateLimit(GlobalAndPerApp)]
  rateLimit --> validate[ValidateAndGuardrails]
  validate --> dbExec[DBExecutor(Pool)]
  dbExec --> audit[AuditLogger]
  audit --> response[HTTPResponse]

  httpServer --> adminAuth[AdminAuthMiddleware]
  adminAuth --> adminHandlers[AdminHandlers]
```

> 说明：`ValidateAndGuardrails` 需要根据 endpoint（query/exec/ddl）应用不同策略。

## 3. 存储设计（App/Key/审计）

### 3.1 数据模型（逻辑）

#### App

- `app_id`：UUID 或短 ID
- `name`：string
- `status`：`active | disabled`
- `api_key_hash`：string
- `key_version`：int（轮换递增，便于审计）
- `created_at / updated_at`

#### AuditLog（建议最小落库字段）

- `id`：自增或 UUID
- `request_id`
- `app_id`
- `endpoint`：`/v1/query|/v1/exec|/v1/ddl`
- `operation`：`query|dml|ddl`
- `sql_hash`
- `duration_ms`
- `row_count` / `affected_rows`
- `success`：bool
- `error_code`：string
- `error_message`：string（脱敏）
- `client_ip` / `user_agent`（可选）
- `ddl_change_reason` / `ddl_ticket`（DDL 专用）
- `created_at`

> 存储实现：
> - **MVP 推荐 SQLite**：方便查询与聚合；单机足够。
> - 更简 MVP 也可“只写 JSONL 文件”，但后续查询不友好。

### 3.2 API Key 生成与存储

- **生成**：使用强随机（至少 32 字节）编码为 base64url。
- **存储**：只存 hash，不存明文。
  - 推荐：`argon2id` 或 `bcrypt`；若实现复杂度高，可用 `HMAC-SHA256(server_secret, api_key)` 作为可验证 hash。
- **传输**：仅在创建/轮换时返回一次性明文 key；之后不可再取回。

## 4. 接口设计（更细）

### 4.1 统一约定

- Header：
  - `Authorization: Bearer <api_key>`（数据接口）
  - `Authorization: Bearer <admin_token>`（管理接口）
  - `X-Request-Id`（可选，若无则系统生成并回传）
- 响应统一包含：`request_id`。

### 4.2 请求/响应 JSON 示例

#### `/v1/query`

请求：

```json
{
  "sql": "SELECT id, name FROM users WHERE id = ? LIMIT 100",
  "params": [123],
  "timeout_ms": 3000
}
```

响应：

```json
{
  "request_id": "01J...",
  "columns": ["id", "name"],
  "rows": [[123, "alice"]],
  "row_count": 1
}
```

#### `/v1/exec`（DML）

请求：

```json
{
  "sql": "UPDATE users SET name = ? WHERE id = ?",
  "params": ["alice", 123],
  "timeout_ms": 3000
}
```

响应：

```json
{
  "request_id": "01J...",
  "affected_rows": 1,
  "last_insert_id": 0
}
```

#### `/v1/ddl`

请求：

```json
{
  "sql": "ALTER TABLE users ADD COLUMN age INT NULL",
  "params": [],
  "timeout_ms": 5000,
  "ddl_ack": true,
  "change_reason": "为用户画像增加年龄字段",
  "ticket": "CHG-20260203-001"
}
```

响应：

```json
{
  "request_id": "01J...",
  "ddl_result": "ok"
}
```

## 5. 鉴权与访问控制

### 5.1 App 鉴权

- 每次请求：解析 Bearer token → 查找对应 App → 校验 `status=active`。
- 支持 Key 轮换：可通过 `key_version` 使旧 key hash 立即失效。

### 5.2 Admin 鉴权

- `ADMIN_TOKEN` 静态 token（MVP）。
- 仅允许访问 `/admin/*`。

### 5.3 最小权限建议（可选）

- 可在 App 上增加 `capabilities`：`read|write|ddl`。
- MVP 可默认全部开启；当接入更多应用时再启用差异化权限。

## 6. 校验与护栏（核心）

### 6.1 参数化与 SQL 形态校验

- 必须采用 `sql + params`。
- 禁止多语句执行（例如 `;` 拼接），除非明确允许且做强审计。
- 对 endpoint 做语句类型校验：
  - `/v1/query` 仅允许 `SELECT`（以及必要时 `SHOW`/`EXPLAIN` 可配置）。
  - `/v1/exec` 允许 `INSERT/UPDATE/DELETE`。
  - `/v1/ddl` 允许 `CREATE/ALTER/DROP` 等。

> 实现上不做完整 SQL parser 的情况下，可用“首 token + 规范化”做 **best-effort** 校验（并在审计中记录）。后续如果误判成本高，再引入 parser。

### 6.2 DDL 守护策略

DDL 比 DML 风险更高，必须加额外约束：

- **显式确认**：`ddl_ack=true` 必填。
- **变更原因必填**：`change_reason` 必填，建议最小长度限制。
- **危险语句默认阻断**（可配置 override）：
  - `DROP DATABASE` 默认拒绝
  - `TRUNCATE TABLE` 默认拒绝
  - `ALTER USER`/`GRANT`/`REVOKE` 默认拒绝（避免权限被改乱）
- **强限流**：DDL 单独 `RATE_LIMIT_DDL_QPS`，并发建议固定为 1。
- **强审计**：记录 `ticket/change_reason/sql_hash/耗时/结果`。

### 6.3 超时、取消与资源隔离

- HTTP 超时与 DB 执行超时要一致：以 `timeout_ms` 取 `min(request_timeout, MAX_TIMEOUT_MS)`。
- 若 DB driver 支持 context cancel，应在超时后中断执行。

### 6.4 结果与影响范围限制

- `/v1/query`：
  - 最大返回行数 `MAX_ROWS`
  - 最大响应体 `MAX_RESPONSE_BYTES`
- `/v1/exec`：
  - 最大影响行数 `MAX_AFFECTED_ROWS`（超过则拒绝或 require `write_ack`，二选一，MVP 可直接拒绝）

## 7. 数据库访问层设计

### 7.1 连接池

- 由网关统一维护连接池：
  - `DB_MAX_CONNS`、`DB_MAX_IDLE_CONNS`、`CONN_MAX_LIFETIME`。
- 建议使用“预热 + 健康探测”：`/readyz` 可执行轻量 `SELECT 1`。

### 7.2 事务策略（MVP）

- 默认每次请求一个 statement，不显式开启长事务。
- 如后续需要多语句事务，应引入：
  - 显式事务 API（begin/commit/rollback）与事务 token（强审计）
  - 或限制在服务端预定义操作，避免通用事务接口带来治理风险。

## 8. 限流与并发控制

### 8.1 限流维度

- **全局**：保护网关与 DB。
- **按 App**：避免单个应用拖垮系统。
- **按 Endpoint**：DDL 更严格。

### 8.2 建议实现

- 单机场景：内存令牌桶（Token Bucket）即可。
- 关键：限流命中应返回明确错误码（429）并记录指标。

## 9. 错误码与返回规范

- 401：未鉴权 / key 无效
- 403：应用被禁用 / 权限不足
- 408/504：执行超时（按你实现的语义选择）
- 409：并发冲突（可选）
- 413：响应过大（超过 `MAX_RESPONSE_BYTES`）
- 422：请求不可执行（例如 DDL 缺少 `ddl_ack/change_reason`，或语句类型不匹配 endpoint）
- 429：限流
- 500：网关内部错误
- 502：上游 DB 不可用

建议统一错误体：

```json
{
  "request_id": "01J...",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

## 10. 观测与审计

### 10.1 指标（建议最小集）

- `http_requests_total{endpoint,app_id,code}`
- `http_request_duration_ms_bucket{endpoint,app_id}`
- `rate_limited_total{endpoint,app_id}`
- `db_pool_in_use`、`db_pool_wait_count`（如可获取）
- `ddl_requests_total{app_id,success}`

### 10.2 日志与脱敏

- 默认记录 `sql_hash` 而非 `sql`。
- DDL 额外记录 `ticket/change_reason`（这些本身应避免含敏感数据）。

## 11. 部署与配置

### 11.1 部署形态

- 同机部署：建议一个 systemd 服务或容器（docker compose）
- 关键：日志收集与滚动（stdout + logrotate/采集器）。

### 11.2 配置清单（建议）

- 基础：`LISTEN_ADDR`、`LOG_LEVEL`、`ADMIN_TOKEN`
- DB：`DB_DSN`、`DB_MAX_CONNS`、`DB_MAX_IDLE_CONNS`、`CONN_MAX_LIFETIME`
- 超时：`DEFAULT_TIMEOUT_MS`、`MAX_TIMEOUT_MS`
- 限流：`RATE_LIMIT_GLOBAL_QPS`、`RATE_LIMIT_PER_APP_QPS`、`RATE_LIMIT_DDL_QPS`
- 保护：`MAX_ROWS`、`MAX_RESPONSE_BYTES`、`MAX_AFFECTED_ROWS`
- DDL：`DDL_DENYLIST`（默认高危）、`DDL_REQUIRE_TICKET`（可选开关）

## 12. 测试与压测方案

### 12.1 单元测试

- API Key 校验、禁用逻辑、轮换逻辑
- 限流令牌桶
- DDL 守护：缺字段拒绝、denylist 拒绝
- SQL 类型校验（query/exec/ddl）

### 12.2 集成测试

- 连接真实 MySQL：
  - query/exec/ddl 全链路
  - 超时取消
  - 结果限制与影响行数限制

### 12.3 压测与容量验证

- 基准：同机访问，逐步提升到目标 QPS（如 200 QPS）
- 观测：
  - P95 延迟、错误率、DB 连接池等待
  - 限流是否按预期触发
- 输出：给出推荐 `DB_MAX_CONNS`、限流配置初值。

## 13. 演进路线（技术）

- v1.1：增加 `capabilities`（read/write/ddl）与按 App 权限控制
- v1.2：审计查询接口与可视化报表
- v2：多数据库实例路由、细粒度 RBAC、SQL parser/静态分析（若必要）

