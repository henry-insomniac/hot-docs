---
name: pr
description: "创建和管理 Pull Request（所有代码合并到 main 的强制流程）"
category: versioning
priority: required
required_before: [commit, sync]
required_after: []
auto_trigger: false
hot_docs_specific: false
branch_required: true
tags: [versioning, git, pull-request, code-review]
---

# /pr - PR 创建与管理

## 描述
创建和管理 Pull Request，生成完整的 PR 描述。

## ⚠️ 重要原则

**所有代码合并到 main 必须通过 PR！**

这是强制性的最后一步：
1. ✅ 所有功能开发完成后创建 PR
2. ✅ 所有 Bug 修复完成后创建 PR
3. ✅ 所有重构完成后创建 PR

**禁止操作：**
- ❌ 直接 push 到 main 分支
- ❌ 不经过审查直接合并
- ❌ 跳过 CI 检查

## PR 类型
- Feature PR（新功能） - 来自 feature/* 分支
- Bugfix PR（修复） - 来自 fix/* 分支
- Hotfix PR（紧急修复） - 来自 hotfix/* 分支
- Refactor PR（重构） - 来自 refactor/* 分支
- Documentation PR（文档） - 来自 docs/* 分支

## 工作流程
1. **【必需】** 确认在功能分支（不是 main）
2. 检查所有测试通过
3. 同步主分支（/sync）
4. 分析提交历史和代码变更
5. 生成 PR 描述
6. 创建 PR（使用 gh cli）
7. 设置标签、审查者、里程碑

## 前置检查

创建 PR 前自动执行：
```bash
# 1. 检查当前分支
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ 错误：无法从 main 分支创建 PR！"
  echo "请先创建功能分支"
  exit 1
fi

# 2. 检查测试状态
pnpm test || {
  echo "⚠️  警告：测试未通过！"
  echo "建议先修复测试"
}

# 3. 检查是否有未推送的提交
if [ -n "$(git log origin/$current_branch..$current_branch 2>/dev/null)" ]; then
  echo "推送到远程..."
  git push origin $current_branch
fi
```

## 输入示例
```
/pr 为 ContentIndex 增量更新创建 PR
/pr --base=develop 创建到 develop 分支的 PR
/pr --draft 创建草稿 PR
```

## PR 描述模板
- 变更说明
- 关联 Issue
- 变更类型
- 实现方案
- 测试清单
- 性能影响
- 破坏性变更
- 检查清单
