---
name: branch
description: "智能创建和管理 Git 分支，遵循分支命名规范（所有开发工作的第一步）"
category: versioning
priority: required
required_before: []
required_after: [implement, debug, refactor]
auto_trigger: false
hot_docs_specific: false
branch_required: false
tags: [versioning, git, branch, workflow]
---

# /branch - 分支创建与管理

## 描述
智能创建和管理 Git 分支，遵循分支命名规范。

## ⚠️ 重要原则

**这是所有开发工作的第一步（强制性）！**

所有代码修改（新功能/Bug修复/重构）都必须：
1. ✅ **先创建新分支**
2. ✅ 在新分支上工作
3. ✅ 通过 PR 合并到目标分支

**禁止操作：**
- ❌ 直接在 main/master 分支提交代码
- ❌ 不经过 PR 直接推送到 main

## 分支命名规范
```
feature/<scope>/<brief-description>    # 新功能
fix/<scope>/<issue-number>-<description>  # Bug修复
hotfix/<version>-<description>         # 紧急修复
refactor/<scope>/<description>         # 重构
docs/<description>                     # 文档更新
chore/<description>                    # 工程配置
```

## 工作流程
1. 分析需求，确定分支类型和作用域
2. 检查当前分支状态（必须在 main 分支）
3. 同步最新主分支（git pull origin main）
4. 创建符合规范的分支名
5. 切换到新分支
6. 推送到远程（git push -u origin <branch-name>）

## 前置检查

在创建新分支前，自动执行：
```bash
# 1. 检查当前分支
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
  echo "⚠️  警告：当前不在 main 分支！"
  echo "建议先切换到 main: git checkout main"
fi

# 2. 检查未提交的修改
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  警告：存在未提交的修改！"
  echo "建议先暂存: git stash"
fi

# 3. 同步最新代码
git pull origin main
```

## 输入示例
```
/branch 创建增量索引功能分支
/branch 基于 Issue #42 创建分支
/branch list  # 列出所有分支
/branch clean # 清理已合并分支
```

## 相关命令
```bash
git checkout -b feature/core/incremental-index
git push -u origin feature/core/incremental-index
```
