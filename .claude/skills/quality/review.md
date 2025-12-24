---
name: review
description: "执行代码审查，确保代码质量、架构合规性、安全性和可维护性"
category: quality
priority: required
required_before: [implement]
required_after: [commit]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [quality, review, code-quality, architecture]
---

# /review - 代码审查助手

## 描述
执行代码审查，确保代码质量、架构合规性、安全性和可维护性。

## 审查维度

### 1. 架构合规性
- 是否遵循五层边界
- 是否存在跨层依赖
- 是否违反插件契约

### 2. 代码质量
- 类型安全（避免 any）
- 错误处理完善
- 命名清晰
- 函数复杂度合理

### 3. 性能影响
- 是否引入全量操作
- 是否有内存泄漏风险
- 是否有阻塞操作

### 4. 安全性
- 文件系统访问安全
- 用户输入验证
- 依赖安全性

### 5. 测试覆盖
- 单元测试覆盖关键逻辑
- 边界情况测试
- 集成测试

### 6. 文档完整性
- API 文档
- 代码注释（复杂逻辑）
- CHANGELOG更新

## 工作流程
1. 分析代码变更（git diff）
2. 检查架构合规性
3. 检查代码质量
4. 检查测试覆盖
5. 生成审查报告
6. 提供改进建议

## 输入示例
```
/review 审查 packages/core/src/content/scan.ts 的修改
/review 自我审查当前分支的所有变更
```

## 审查清单

### ✅ 必须通过项
- [ ] 遵循分层架构原则
- [ ] 无跨层依赖
- [ ] TypeScript 类型检查通过
- [ ] 关键路径有错误处理
- [ ] 无明显安全漏洞

### ⚠️ 建议改进项
- [ ] 测试覆盖 > 80%
- [ ] 复杂函数有注释
- [ ] 无重复代码
- [ ] 性能影响可接受

## 相关文件
- packages/*/src/**/*.ts

## 配合使用的 Skills
- `/implement` - 实现后审查
- `/test` - 补充测试覆盖
- `/refactor` - 发现问题后重构
