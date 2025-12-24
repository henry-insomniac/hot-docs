---
name: guide
description: "编写用户教程、快速开始、最佳实践等用户指南"
category: documentation
priority: recommended
required_before: []
required_after: [commit]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [documentation, guide, tutorial, user-facing]
---

# /guide - 用户指南助手

## 描述
编写用户教程、快速开始、最佳实践等面向用户的文档。

## 指南类型
- 快速开始（init → dev → build → preview）
- 功能教程（Blog 发布/主题切换/插件安装）
- 配置指南（collections 配置/子路径部署）
- 迁移指南（v1.0 → v2.0 升级步骤）

## 工作流程
1. 确定目标用户（新手/进阶/专家）
2. 设计教程结构（循序渐进）
3. 编写步骤说明（清晰/可操作）
4. 添加示例代码和截图
5. 验证教程可执行性

## 输入示例
```
/guide 编写 Blog 发布教程
/guide 编写快速开始指南
/guide 编写主题定制教程
```

## 相关文件
- docs/guide/（用户指南）
- README.md
