---
name: sync
description: "同步主分支最新代码，处理合并冲突"
category: versioning
priority: recommended
required_before: [pr]
required_after: []
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [versioning, git, sync, merge]
---

# /sync - 分支同步管理

## 描述
同步主分支最新代码，处理合并冲突。

## 同步策略
- Merge（保留完整历史）
- Rebase（线性历史，推荐）
- Rebase Interactive（整理提交）

## 工作流程
1. 检查当前分支状态
2. 暂存未提交更改（git stash）
3. 拉取远程主分支最新代码
4. 执行同步操作（merge/rebase）
5. 自动检测冲突
6. 提供冲突解决指导
7. 恢复暂存更改

## 输入示例
```
/sync                    # 默认使用 rebase
/sync --merge            # 使用 merge
/sync --interactive      # 交互式 rebase
/sync --resolve          # 冲突解决模式
```

## 冲突处理
- 识别冲突类型
- 分析双方改动
- 提供合并建议
- 验证合并结果
