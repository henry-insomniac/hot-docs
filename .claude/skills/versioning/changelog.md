---
name: changelog
description: "生成和维护 CHANGELOG.md，遵循 Keep a Changelog 规范"
category: versioning
priority: required
required_before: [release]
required_after: []
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [versioning, changelog, release-notes, documentation]
---

# /changelog - 变更日志生成

## 描述
生成和维护 CHANGELOG.md，从提交历史自动提取变更。

## 生成逻辑
1. 分析自上个版本以来的所有提交
2. 按 type 分组（Features/Fixes/Performance/Breaking）
3. 提取关联的 Issue/PR 链接
4. 生成用户友好的变更说明

## 工作流程
1. 获取提交历史
2. 解析 Conventional Commits
3. 分类整理
4. 生成 CHANGELOG 条目
5. 更新 CHANGELOG.md

## 输入示例
```
/changelog 生成 v0.1.0 变更日志
/changelog --from=v0.0.1 --to=v0.1.0
/changelog --preview  # 预览但不写入
```

## 输出格式
```markdown
## [0.1.0] - 2025-01-15

### ✨ Features
- **core**: 实现 ContentIndex 增量更新 (#42)
- **dev-server**: 添加 overlay 错误面板 (#45)

### 🐛 Bug Fixes
- **cli**: 修复 Windows 路径问题 (#43)

### ⚡ Performance
- **core**: 单文件响应时间优化 90% (#42)

### 💥 Breaking Changes
- 配置文件从 docsDir 迁移到 collections (#44)
```
