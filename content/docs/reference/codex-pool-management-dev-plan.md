---
title: codex-pool-management：账号管理页面开发计划（v1）
summary: 单机部署，PostgreSQL 持久化；Node(Fastify) 提供账号 CRUD 与“到期/重置”派生信息；Web(React/Vite) 用卡片展示并提供红黄绿提示，后续可扩展邮件/IM 推送。
categories: ["项目", "开发计划", "全栈"]
tags:
  - codex-pool-management
  - postgres
  - prisma
  - fastify
  - vite
  - react
  - antd
  - time
  - reminder
aliases:
  - 账号管理页面开发计划
order: 99
---

# codex-pool-management：账号管理页面开发计划（v1）

> 状态快照：截至 **2026-01-22**（本地单机）

## 0. 目标与范围

### 0.1 目标（v1 必须达成）

1. 数据落库（PostgreSQL）。
2. 后端 Node：提供账号**新增 / 删除 / 列表**接口（先不做鉴权，默认只本机访问）。
3. 前端页面：卡片展示账号信息；支持新增/删除；提供红黄绿提示。
4. 账号字段（新增时必须填写/选择）：
   - 邮箱
   - 购买时间
   - 过期时间（提供快捷选项：+1 个月）
   - 周重置时间（用户选择“某个日期的几点”，后续按 7 天循环）
   - 日重置时间（当天的几点，按天循环）
5. 时间提醒（v1）：只在页面内提示；v2 可扩展邮件/IM 推送。

### 0.2 非目标（v1 暂不做）

- 登录鉴权（但必须默认仅绑定 `127.0.0.1`，避免暴露到公网）。
- 编辑/软删/停用（可作为 v1.1）
- 服务端定时任务提醒（v2）

---

## 1. 时间语义（关键约定）

> 时区统一默认：`Asia/Shanghai`（后端与前端展示都按此时区解释）。

### 1.1 周重置时间（weekly reset）

- 存储为 **锚点时间**：`weeklyResetAnchorAt`（timestamp）。
- 语义：从锚点开始，每 **7 天**发生一次重置。
- 展示/提醒需要计算：`nextWeeklyResetAt`、`nextWeeklyResetInMs`。

### 1.2 日重置时间（daily reset）

- 存储为日内时间：`dailyResetTime`（`HH:mm`）。
- 语义：每天固定时刻发生重置。
- 展示/提醒需要计算：`nextDailyResetAt`、`nextDailyResetInMs`。

### 1.3 到期提示（red/yellow/green）

建议口径（页面卡片主色以到期为主）：

- 红：已过期 或 距过期 ≤ 24 小时
- 黄：距过期 ≤ 7 天
- 绿：其他

---

## 2. 当前已完成的修改（已落地的代码/配置）

> 仓库路径：`/Users/Zhuanz/work-space/codex-pool-management`

### 2.1 工程与脚手架

- 新增 monorepo 结构：
  - `apps/api`：Fastify + Prisma + TypeScript
  - `apps/web`：Vite React TS
- 根目录新增/修改：
  - `package.json`：启用 workspaces；新增 `dev/build/db:*` 脚本（并行启动）
  - `.gitignore`
  - `docker-compose.yml`：PostgreSQL 16（`codex_pool`）
  - `README.md`：启动说明

### 2.2 后端（apps/api）

- `apps/api/prisma/schema.prisma`：`Account` 模型（含 `purchaseAt/expireAt/weeklyResetAnchorAt/dailyResetTime/timezone/note`）与 `expireAt` 索引
- `apps/api/src/server.ts`：Fastify 服务（CORS 允许 `http://localhost:5173`，默认监听 `127.0.0.1:3001`）
- `apps/api/src/routes/accounts.ts`：
  - `GET /api/accounts`：列表（按过期时间升序）
  - `POST /api/accounts`：新增（支持 `expirePreset=1m` 或显式 `expireAt`）
  - `DELETE /api/accounts/:id`：删除
  - 同时返回派生字段：下一次日/周重置时间、倒计时、到期严重度
