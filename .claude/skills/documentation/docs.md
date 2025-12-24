---
name: docs
description: "编写 API 文档、架构文档、技术规范等技术文档"
category: documentation
priority: required
required_before: [implement]
required_after: [commit]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [documentation, api, technical, reference]
---

# /docs - 技术文档助手

## 描述
编写 API 文档、架构文档、技术规范等开发者文档。

## 文档类型
- Core API 文档（ContentIndex/PluginContext/PageData）
- 插件开发文档（manifest 规范/capabilities/hook 清单）
- 主题开发文档（token 规范/组件契约）
- 配置文档（hot-docs.config.ts 字段说明）

## 工作流程
1. 分析模块接口与类型定义
2. 编写 API 文档（参数/返回值/示例）
3. 补充使用示例
4. 添加注意事项
5. 更新相关文档索引

## 输入示例
```
/docs 为 ContentIndex API 编写文档
/docs 编写插件开发指南
/docs 更新配置文档
```

## 相关文件
- docs/api/（API 文档）
- docs/plugin-development.md
- docs/theme-development.md
