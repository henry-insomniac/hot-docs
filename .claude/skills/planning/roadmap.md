---
name: roadmap
description: "规划产品路线图，管理里程碑，协调多个功能模块的开发优先级"
category: planning
priority: recommended
required_before: [prd]
required_after: [milestone, todo]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [planning, roadmap, milestone, prioritization]
---

# /roadmap - 路线图规划

## 描述
规划产品路线图，管理里程碑，协调多个功能模块的开发优先级。

## 适用场景
- 版本规划（v2.1/v2.2 范围界定）
- 里程碑评审（M0→M1 进度检查）
- 开源发布准备（LICENSE/CONTRIBUTING）
- 优先级调整（基于用户反馈）

## 工作流程
1. 分析 docs/todo.md 与 docs/requirements.md
2. 梳理已完成/进行中/待开始任务
3. 按优先级和依赖关系排序
4. 划分里程碑与时间窗口建议
5. 输出可执行的阶段性目标

## 输入示例
```
/roadmap 规划 v0.2.0 版本范围
/roadmap 评审 M1 进度并规划 M2
/roadmap 准备 v1.0.0 开源发布清单
```

## 输出格式
- M0（Dev 可用）：已完成 ✅ / 待完善 ⚠️
- M1（Build 产物）：任务清单 + 优先级
- M2-M5：设计验收点 + 依赖关系

## 相关文件
- docs/todo.md
- docs/requirements.md
- CHANGELOG.md
