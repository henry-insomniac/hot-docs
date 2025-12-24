---
name: implement
description: "基于架构和 TODO 实现新功能，遵循分层原则、类型安全、可测试（强制分支）"
category: development
priority: required
required_before: [branch, arch, todo]
required_after: [test, commit]
auto_trigger: false
hot_docs_specific: false
branch_required: true
tags: [development, coding, implementation, tdd]
---

# /implement - 功能实现助手

## 描述
基于架构和 TODO 实现新功能，确保代码遵循分层原则、类型安全、可测试。

## ⚠️ 重要原则

**禁止直接在 main/master 分支实现功能！**

所有功能实现必须：
1. ✅ 先使用 `/branch` 创建功能分支
2. ✅ 在新分支上进行开发
3. ✅ 完成后创建 PR 合并

**分支类型：**
- 新功能：`feature/<scope>/<description>`
- Bug修复：`fix/<scope>/<issue>-<description>`
- 重构：`refactor/<scope>/<description>`

## 适用场景
- 核心模块开发（ContentIndex 增量更新）
- 适配层开发（Build adapter）
- 运行时开发（路由切换动画）
- 工具函数实现（路径规范化）

## 工作流程
1. **【必需】** 使用 `/branch` 创建功能分支
2. 读取相关架构文档和 TODO 项
3. 分析模块职责与依赖边界
4. 设计接口与数据流
5. 编写实现代码（遵循分层原则）
6. 添加类型定义和必要注释
7. 运行 typecheck 验证

## 代码规范

### 1. 分层边界（必须遵守）
```typescript
// ✅ 正确：上层依赖下层
// Runtime → Core
import { ContentIndex } from '@hot-docs/core';

// ❌ 错误：下层依赖上层
// Core → Runtime（禁止）

// ✅ 正确：通过事件/接口解耦
// Core 发出事件，Runtime 监听
```

### 2. 插件访问控制
```typescript
// ✅ 正确：通过 PluginContext
export default function plugin() {
  return {
    async onFileChanged(ctx: PluginContext) {
      const content = await ctx.fs.read(file);
      ctx.logger.info('处理文件');
    }
  };
}

// ❌ 错误：直接访问文件系统
import fs from 'fs';
fs.readFileSync(file); // 插件不应直接访问
```

### 3. 类型安全
```typescript
// ✅ 正确：完整类型定义
interface ContentEntry {
  id: string;
  title: string;
  hash: string;
}

async function updateEntry(entry: ContentEntry): Promise<void> {
  // ...
}

// ❌ 错误：使用 any
async function updateEntry(entry: any) { // 避免 any
  // ...
}
```

### 4. 错误处理
```typescript
// ✅ 正确：边界检查与降级
async function updateIncremental(file: string) {
  try {
    const hash = await computeHash(file);
    await this.update(file, hash);
  } catch (error) {
    this.logger.warn('增量更新失败，降级到全量更新', error);
    await this.fullUpdate();
  }
}

// ❌ 错误：未捕获异常
async function updateIncremental(file: string) {
  const hash = await computeHash(file); // 可能抛异常
  await this.update(file, hash);
}
```

## 输入示例

### 示例 1：实现核心功能
```
/implement 实现 ContentIndex 的增量更新机制
```

### 示例 2：实现适配器
```
/implement 实现 Build adapter 的 HTML 预渲染功能
```

### 示例 3：实现工具函数
```
/implement 实现跨平台路径规范化工具
```

## 相关文件
- docs/architecture.md（分层边界）
- docs/todo.md（任务清单）
- packages/*/src/**/*.ts（实现代码）

## 配合使用的 Skills
- `/branch` - **【必需】** 实现前创建功能分支
- `/arch` - 实现前确认架构设计
- `/test` - 实现后编写测试
- `/review` - 实现后代码审查
- `/commit` - 实现完成后提交代码
- `/pr` - **【必需】** 创建 PR 合并到目标分支