- `apps/api/src/time.ts`：时间计算（Luxon）与严重度规则
- `apps/api/.env.example` / `apps/api/.env`：数据库连接与端口

### 2.3 已执行的环境操作（但仍需固化/完善）

- 已执行 `docker compose up -d`，PostgreSQL 容器已创建并启动。
- 依赖安装遇到 Prisma engines 下载中断（`ECONNRESET`），通过临时设置镜像解决：
  - `PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma npm install`
  - 需要在后续计划中**固化**（例如写入 README 或环境变量配置），避免重复踩坑。

---

## 3. 当前未完成/阻塞点（需要继续执行）

### 3.1 Prisma 迁移（当前阻塞）

- `npm run db:migrate` 会进入交互式 prompt（要求输入 migration 名称），导致自动执行超时。
- 需要改为非交互执行方式，例如：
  - `prisma migrate dev --name init`
  - 或把迁移流程拆成 “生成/应用” 两步（按你的偏好选择）

### 3.2 Web 页面未实现（仅 Vite 默认模板）

- `apps/web/src/App.tsx` 仍为脚手架默认页面，未实现：
  - 卡片列表渲染（GET /api/accounts）
  - 新增账号表单（POST /api/accounts）
  - 删除确认（DELETE /api/accounts/:id）
  - 红黄绿提示与倒计时展示

---

## 4. 执行计划（Milestones + 任务拆分）

### M0：把工程跑通（0.5 天）

- 固化 Prisma engines 下载策略：
  - README 写明 `PRISMA_ENGINES_MIRROR`（或在本机环境里持久化）
- 非交互迁移：
  - 生成并应用 `init` migration
  - 验证 `Account` 表已创建
- 验收：
  - `GET http://127.0.0.1:3001/api/health` 返回 `{ ok: true }`
  - 数据库中存在 `Account` 表

### M1：API 完整性与可用性（0.5～1 天）

- 保持已有接口不破坏的前提下，补齐：
  - 更明确的错误返回（邮箱重复、时间逻辑错误）
  - 列表接口可选分页/过滤（可延后）
- 验收：
  - Postman/curl 可完成：新增 → 列表看到 → 删除 → 列表消失

### M2：账号管理页面（1 天）

- UI 技术建议：`Ant Design`（表单/时间选择器成熟，上手快）
- 页面结构建议：
  - 顶部：新增按钮 + 搜索（邮箱）
  - 主体：卡片网格
  - 新增弹窗：邮箱、购买时间、过期时间（+1 月快捷）、周重置锚点（日期时间选择器）、日重置时间（时间选择器）
- 颜色规则：
  - 以到期严重度作为卡片主色；重置仅做辅助信息/小徽标
- 验收：
  - 页面可完成增删查；卡片展示 “还剩/已过期” 与下一次日/周重置倒计时

### M3：邮件/IM 推送（v2，0.5～2 天，按渠道复杂度）

- 引入 `notification_log` 表实现去重
- 定时任务（1～5 分钟轮询）触发阈值：
  - 到期：提前 7 天、提前 24 小时、到期
  - （可选）日重置：提前 15 分钟；周重置：提前 1 小时
- 渠道：
  - 优先 IM webhook（飞书/企业微信/Telegram 任选一个）
  - 再补 email
- 验收：
  - 同一个账号同一个阈值不重复刷屏；重启服务后仍保持幂等

---

## 5. 验收标准（v1）

1. 数据可靠：PostgreSQL 持久化；重启服务后数据不丢。
2. 基础功能：新增/删除/列表可用；字段校验正确。
3. 时间提示：卡片红黄绿提示符合规则；显示下一次日/周重置时间与倒计时。
4. 安全边界：API 默认仅监听 `127.0.0.1`，不暴露公网。

---

## 6. 运行手册（命令约定）

> 以仓库根目录执行。

- 启动数据库：`npm run db:up`
- 安装依赖：`npm install`（如 Prisma engines 下载不稳，临时加：`PRISMA_ENGINES_MIRROR=...`）
- 迁移数据库：`npm run db:migrate`（需改为非交互后再用）
- 启动前后端：`npm run dev`

